package uat

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/cucumber/godog"
)

// RegisterSteps wires the generic vocabulary. Every step is a mechanical
// translation of one phrase into one operation: no step encodes a rule, so a
// new endpoint needs no new steps.
func RegisterSteps(sc *godog.ScenarioContext) {
	sc.Before(aFreshWorld)
	sc.After(tearDownWorld)

	// Given
	sc.Step(`^the base currency is "([^"]*)"$`, theBaseCurrencyIs)
	sc.Step(`^a running API$`, aRunningAPI)
	sc.Step(`^the account "([^"]*)" exists as "([^"]*)"$`, theAccountExists)

	// When
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)"$`, sendWithoutBody)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with:$`, sendWithBody)

	// Then
	sc.Step(`^the response status is (\d+)$`, responseStatusIs)
	sc.Step(`^the response JSON at "([^"]*)" is "([^"]*)"$`, responseJSONIs)
	sc.Step(`^the response JSON at "([^"]*)" contains "([^"]*)"$`, responseJSONContains)
	sc.Step(`^the response header "([^"]*)" is "([^"]*)"$`, responseHeaderIs)
	sc.Step(`^the store holds:$`, theStoreHolds)
}

func aFreshWorld(ctx context.Context, _ *godog.Scenario) (context.Context, error) {
	return context.WithValue(ctx, worldKey{}, newWorld()), nil
}

func tearDownWorld(ctx context.Context, _ *godog.Scenario, _ error) (context.Context, error) {
	if w, ok := ctx.Value(worldKey{}).(*world); ok {
		w.shutdown()
	}

	return ctx, nil
}

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

	if err := w.boot(); err != nil {
		return ctx, err
	}

	return ctx, nil
}

func theAccountExists(ctx context.Context, name, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	// Ensure, not create: a Given restates the world, so asking twice is legal.
	id, found, err := w.store.FindAccount(ctx, name, kind)
	if err != nil {
		return ctx, err
	}

	if !found {
		id, err = w.store.CreateAccount(ctx, name, kind, w.baseCurrency)
		if err != nil {
			return ctx, err
		}
	}

	w.accounts[name] = id

	return ctx, nil
}

func sendWithoutBody(ctx context.Context, method, path string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.do(method, path, nil)
}

func sendWithBody(ctx context.Context, method, path string, doc *godog.DocString) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	body, err := w.expand(doc.Content)
	if err != nil {
		return ctx, err
	}

	return ctx, w.do(method, path, []byte(body))
}

func responseStatusIs(ctx context.Context, want int) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.status != want {
		return ctx, fmt.Errorf("status is %d, want %d (body: %s)", w.status, want, string(w.body))
	}

	return ctx, nil
}

func responseJSONIs(ctx context.Context, path, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.jsonPath(path)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("%s is %q, want %q (body: %s)", path, got, want, string(w.body))
	}

	return ctx, nil
}

func responseJSONContains(ctx context.Context, path, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.jsonPath(path)
	if err != nil {
		return ctx, err
	}

	if !strings.Contains(got, want) {
		return ctx, fmt.Errorf("%s is %q, does not contain %q", path, got, want)
	}

	return ctx, nil
}

func responseHeaderIs(ctx context.Context, name, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got := w.header.Get(name)
	if got != want {
		return ctx, fmt.Errorf("header %s is %q, want %q", name, got, want)
	}

	return ctx, nil
}

// theStoreHolds asserts row counts straight from the database, because "the
// response looked right" is not the same as "the data is right".
//
//	| table          | count |
//	| ledger_entries | 1     |
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
			continue // header
		}

		if len(row.Cells) < 2 {
			return ctx, fmt.Errorf("row %d needs a table name and a count", i)
		}

		name := strings.TrimSpace(row.Cells[0].Value)

		want, err := strconv.Atoi(strings.TrimSpace(row.Cells[1].Value))
		if err != nil {
			return ctx, fmt.Errorf("row %d count %q is not a number", i, row.Cells[1].Value)
		}

		got, err := w.countTable(name)
		if err != nil {
			return ctx, err
		}

		if got != want {
			return ctx, fmt.Errorf("%s holds %d rows, want %d", name, got, want)
		}
	}

	return ctx, nil
}
