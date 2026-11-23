package uat

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/cucumber/godog"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func RegisterSteps(sc *godog.ScenarioContext, options Options) {
	sc.Before(aFreshWorld(options))
	sc.After(tearDownWorld)

	sc.Step(`^the base currency is "([^"]*)"$`, theBaseCurrencyIs)
	sc.Step(`^a running API$`, aRunningAPI)
	sc.Step(`^the account "([^"]*)" exists as "([^"]*)"$`, theAccountExists)

	sc.Step(`^the extraction rail is "([^"]*)"$`, theExtractionRailIs)
	sc.Step(`^the extraction vendor is down$`, theExtractionVendorIsDown)
	sc.Step(`^the rates vendor is down$`, theRatesVendorIsDown)
	sc.Step(`^the extraction vendor breaks its contract$`, theExtractionVendorBreaksItsContract)
	sc.Step(`^the rates vendor breaks its contract$`, theRatesVendorBreaksItsContract)

	sc.Step(`^the request body is:$`, theRequestBodyIs)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)"$`, sendWithoutBody)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with:$`, sendWithBody)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with headers/query:$`, sendWithRequestTable)
	sc.Step(`^I send a (GET|POST|PATCH|DELETE) to "([^"]*)" with the artifact "([^"]*)"$`, sendWithArtifact)
	sc.Step(`^I upload the statement "([^"]*)" with the client id "([^"]*)":$`, uploadStatement)
	sc.Step(`^I upload the statement "([^"]*)" with the client id "([^"]*)" on the account "([^"]*)":$`,
		uploadStatementOnAccount)
	sc.Step(`^the ledger holds an entry with client id prefix "([^"]*)" and source "([^"]*)"$`,
		theLedgerHoldsEntry)

	sc.Step(`^the response status is (\d+)$`, responseStatusIs)
	sc.Step(`^the artifact garbage collector runs$`, theArtifactGarbageCollectorRuns)
	sc.Step(`^the response header "([^"]*)" is "([^"]*)"$`, responseHeaderIs)
	sc.Step(`^the response header "([^"]*)" contains "([^"]*)"$`, responseHeaderContains)
	sc.Step(`^the import draft is older than its expiry$`, theImportDraftIsExpired)
	sc.Step(`^the import event log holds (\d+) events? of kind "([a-z_]+)"$`, theImportEventLogHolds)
	sc.Step(`^the response body hashes to "([^"]*)"$`, responseBodyHashesTo)
	sc.Step(`^the capture artifact predates the retention$`, theCaptureArtifactPredatesTheRetention)
	sc.Step(`^the capture artifact is gone$`, theCaptureArtifactIsGone)
	sc.Step(`^the database is cleared$`, theDatabaseIsCleared)
	sc.Step(`^the local cache is cleared$`, theLocalCacheIsCleared)
	sc.Step(`^the connection is broken$`, theConnectionIsBroken)
	sc.Step(`^the database path is a directory$`, theDatabasePathIsADirectory)
	sc.Step(`^the database file holds a foreign schema_migrations table$`, theDatabaseHoldsForeignSchema)
	sc.Step(`^I boot the API$`, iBootTheAPI)
	sc.Step(`^the boot fails$`, theBootFails)
	sc.Step(`^the boot failure mentions "([^"]*)"$`, theBootFailureMentions)
	sc.Step(`^the failure is logged$`, theFailureIsLogged)
	sc.Step(`^the recurring worker clock is "([^"]*)"$`, theRecurringWorkerClockIs)
	sc.Step(`^the recurring worker reports "(\d+)" (posted|skipped|failed)$`, theRecurringWorkerReports)
	sc.Step(`^the recurring worker runs$`, theRecurringWorkerRuns)
	sc.Step(`^the store holds:$`, theStoreHolds)
	sc.Step(`^the last ref is remembered as "([^"]*)"$`, theLastRefIsRemembered)
	sc.Step(`^the last ref is still "([^"]*)"$`, theLastRefIsStill)
	sc.Step(`^the response JSON matches the snapshot "([^"]*)"$`, responseMatchesSnapshot)
	sc.Step(`^the database matches the snapshot "([^"]*)"$`, databaseMatchesSnapshot)
	sc.Step(`^the export JSON matches the snapshot "([^"]*)"$`, exportMatchesSnapshot)
	sc.Step(`^the export archive holds "([^"]*)"$`, theExportArchiveHolds)
	sc.Step(`^the export manifest reports "([^"]*)" rows "(\d+)"$`, theExportManifestReports)
	sc.Step(`^the export summary matches the snapshot "([^"]*)"$`, theExportSummaryMatches)
	sc.Step(`^the export worker runs$`, theExportWorkerRuns)
	sc.Step(`^the export worker claims the job and dies$`, theExportWorkerClaimsAndDies)
	sc.Step(`^the export job predates the retention$`, theExportJobPredatesTheRetention)
	sc.Step(`^the export event log holds (\d+) events? of kind "([a-z_]+)"$`, theExportEventLogHolds)
	sc.Step(`^the export events are "([^"]*)"$`, theExportEventsAre)
}

