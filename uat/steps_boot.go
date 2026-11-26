package uat

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func theBaseCurrencyIs(ctx context.Context, code string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("set the base currency before starting the API")
	}

	w.baseCurrency = code

	return ctx, nil
}

func aRunningAPI(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if err := w.boot(ctx); err != nil {
		return ctx, err
	}

	return ctx, nil
}

func theAPIClockIs(ctx context.Context, day string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("set the API clock before starting the API")
	}

	at, err := time.Parse(constant.DateLayout, day)
	if err != nil {
		return ctx, err
	}

	w.apiAsOf = at

	return ctx, nil
}

func theDatabasePathIsADirectory(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.useDirectoryAsDatabase()
}

func theDatabaseHoldsForeignSchema(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.seedForeignSchema(ctx)
}

func theDatabaseHoldsSchemaVersion(ctx context.Context, version string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	number, err := strconv.Atoi(version)
	if err != nil {
		return ctx, fmt.Errorf("schema version %q: %w", version, err)
	}

	return ctx, w.seedUnsupportedSchema(ctx, number)
}

func iBootTheAPI(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	w.bootErr = w.boot(ctx)

	return ctx, nil
}

func theBootFails(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.bootErr == nil {
		return ctx, errors.New("the API booted, want a refusal")
	}

	return ctx, nil
}

func theBootFailureMentions(ctx context.Context, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.bootErr == nil {
		return ctx, errors.New("the API booted, want a refusal to read")
	}

	if !strings.Contains(w.bootErr.Error(), want) {
		return ctx, fmt.Errorf("boot failure is %q, want it to mention %q", w.bootErr.Error(), want)
	}

	return ctx, nil
}

func theFailureIsLogged(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.logs.failure() == "" {
		return ctx, errors.New("nothing was logged at error level")
	}

	return ctx, nil
}
