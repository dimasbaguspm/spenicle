package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const connectionColumns = `id, ref, provider, account, external_sub, scopes, refresh_token,
	access_token, access_expires_at, status, last_refreshed_at, revoked_at, created_at,
	updated_at`

func (s *Store) ConnectionByProvider(
	ctx context.Context,
	provider string,
) (entity.Connection, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ConnectionByProvider")
	defer endSpan()

	connection, err := scanConnection(s.db.QueryRowContext(ctx,
		`SELECT `+connectionColumns+` FROM connections WHERE provider = ?`, provider))
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Connection{}, false, nil
	}

	if err != nil {
		return entity.Connection{}, false, err
	}

	return connection, true, nil
}

func (s *Store) SaveConnection(
	ctx context.Context,
	connection entity.Connection,
) (entity.Connection, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SaveConnection")
	defer endSpan()

	scopes, err := json.Marshal(connection.Scopes)
	if err != nil {
		return entity.Connection{}, fmt.Errorf("encode scopes: %w", err)
	}

	ref := connection.Ref
	if ref == "" {
		ref = uuid.New()
	}

	// One row per provider: re-authorising replaces the grant in place, so the ref a
	// client already holds keeps pointing at the same connection.
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO connections (ref, provider, account, external_sub, scopes, refresh_token,
			access_token, access_expires_at, status, last_refreshed_at, revoked_at, created_at,
			updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
		ON CONFLICT (provider) DO UPDATE SET
			account           = excluded.account,
			external_sub      = excluded.external_sub,
			scopes            = excluded.scopes,
			refresh_token     = excluded.refresh_token,
			access_token      = excluded.access_token,
			access_expires_at = excluded.access_expires_at,
			status            = excluded.status,
			last_refreshed_at = excluded.last_refreshed_at,
			revoked_at        = NULL,
			updated_at        = excluded.updated_at`,
		ref,
		connection.Provider,
		connection.Account,
		nullString(connection.ExternalSub),
		string(scopes),
		connection.RefreshToken,
		nullString(connection.AccessToken),
		nullTimestamp(connection.AccessExpiresAt),
		connection.Status,
		nullTimestamp(connection.LastRefreshedAt),
		connection.CreatedAt.Format(constant.TimestampLayout),
		connection.UpdatedAt.Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.Connection{}, fmt.Errorf("save connection: %w", err)
	}

	saved, found, err := s.ConnectionByProvider(ctx, connection.Provider)
	if err != nil {
		return entity.Connection{}, err
	}

	if !found {
		return entity.Connection{}, fmt.Errorf("%w: connection %s", entity.ErrNotFound, ref)
	}

	return saved, nil
}

func (s *Store) RevokeConnection(
	ctx context.Context,
	ref string,
	at time.Time,
) (entity.Connection, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RevokeConnection")
	defer endSpan()

	res, err := s.db.ExecContext(ctx, `
		UPDATE connections SET revoked_at = ?, updated_at = ?
		WHERE ref = ? AND revoked_at IS NULL`,
		at.Format(constant.TimestampLayout),
		at.Format(constant.TimestampLayout),
		ref,
	)
	if err != nil {
		return entity.Connection{}, false, fmt.Errorf("revoke connection: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return entity.Connection{}, false, fmt.Errorf("revoked rows: %w", err)
	}

	if affected == 0 {
		existing, found, findErr := s.connectionByRef(ctx, ref)
		if findErr != nil {
			return entity.Connection{}, false, findErr
		}

		return existing, found, nil
	}

	revoked, found, err := s.connectionByRef(ctx, ref)
	if err != nil {
		return entity.Connection{}, false, err
	}

	return revoked, found, nil
}

func (s *Store) connectionByRef(ctx context.Context, ref string) (entity.Connection, bool, error) {
	connection, err := scanConnection(s.db.QueryRowContext(ctx,
		`SELECT `+connectionColumns+` FROM connections WHERE ref = ?`, ref))
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Connection{}, false, nil
	}

	if err != nil {
		return entity.Connection{}, false, err
	}

	return connection, true, nil
}

func scanConnection(row interface{ Scan(dest ...any) error }) (entity.Connection, error) {
	var (
		connection  entity.Connection
		externalSub sql.NullString
		scopes      string
		access      sql.NullString
		expires     sql.NullString
		refreshed   sql.NullString
		revoked     sql.NullString
		createdAt   string
		updatedAt   string
	)

	if err := row.Scan(&connection.ID, &connection.Ref, &connection.Provider, &connection.Account,
		&externalSub, &scopes, &connection.RefreshToken, &access, &expires, &connection.Status,
		&refreshed, &revoked, &createdAt, &updatedAt); err != nil {
		return entity.Connection{}, err
	}

	connection.ExternalSub = externalSub.String
	connection.AccessToken = access.String

	if scopes != "" {
		if err := json.Unmarshal([]byte(scopes), &connection.Scopes); err != nil {
			return entity.Connection{}, fmt.Errorf("decode scopes: %w", err)
		}
	}

	var err error

	if connection.AccessExpiresAt, err = nullableTimestamp("access_expires_at", expires.String); err != nil {
		return entity.Connection{}, err
	}

	lastRefreshed, refreshedErr := nullableTimestamp("last_refreshed_at", refreshed.String)
	if refreshedErr != nil {
		return entity.Connection{}, refreshedErr
	}

	connection.LastRefreshedAt = lastRefreshed

	if revoked.String != "" {
		at, parseErr := parseTimestamp("revoked_at", revoked.String)
		if parseErr != nil {
			return entity.Connection{}, parseErr
		}

		connection.RevokedAt = &at
	}

	if connection.CreatedAt, err = parseTimestamp("created_at", createdAt); err != nil {
		return entity.Connection{}, err
	}

	if connection.UpdatedAt, err = parseTimestamp("updated_at", updatedAt); err != nil {
		return entity.Connection{}, err
	}

	return connection, nil
}

func nullTimestamp(at time.Time) any {
	if at.IsZero() {
		return nil
	}

	return at.Format(constant.TimestampLayout)
}

func nullableTimestamp(field, raw string) (time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return time.Time{}, nil
	}

	return parseTimestamp(field, raw)
}
