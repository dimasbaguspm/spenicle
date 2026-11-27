package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

//nolint:gosec // G101: a column list, not a credential
const tokenColumns = `id, ref, name, token_preview, token_hash, scopes, created_at,
	last_used_at, revoked_at, expires_at`

func (s *Store) InsertToken(ctx context.Context, token entity.Token) (entity.Token, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertToken")
	defer endSpan()

	if token.Ref == "" {
		token.Ref = uuid.New()
	}

	if token.CreatedAt.IsZero() {
		token.CreatedAt = time.Now().UTC()
	}

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO api_tokens (ref, name, token_preview, token_hash, scopes, created_at,
				last_used_at, revoked_at, expires_at)
			VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
			token.Ref,
			token.Name,
			token.Preview,
			token.Digest,
			token.ScopeList(),
			token.CreatedAt.Format(constant.TimestampLayout),
			nullTime(token.ExpiresAt),
		)
		if execErr != nil {
			return fmt.Errorf("insert token: %w", execErr)
		}

		id, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("token id: %w", idErr)
		}

		token.ID = id

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityToken,
			ID:     token.ID,
			Ref:    token.Ref,
			Action: constant.AuditActionCreate,
			To:     entity.TokenChanged{Name: token.Name, Scopes: token.Scopes},
		})
	})
	if err != nil {
		return entity.Token{}, err
	}

	return token, nil
}

func (s *Store) TokenByDigest(ctx context.Context, digest string) (entity.Token, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.TokenByDigest")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+tokenColumns+` FROM api_tokens WHERE token_hash = ?`, digest)

	token, err := scanTokenRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Token{}, false, nil
	}

	if err != nil {
		return entity.Token{}, false, fmt.Errorf("token by digest: %w", err)
	}

	return token, true, nil
}

func (s *Store) ListTokens(ctx context.Context, filter entity.TokenFilter) ([]entity.Token, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListTokens")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("api_tokens", tokenColumns)

	switch filter.Status {
	case constant.TokenStatusActive:
		builder.null("revoked_at", false)
	case constant.TokenStatusRevoked:
		builder.null("revoked_at", true)
	}

	switch filter.Used {
	case constant.TokenUsed:
		builder.null("last_used_at", true)
	case constant.TokenUnused:
		builder.null("last_used_at", false)
	}

	builder.before("api_tokens.id", "api_tokens", filter.Cursor)
	builder.orderBy("api_tokens.id DESC")

	query, args := builder.page(limit)

	return scanRows(ctx, s.db, "tokens", query, args, scanTokenRow)
}

func (s *Store) RevokeToken(ctx context.Context, ref string, at time.Time) (entity.Token, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RevokeToken")
	defer endSpan()

	var revoked bool

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			UPDATE api_tokens SET revoked_at = ?
			WHERE ref = ? AND revoked_at IS NULL`,
			at.Format(constant.TimestampLayout), ref)
		if execErr != nil {
			return fmt.Errorf("revoke token %q: %w", ref, execErr)
		}

		affected, rowsErr := res.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("token rows: %w", rowsErr)
		}

		revoked = affected == 1

		if !revoked {
			return nil
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityToken,
			Ref:    ref,
			Action: constant.AuditActionRevoke,
			To:     entity.TokenChanged{RevokedAt: at.Format(constant.TimestampLayout)},
		})
	})
	if err != nil {
		return entity.Token{}, false, err
	}

	if !revoked {
		return entity.Token{}, false, nil
	}

	row := s.db.QueryRowContext(ctx, `SELECT `+tokenColumns+` FROM api_tokens WHERE ref = ?`, ref)

	token, scanErr := scanTokenRow(row)
	if scanErr != nil {
		return entity.Token{}, false, fmt.Errorf("revoked token %q: %w", ref, scanErr)
	}

	return token, true, nil
}

// TouchToken records the last time a token authenticated. It is a usage stamp,
// not a state change, so it appends nothing to the journal.
func (s *Store) TouchToken(ctx context.Context, ref string, at time.Time) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.TouchToken")
	defer endSpan()

	stamp := at.Format(constant.TimestampLayout)
	if _, err := s.db.ExecContext(ctx,
		`UPDATE api_tokens SET last_used_at = ?
		WHERE ref = ? AND (last_used_at IS NULL OR last_used_at < ?)`,
		stamp, ref, stamp,
	); err != nil {
		return fmt.Errorf("touch token %q: %w", ref, err)
	}

	return nil
}

func scanTokenRow(scanner interface{ Scan(dest ...any) error }) (entity.Token, error) {
	var (
		token      entity.Token
		scopes     string
		createdRaw string
		usedRaw    sql.NullString
		revokedRaw sql.NullString
		expiresRaw sql.NullString
	)

	if err := scanner.Scan(&token.ID, &token.Ref, &token.Name, &token.Preview, &token.Digest,
		&scopes, &createdRaw, &usedRaw, &revokedRaw, &expiresRaw); err != nil {
		return entity.Token{}, err
	}

	token.Scopes = strings.Fields(scopes)

	var err error

	if token.CreatedAt, err = time.Parse(constant.TimestampLayout, createdRaw); err != nil {
		return entity.Token{}, fmt.Errorf("token created_at %q: %w", createdRaw, err)
	}

	if token.LastUsedAt, err = parseOptionalTimestamp(usedRaw); err != nil {
		return entity.Token{}, err
	}

	if token.RevokedAt, err = parseOptionalTimestamp(revokedRaw); err != nil {
		return entity.Token{}, err
	}

	if token.ExpiresAt, err = parseOptionalTimestamp(expiresRaw); err != nil {
		return entity.Token{}, err
	}

	return token, nil
}

func parseOptionalTimestamp(raw sql.NullString) (*time.Time, error) {
	if !raw.Valid || raw.String == "" {
		return nil, nil //nolint:nilnil // no timestamp is not an error
	}

	parsed, err := time.Parse(constant.TimestampLayout, raw.String)
	if err != nil {
		return nil, fmt.Errorf("timestamp %q: %w", raw.String, err)
	}

	return &parsed, nil
}
