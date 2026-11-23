package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const artifactColumns = `artifacts.id, artifacts.ref, captures.ref, artifacts.sha256,
	artifacts.content_type, artifacts.filename, artifacts.plain_bytes,
	artifacts.stored_bytes, artifacts.created_at, artifacts.deleted_at`

func (s *Store) InsertArtifact(ctx context.Context, artifact entity.Artifact) (entity.Artifact, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertArtifact")
	defer endSpan()

	if artifact.Ref == "" {
		artifact.Ref = uuid.New()
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO artifacts
			(ref, capture_id, sha256, content_type, filename, plain_bytes,
			 stored_bytes, created_at, deleted_at)
		VALUES (?, (SELECT id FROM captures WHERE ref = ?), ?, ?, ?, ?, ?, ?, ?)`,
		artifact.Ref,
		artifact.CaptureRef,
		artifact.SHA256,
		artifact.ContentType,
		artifact.Filename,
		artifact.PlainBytes,
		artifact.StoredBytes,
		artifact.CreatedAt.UTC().Format(constant.TimestampLayout),
		nullTime(artifact.DeletedAt),
	)
	if err != nil {
		return entity.Artifact{}, fmt.Errorf("insert artifact: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.Artifact{}, fmt.Errorf("artifact id: %w", err)
	}

	artifact.ID = id

	return artifact, nil
}

func (s *Store) ArtifactByCaptureRef(
	ctx context.Context,
	captureRef string,
) (entity.Artifact, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ArtifactByCaptureRef")
	defer endSpan()

	artifact, err := scanArtifactRow(s.db.QueryRowContext(ctx,
		`SELECT `+artifactColumns+` FROM artifacts
		 JOIN captures ON captures.id = artifacts.capture_id
		 WHERE captures.ref = ?`, captureRef))
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Artifact{}, false, nil
	}

	if err != nil {
		return entity.Artifact{}, false, fmt.Errorf("artifact by capture %s: %w", captureRef, err)
	}

	return artifact, true, nil
}

func (s *Store) ExpiredArtifacts(
	ctx context.Context,
	rejectedBefore time.Time,
	limit int,
) ([]entity.Artifact, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExpiredArtifacts")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT `+artifactColumns+` FROM artifacts
		 JOIN captures ON captures.id = artifacts.capture_id
		 WHERE captures.status = ?
		   AND artifacts.deleted_at IS NULL
		   AND artifacts.created_at < ?
		 ORDER BY artifacts.created_at ASC, artifacts.id ASC
		 LIMIT ?`,
		constant.CaptureStatusRejected,
		rejectedBefore.UTC().Format(constant.TimestampLayout),
		clampLimit(limit),
	)
	if err != nil {
		return nil, fmt.Errorf("select expired artifacts: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Artifact, 0, clampLimit(limit))

	for rows.Next() {
		artifact, scanErr := scanArtifactRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, artifact)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate artifacts: %w", err)
	}

	return out, nil
}

func (s *Store) MarkArtifactDeleted(ctx context.Context, ref string, at time.Time) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.MarkArtifactDeleted")
	defer endSpan()

	res, err := s.db.ExecContext(ctx,
		`UPDATE artifacts SET deleted_at = ? WHERE ref = ? AND deleted_at IS NULL`,
		at.UTC().Format(constant.TimestampLayout), ref)
	if err != nil {
		return false, fmt.Errorf("mark artifact %s deleted: %w", ref, err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("artifact rows: %w", err)
	}

	return affected > 0, nil
}

func scanArtifactRow(scanner interface{ Scan(dest ...any) error }) (entity.Artifact, error) {
	var (
		artifact   entity.Artifact
		createdRaw string
		deletedRaw sql.NullString
	)

	err := scanner.Scan(
		&artifact.ID, &artifact.Ref, &artifact.CaptureRef, &artifact.SHA256,
		&artifact.ContentType, &artifact.Filename, &artifact.PlainBytes,
		&artifact.StoredBytes, &createdRaw, &deletedRaw,
	)
	if err != nil {
		return entity.Artifact{}, err
	}

	created, err := time.Parse(constant.TimestampLayout, createdRaw)
	if err != nil {
		return entity.Artifact{}, fmt.Errorf("artifact created_at %q: %w", createdRaw, err)
	}

	artifact.CreatedAt = created

	if deletedRaw.Valid {
		at, parseErr := time.Parse(constant.TimestampLayout, deletedRaw.String)
		if parseErr != nil {
			return entity.Artifact{}, fmt.Errorf("artifact deleted_at %q: %w", deletedRaw.String, parseErr)
		}

		artifact.DeletedAt = &at
	}

	return artifact, nil
}
