package uat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	workerhandlers "github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

func (w *world) runRecurring(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	clockSource := workerhandlers.TimeSource(fixedClock{at: w.asOf.In(w.zone())})
	if w.asOf.IsZero() {
		clockSource = clock.Zoned{Loc: w.zone()}
	}

	runner := workerhandlers.New(
		w.store, w.store, w.ledger, w.store, w.store, w.artifacts, w.parts,
		w.limits.ArtifactRetention,
		w.exports, w.exportDeps, w.limits.ExportStaleAfter,
		clockSource, w.zone(), logging.From(slog.New(w.logs), telemetry.ComponentWorker),
	)

	summary, err := runner.Run(ctx)
	w.workerSummary = summary

	return err
}

func (w *world) ageArtifact(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-w.limits.ArtifactRetention - time.Hour)

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE artifacts SET created_at = ?`, at.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("age artifact: %w", err)
	}

	return nil
}

func (w *world) ageImportBatch(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-time.Hour)

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE import_batches SET expires_at = ?`, at.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("age import batch: %w", err)
	}

	return nil
}

func (w *world) countImportEvents(ctx context.Context, kind string) (int, error) {
	if w.store == nil {
		return 0, errors.New(`no running API: add the step "a running API" first`)
	}

	var count int

	if err := w.store.DB().QueryRowContext(ctx,
		`SELECT COUNT(*) FROM import_events WHERE kind = ?`, kind).Scan(&count); err != nil {
		return 0, fmt.Errorf("count %s events: %w", kind, err)
	}

	return count, nil
}

func (w *world) ageExport(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-time.Hour)

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE exports SET expires_at = ?`, at.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("age export: %w", err)
	}

	return nil
}

func (w *world) countExportEvents(ctx context.Context, kind string) (int, error) {
	if w.store == nil {
		return 0, errors.New(`no running API: add the step "a running API" first`)
	}

	var count int

	if err := w.store.DB().QueryRowContext(ctx,
		`SELECT COUNT(*) FROM export_events WHERE kind = ?`, kind).Scan(&count); err != nil {
		return 0, fmt.Errorf("count %s events: %w", kind, err)
	}

	return count, nil
}

func (w *world) exportSummary() (any, error) {
	var document struct {
		Summary any `json:"summary"`
	}

	if err := json.Unmarshal(w.body, &document); err != nil {
		return nil, fmt.Errorf("the export is not JSON (%q): %w", preview(string(w.body)), err)
	}

	if document.Summary == nil {
		return nil, errors.New("the export carries no summary")
	}

	return document.Summary, nil
}

func (w *world) exportEventKinds() ([]string, error) {
	var document struct {
		Events []struct {
			Kind string `json:"kind"`
		} `json:"events"`
	}

	if err := json.Unmarshal(w.body, &document); err != nil {
		return nil, fmt.Errorf("the event page is not JSON (%q): %w", preview(string(w.body)), err)
	}

	kinds := make([]string, 0, len(document.Events))

	for index := len(document.Events) - 1; index >= 0; index-- {
		kinds = append(kinds, document.Events[index].Kind)
	}

	return kinds, nil
}

func (w *world) artifactIsGone(ctx context.Context) error {
	if w.store == nil || w.artifacts == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	var sha string

	err := w.store.DB().QueryRowContext(ctx,
		`SELECT sha256 FROM artifacts ORDER BY id DESC LIMIT 1`).Scan(&sha)
	if err != nil {
		return fmt.Errorf("read artifact sha: %w", err)
	}

	body, openErr := w.artifacts.Open(ctx, sha)
	if openErr == nil {
		_ = body.Close()

		return fmt.Errorf("artifact %s is still on disk", sha)
	}

	if !errors.Is(openErr, filestore.ErrNotFound) {
		return fmt.Errorf("open artifact %s: %w", sha, openErr)
	}

	return nil
}

func (w *world) zone() *time.Location {
	if w.location == nil {
		return time.UTC
	}

	return w.location
}

func (w *world) chunk() int {
	if w.commitChunk < 1 {
		return config.DefaultImportCommitChunk
	}

	return w.commitChunk
}

func (w *world) ageImportUploads(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-25 * time.Hour)

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE import_uploads SET updated_at = ?`, at.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("age import uploads: %w", err)
	}

	return nil
}
