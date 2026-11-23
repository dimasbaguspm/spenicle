package uat

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
)

func theExportArchiveHolds(ctx context.Context, names string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.exportArchiveHolds(names)
}

func theExportManifestReports(ctx context.Context, name, rows string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	want, err := strconv.Atoi(strings.TrimSpace(rows))
	if err != nil {
		return ctx, fmt.Errorf("row count %q is not a number", rows)
	}

	got, err := w.exportManifestRows(name)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("%s reports %d rows, want %d", name, got, want)
	}

	return ctx, nil
}

func theExportEventLogHolds(ctx context.Context, want int, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.countExportEvents(ctx, kind)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("the export event log holds %d %q events, want %d", got, kind, want)
	}

	return ctx, nil
}

func theExportBlobIsGone(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.exportBlobIsGone(ctx)
}

func theExportEventsAre(ctx context.Context, expected string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.exportEventKinds()
	if err != nil {
		return ctx, err
	}

	want := make([]string, 0)

	for _, kind := range strings.Split(expected, ",") {
		if trimmed := strings.TrimSpace(kind); trimmed != "" {
			want = append(want, trimmed)
		}
	}

	if !slices.Equal(got, want) {
		return ctx, fmt.Errorf("the export events are %v, want %v", got, want)
	}

	return ctx, nil
}
