package uat

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/cucumber/godog"
)

func RegisterSteps(sc *godog.ScenarioContext, options Options) {
	sc.Before(aFreshWorld(options))
	sc.After(tearDownWorld)

	sc.Step(`^the base currency is "([^"]*)"$`, theBaseCurrencyIs)
	sc.Step(`^a running API$`, aRunningAPI)
	sc.Step(`^the account "([^"]*)" exists as "([^"]*)"$`, theAccountExists)

	sc.Step(`^the request body is:$`, theRequestBodyIs)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)"$`, sendWithoutBody)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with:$`, sendWithBody)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with headers/query:$`, sendWithRequestTable)

	sc.Step(`^the response status is (\d+)$`, responseStatusIs)
	sc.Step(`^the response JSON at "([^"]*)" is "([^"]*)"$`, responseJSONIs)
	sc.Step(`^the response JSON at "([^"]*)" contains "([^"]*)"$`, responseJSONContains)
	sc.Step(`^the response header "([^"]*)" is "([^"]*)"$`, responseHeaderIs)
	sc.Step(`^the response header "([^"]*)" contains "([^"]*)"$`, responseHeaderContains)
	sc.Step(`^the store holds:$`, theStoreHolds)
	sc.Step(`^the response JSON matches the snapshot "([^"]*)"$`, responseMatchesSnapshot)
	sc.Step(`^the database matches the snapshot "([^"]*)"$`, databaseMatchesSnapshot)
}

func aFreshWorld(options Options) func(context.Context, *godog.Scenario) (context.Context, error) {
	return func(ctx context.Context, scenario *godog.Scenario) (context.Context, error) {
		if options.RatesEndpoint == "" && strings.Contains(scenario.Uri, "rates") {
			return ctx, godog.ErrSkip
		}

		return context.WithValue(ctx, worldKey{}, newWorld(options)), nil
	}
}

func tearDownWorld(ctx context.Context, _ *godog.Scenario, _ error) (context.Context, error) {
	if w, ok := ctx.Value(worldKey{}).(*world); ok {
		w.shutdown(ctx)
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

	if err := w.boot(ctx); err != nil {
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

func sendWithoutBody(ctx context.Context, method, path string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.do(ctx, method, path, nil)
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

	return ctx, w.do(ctx, method, path, []byte(body))
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

	want = w.expandFingerprint(want)

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

	if !strings.Contains(got, w.expandFingerprint(want)) {
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

func responseHeaderContains(ctx context.Context, name, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got := w.header.Get(name)
	if !strings.Contains(got, want) {
		return ctx, fmt.Errorf("header %s is %q, want it to contain %q", name, got, want)
	}

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

func theRequestBodyIs(ctx context.Context, body *godog.DocString) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	w.pendingBody = []byte(body.Content)

	return ctx, nil
}

func sendWithRequestTable(
	ctx context.Context,
	method, path string,
	table *godog.Table,
) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	headers, query, err := splitRequestTable(table)
	if err != nil {
		return ctx, err
	}

	body := w.pendingBody
	w.pendingBody = nil

	if len(body) > 0 {
		expanded, expandErr := w.expand(string(body))
		if expandErr != nil {
			return ctx, expandErr
		}

		body = []byte(expanded)
	}

	return ctx, w.doWith(ctx, method, path, body, headers, query)
}

func splitRequestTable(table *godog.Table) (http.Header, url.Values, error) {
	if len(table.Rows) < 2 {
		return nil, nil, errors.New("the request table needs a header and at least one row")
	}

	headers := http.Header{}
	query := url.Values{}

	for _, row := range table.Rows[1:] {
		if len(row.Cells) < 3 {
			return nil, nil, errors.New("each request row needs type, key and value")
		}

		kind := strings.ToLower(strings.TrimSpace(row.Cells[0].Value))
		key := strings.TrimSpace(row.Cells[1].Value)
		value := row.Cells[2].Value

		switch kind {
		case "header":
			headers.Add(key, value)
		case "query":
			query.Add(key, value)
		default:
			return nil, nil, fmt.Errorf("unknown request row type %q (header or query)", kind)
		}
	}

	return headers, query, nil
}

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