func aFreshWorld(options Options) func(context.Context, *godog.Scenario) (context.Context, error) {
	return func(ctx context.Context, scenario *godog.Scenario) (context.Context, error) {
		if options.RatesEndpoint == "" && strings.Contains(scenario.Uri, "rates") {
			return ctx, godog.ErrSkip
		}

		if tagged(scenario, "vendors") && !options.vendorsReady() {
			return ctx, godog.ErrSkip
		}

		return context.WithValue(ctx, worldKey{}, newWorld(options)), nil
	}
}

func tagged(scenario *godog.Scenario, name string) bool {
	for _, tag := range scenario.Tags {
		if strings.TrimPrefix(tag.Name, "@") == name {
			return true
		}
	}

	return false
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

func responseBodyHashesTo(ctx context.Context, want string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	sum := sha256.Sum256(w.body)
	got := hex.EncodeToString(sum[:])

	if got != strings.ToLower(strings.TrimSpace(want)) {
		return ctx, fmt.Errorf("the body hashes to %s, want %s (body %s)",
			got, want, preview(string(w.body)))
	}

	return ctx, nil
}

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

func theLastRefIsRemembered(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.lastRef == "" {
		return ctx, errors.New("no ref to remember: send a POST first")
	}

	w.refs[name] = w.lastRef

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

func walkContract(path string, value any) error {
	switch typed := value.(type) {
	case map[string]any:
		for key, inner := range typed {
			if err := checkKey(path, key, inner); err != nil {
				return err
			}

			if err := walkContract(path+"."+key, inner); err != nil {
				return err
			}
		}
	case []any:
		for index, inner := range typed {
			if err := walkContract(fmt.Sprintf("%s[%d]", path, index), inner); err != nil {
				return err
			}
		}
	}

	return nil
}

func checkKey(path, key string, value any) error {
	if key == "id" {
		return fmt.Errorf("%s: integer ids never leave the database", path)
	}

	if isOurRef(key) {
		ref, ok := value.(string)
		if !ok || !refPattern.MatchString(ref) {
			return fmt.Errorf("%s.%s is %v, want a 32-hex ref", path, key, value)
		}
	}

	if strings.HasSuffix(key, "_minor") || key == "rate" {
		if _, ok := value.(string); !ok {
			return fmt.Errorf("%s.%s is %v, want a string of minor units", path, key, value)
		}
	}

	return nil
}

const foreignJobRef = "job_ref"

func isOurRef(key string) bool {
	return (key == "ref" || strings.HasSuffix(key, "_ref")) && key != foreignJobRef
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

func theExtractionRailIs(ctx context.Context, rail string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("choose the extraction rail before starting the API")
	}

	w.rail = rail

	return ctx, nil
}

func theExtractionVendorIsDown(ctx context.Context) (context.Context, error) {
	return setExtractionFault(ctx, faultDown)
}

func theExtractionVendorBreaksItsContract(ctx context.Context) (context.Context, error) {
	return setExtractionFault(ctx, faultBroken)
}

func theRatesVendorIsDown(ctx context.Context) (context.Context, error) {
	return setRatesFault(ctx, faultDown)
}

func theRatesVendorBreaksItsContract(ctx context.Context) (context.Context, error) {
	return setRatesFault(ctx, faultBroken)
}

func setExtractionFault(ctx context.Context, fault faultType) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("break the extraction vendor before starting the API")
	}

	w.extractionFault = fault

	return ctx, nil
}

func setRatesFault(ctx context.Context, fault faultType) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.server != nil {
		return ctx, errors.New("break the rates vendor before starting the API")
	}

	w.ratesFault = fault

	return ctx, nil
}

