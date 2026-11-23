package uat

import (
	"context"
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
	case "posted":
		got = w.workerSummary.Posted
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
