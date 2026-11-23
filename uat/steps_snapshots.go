package uat

import "context"

func responseMatchesSnapshot(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertAPISnapshot(name)
}

func databaseMatchesSnapshot(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertDBSnapshot(ctx, name)
}

func exportMatchesSnapshot(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertExportSnapshot(name)
}

func theExportSummaryMatches(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertExportSummarySnapshot(name)
}
