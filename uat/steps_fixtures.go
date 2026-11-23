package uat

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/cucumber/godog"
)

func theAccountExists(ctx context.Context, name, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	account, found, err := w.store.FindAccount(ctx, name, kind)
	if err != nil {
		return ctx, err
	}

	if !found {
		account, err = w.store.CreateAccount(ctx, name, kind, w.baseCurrency)
		if err != nil {
			return ctx, err
		}
	}

	w.accounts[name] = account.Ref

	return ctx, nil
}

func theStoreHolds(ctx context.Context, table *godog.Table) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if len(table.Rows) < 2 {
		return ctx, errors.New("the store table needs a header and at least one row")
	}

	for i, row := range table.Rows {
		if i == 0 {
			continue
		}

		if len(row.Cells) < 2 {
			return ctx, fmt.Errorf("row %d needs a table name and a count", i)
		}

		name := strings.TrimSpace(row.Cells[0].Value)

		want, err := strconv.Atoi(strings.TrimSpace(row.Cells[1].Value))
		if err != nil {
			return ctx, fmt.Errorf("row %d count %q is not a number", i, row.Cells[1].Value)
		}

		got, err := w.countTable(ctx, name)
		if err != nil {
			return ctx, err
		}

		if got != want {
			return ctx, fmt.Errorf("%s holds %d rows, want %d", name, got, want)
		}
	}

	return ctx, nil
}

func theDatabaseIsCleared(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.clearDatabase(ctx)
}

func theLocalCacheIsCleared(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.rates == nil {
		return ctx, errors.New("no rates service: start the API with a rates endpoint")
	}

	w.rates.Clear()

	return ctx, nil
}

func theConnectionIsBroken(ctx context.Context) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	if closeErr := w.store.Close(ctx); closeErr != nil {
		return ctx, closeErr
	}

	w.dbBroken = true

	return ctx, nil
}
