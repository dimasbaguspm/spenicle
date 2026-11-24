package uat

import "github.com/cucumber/godog"

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
	sc.Step(`^I upload chunk (\d+) of (\d+) of the statement "([^"]*)" with the client id "([^"]*)":$`,
		uploadStatementChunk)
	sc.Step(`^the ledger holds an entry with client id prefix "([^"]*)" and source "([^"]*)"$`,
		theLedgerHoldsEntry)

	sc.Step(`^the response status is (\d+)$`, responseStatusIs)
	sc.Step(`^the artifact garbage collector runs$`, theArtifactGarbageCollectorRuns)
	sc.Step(`^the response header "([^"]*)" is "([^"]*)"$`, responseHeaderIs)
	sc.Step(`^the response header "([^"]*)" contains "([^"]*)"$`, responseHeaderContains)
	sc.Step(`^the import draft is older than its expiry$`, theImportDraftIsExpired)
	sc.Step(`^the import upload is older than its retention$`, theImportUploadIsStale)
	sc.Step(`^the import batch is mid-commit$`, theImportBatchIsMidCommit)
	sc.Step(`^the import commit chunk size is "(\d+)"$`, theImportCommitChunkIs)
	sc.Step(`^the API restarts$`, theAPIRestarts)
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
	sc.Step(`^the recurring worker reports "(\d+)" (queued|skipped|failed)$`, theRecurringWorkerReports)
	sc.Step(`^the first capture ref is remembered$`, theFirstCaptureRefIsRemembered)
	sc.Step(`^the recurring worker runs$`, theRecurringWorkerRuns)
	sc.Step(`^the store holds:$`, theStoreHolds)
	sc.Step(`^the journal holds (\d+) "([^"]*)" rows$`, theJournalHolds)
	sc.Step(`^the last journal row names the token as its actor$`, theLastJournalRowNamesTheToken)
	sc.Step(`^the instance password is "([^"]*)"$`, theInstancePasswordIs)
	sc.Step(`^I sign in with the instance password$`, iSignInWithTheInstancePassword)
	sc.Step(`^the issued token is the bearer credential$`, theIssuedTokenIsTheBearer)
	sc.Step(`^the same token is the bearer credential again$`, theSameTokenIsTheBearerAgain)
	sc.Step(`^only the root session is used$`, theRootSessionOnly)
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
	sc.Step(`^the export blob is gone from the exports directory$`, theExportBlobIsGone)
}

// Options is what the harness injects: a healthy endpoint per vendor plus the two ways a
// vendor can fail — down (503) and contract broken (a body that does not parse).
type Options struct {
	RatesEndpoint        string
	RatesDownEndpoint    string
	RatesBrokenEndpoint  string
	SnapEndpoint         string
	SnapDownEndpoint     string
	SnapBrokenEndpoint   string
	OpenAIEndpoint       string
	OpenAIDownEndpoint   string
	OpenAIBrokenEndpoint string
}

func (o Options) vendorsReady() bool {
	return o.RatesEndpoint != "" && o.SnapEndpoint != "" && o.OpenAIEndpoint != ""
}
