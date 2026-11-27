package uat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func theCaptureArtifactPredatesTheRetention(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.ageArtifact(ctx)
}

func theCaptureArtifactIsGone(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.artifactIsGone(ctx)
}

func theArtifactGarbageCollectorRuns(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.runRecurring(ctx)
}

func theRecurringWorkerClockIs(ctx context.Context, day string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	at, err := time.Parse(constant.DateLayout, day)
	if err != nil {
		return ctx, err
	}

	w.asOf = at

	return ctx, nil
}

func theRecurringWorkerRuns(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.runRecurring(ctx)
}

func theRecurringWorkerReports(ctx context.Context, want int, counter string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var got int

	switch counter {
	case "queued":
		got = w.workerSummary.Queued
	case "skipped":
		got = w.workerSummary.Skipped
	case "failed":
		got = w.workerSummary.Failed
	default:
		return ctx, fmt.Errorf("unknown worker counter %q", counter)
	}

	if got != want {
		return ctx, fmt.Errorf("the worker reported %d %s, want %d", got, counter, want)
	}

	return ctx, nil
}

func theExportWorkerRuns(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.runRecurring(ctx)
}

func theExportJobPredatesTheRetention(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.ageExport(ctx)
}

func theRunningExportPredatesTheStaleWindow(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-w.limits.ExportStaleAfter - time.Hour)

	result, err := w.store.DB().ExecContext(ctx,
		`UPDATE exports SET started_at = ? WHERE status = 'running'`,
		at.Format(constant.TimestampLayout))
	if err != nil {
		return ctx, fmt.Errorf("age the running export: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return ctx, fmt.Errorf("count aged running exports: %w", err)
	}

	if affected == 0 {
		return ctx, errors.New("no running export job was aged")
	}

	return ctx, nil
}

func theImportDraftIsExpired(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.ageImportBatch(ctx)
}

func theExportWorkerClaimsAndDies(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	claimed, err := w.exports.Claim(ctx, 1)
	if err != nil {
		return ctx, err
	}

	if len(claimed) == 0 {
		return ctx, errors.New("no queued export job was claimed")
	}

	return ctx, nil
}

func theImportUploadIsStale(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.ageImportUploads(ctx)
}

func theImportBatchIsMidCommit(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE import_batches SET status = 'committing'`); err != nil {
		return ctx, fmt.Errorf("park the batch mid-commit: %w", err)
	}

	return ctx, nil
}

func theImportCommitChunkIs(ctx context.Context, size string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("set the commit chunk size before starting the API")
	}

	chunk, err := strconv.Atoi(size)
	if err != nil || chunk < 1 {
		return ctx, fmt.Errorf("chunk size %q is not a positive number", size)
	}

	w.commitChunk = chunk

	return ctx, nil
}

func theAPIRestarts(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.restart(ctx)
}

func theFirstCaptureRefIsRemembered(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var page struct {
		Captures []struct {
			Ref string `json:"ref"`
		} `json:"captures"`
	}

	if unmarshalErr := json.Unmarshal(w.body, &page); unmarshalErr != nil {
		return ctx, fmt.Errorf("the capture page is not JSON (%q): %w", preview(string(w.body)), unmarshalErr)
	}

	if len(page.Captures) == 0 {
		return ctx, errors.New("the capture page is empty")
	}

	w.lastRef = page.Captures[0].Ref

	return ctx, nil
}

func theRecurringDraftFieldIs(ctx context.Context, field, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil || w.sealer == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	var sealed string
	if queryErr := w.store.DB().QueryRowContext(ctx,
		`SELECT p.draft_json FROM captures
		 JOIN capture_payloads p ON p.capture_ref = captures.ref
		 WHERE captures.kind = 'recurring' ORDER BY captures.id LIMIT 1`,
	).Scan(&sealed); queryErr != nil {
		return ctx, fmt.Errorf("read the recurring draft: %w", queryErr)
	}

	plain, err := w.sealer.Open(ctx, sealed)
	if err != nil {
		return ctx, fmt.Errorf("open the recurring draft: %w", err)
	}

	var draft map[string]string
	if unmarshalErr := json.Unmarshal(plain, &draft); unmarshalErr != nil {
		return ctx, fmt.Errorf(
			"the recurring draft is not JSON (%q): %w", preview(string(plain)), unmarshalErr)
	}

	expanded, err := w.expand(want)
	if err != nil {
		return ctx, err
	}

	if got := draft[field]; got != expanded {
		return ctx, fmt.Errorf("the recurring draft field %q is %q, want %q", field, got, expanded)
	}

	return ctx, nil
}