func sendWithArtifact(ctx context.Context, method, path, filename string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var body bytes.Buffer

	form := multipart.NewWriter(&body)

	part, err := form.CreateFormFile("file", filename)
	if err != nil {
		return ctx, fmt.Errorf("file part: %w", err)
	}

	if _, err = part.Write([]byte("uat artifact bytes")); err != nil {
		return ctx, fmt.Errorf("artifact: %w", err)
	}

	if err = form.WriteField("kind", constant.CaptureKindImage); err != nil {
		return ctx, fmt.Errorf("kind field: %w", err)
	}

	if err = form.Close(); err != nil {
		return ctx, fmt.Errorf("close form: %w", err)
	}

	headers := http.Header{"Content-Type": []string{form.FormDataContentType()}}

	return ctx, w.doWith(ctx, method, path, body.Bytes(), headers, nil)
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

func exportMatchesSnapshot(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertExportSnapshot(name)
}

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

func theExportSummaryMatches(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	return ctx, w.assertExportSummarySnapshot(name)
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

func uploadStatement(
	ctx context.Context,
	filename, clientID string,
	statement *godog.DocString,
) (context.Context, error) {
	return uploadStatementFor(ctx, filename, clientID, "", statement)
}

func uploadStatementOnAccount(
	ctx context.Context,
	filename, clientID, account string,
	statement *godog.DocString,
) (context.Context, error) {
	return uploadStatementFor(ctx, filename, clientID, account, statement)
}

func uploadStatementFor(
	ctx context.Context,
	filename, clientID, account string,
	statement *godog.DocString,
) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	var body bytes.Buffer

	form := multipart.NewWriter(&body)

	part, err := form.CreateFormFile("file", filename)
	if err != nil {
		return ctx, fmt.Errorf("file part: %w", err)
	}

	if _, err = part.Write([]byte(statement.Content)); err != nil {
		return ctx, fmt.Errorf("statement: %w", err)
	}

	if err = form.WriteField("client_id", clientID); err != nil {
		return ctx, fmt.Errorf("client id field: %w", err)
	}

	if account != "" {
		ref, ok := w.accounts[account]
		if !ok {
			return ctx, fmt.Errorf(
				`unknown account %q: create it with "the account ... exists as ..."`, account)
		}

		if err = form.WriteField("account_ref", ref); err != nil {
			return ctx, fmt.Errorf("account field: %w", err)
		}
	}

	if err = form.Close(); err != nil {
		return ctx, fmt.Errorf("close form: %w", err)
	}

	headers := http.Header{"Content-Type": []string{form.FormDataContentType()}}

	return ctx, w.doWith(ctx, http.MethodPost, "/api/imports", body.Bytes(), headers, nil)
}

func theLedgerHoldsEntry(ctx context.Context, prefix, source string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	if w.store == nil {
		return ctx, errors.New(`no running API: add the step "a running API" first`)
	}

	var count int

	query := `SELECT COUNT(*) FROM ledger_entries WHERE client_id LIKE ? ESCAPE '\' AND source = ?`

	row := w.store.DB().QueryRowContext(ctx, query, escapeLikeForUAT(prefix)+"%", source)

	if err = row.Scan(&count); err != nil {
		return ctx, fmt.Errorf("count imported entries: %w", err)
	}

	if count == 0 {
		return ctx, fmt.Errorf("no entry holds a client id starting with %q and source %q", prefix, source)
	}

	return ctx, nil
}

func escapeLikeForUAT(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}

func theLastRefIsStill(ctx context.Context, name string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	ref, ok := w.refs[name]
	if !ok {
		return ctx, fmt.Errorf(`unknown ref %q: add "the last ref is remembered as ..."`, name)
	}

	if w.lastRef != ref {
		return ctx, fmt.Errorf("the last ref is %s, want the remembered %s", w.lastRef, ref)
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

func theImportEventLogHolds(ctx context.Context, want int, kind string) (context.Context, error) {
	w, err := worldFrom(ctx)
	if err != nil {
		return ctx, err
	}

	got, err := w.countImportEvents(ctx, kind)
	if err != nil {
		return ctx, err
	}

	if got != want {
		return ctx, fmt.Errorf("the import event log holds %d %q events, want %d", got, kind, want)
	}

	return ctx, nil
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
