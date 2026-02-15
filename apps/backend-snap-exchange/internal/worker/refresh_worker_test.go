package worker

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/scraper"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/storage"
)

func TestNewRefreshWorker(t *testing.T) {
	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper("http://example.com")

	worker := NewRefreshWorker(ctx, ecbScraper, store)

	if worker == nil {
		t.Fatal("NewRefreshWorker() returned nil")
	}

	if worker.scraper == nil {
		t.Error("Worker scraper is nil")
	}

	if worker.store == nil {
		t.Error("Worker store is nil")
	}

	if worker.ctx == nil {
		t.Error("Worker context is nil")
	}

	if worker.cancel == nil {
		t.Error("Worker cancel function is nil")
	}
}

func TestRefreshWorker_Refresh_Success(t *testing.T) {
	// Create mock ECB server
	mockXML := `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="1.0820"/>
			<Cube currency="JPY" rate="160.58"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(mockXML))
	}))
	defer server.Close()

	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper(server.URL)
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	// Initial store should be empty
	if !store.IsEmpty() {
		t.Error("Store should be empty initially")
	}

	// Perform refresh
	err := worker.refresh()
	if err != nil {
		t.Fatalf("Refresh failed: %v", err)
	}

	// Store should now have rates
	if store.IsEmpty() {
		t.Error("Store should have rates after refresh")
	}

	rates := store.GetAllRates()
	if len(rates) != 3 { // EUR + USD + JPY
		t.Errorf("Expected 3 rates, got %d", len(rates))
	}

	if rates["USD"] != 1.0820 {
		t.Errorf("Expected USD rate to be 1.0820, got %f", rates["USD"])
	}
}

func TestRefreshWorker_Refresh_Failure(t *testing.T) {
	// Create failing mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper(server.URL)
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	// Populate store with existing rates (Last Known Good)
	existingRates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0800,
	}
	store.UpdateRates(existingRates)

	// Perform refresh (should fail)
	err := worker.refresh()
	if err == nil {
		t.Error("Expected refresh to fail")
	}

	// Store should retain old rates (Last Known Good)
	rates := store.GetAllRates()
	if len(rates) != 2 {
		t.Error("Store should retain existing rates on failure")
	}

	if rates["USD"] != 1.0800 {
		t.Error("Store should preserve old rate on refresh failure")
	}
}

func TestRefreshWorker_StartStop(t *testing.T) {
	// Create mock ECB server
	mockXML := `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="1.0820"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(mockXML))
	}))
	defer server.Close()

	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper(server.URL)
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	// Start worker
	worker.Start()

	// Wait a moment for initial scrape
	time.Sleep(100 * time.Millisecond)

	// Check rates were loaded
	if store.IsEmpty() {
		t.Error("Store should have rates after worker start")
	}

	// Stop worker
	worker.Stop()

	// Worker should stop gracefully
	// No assertions needed - if it hangs, test will timeout
}

func TestRefreshWorker_ContextCancellation(t *testing.T) {
	mockXML := `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="1.0820"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(mockXML))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper(server.URL)
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	worker.Start()

	// Wait for initial scrape
	time.Sleep(100 * time.Millisecond)

	// Cancel context
	cancel()

	// Wait for worker to stop
	time.Sleep(100 * time.Millisecond)

	// Worker should have stopped gracefully
	// No assertions needed - if it hangs, test will timeout
}

func TestRefreshWorker_RetryActivation(t *testing.T) {
	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper("http://example.com")
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	// Initially, retry should not be active
	if worker.retryActive {
		t.Error("Retry should not be active initially")
	}

	// Activate retry
	worker.activateRetry()
	if !worker.retryActive {
		t.Error("Retry should be active after activation")
	}

	// Deactivate retry
	worker.deactivateRetry()
	if worker.retryActive {
		t.Error("Retry should not be active after deactivation")
	}
}

func TestRefreshWorker_GetRetryChannel(t *testing.T) {
	ctx := context.Background()
	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper("http://example.com")
	worker := NewRefreshWorker(ctx, ecbScraper, store)

	// Initially, retry should not be active
	ch := worker.getRetryChannel()
	if ch == nil {
		t.Error("getRetryChannel() should return non-nil channel")
	}

	// Activate retry
	worker.activateRetry()
	ch = worker.getRetryChannel()
	if ch == nil {
		t.Error("getRetryChannel() should return ticker channel when active")
	}

	// Deactivate retry
	worker.deactivateRetry()
}
