package scraper

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewECBScraper(t *testing.T) {
	scraper := NewECBScraper("http://example.com")

	if scraper == nil {
		t.Fatal("NewECBScraper() returned nil")
	}

	if scraper.url != "http://example.com" {
		t.Errorf("Expected URL to be http://example.com, got %s", scraper.url)
	}

	if scraper.client.Timeout != 10*time.Second {
		t.Errorf("Expected timeout to be 10s, got %v", scraper.client.Timeout)
	}
}

func TestECBScraper_ParseXML(t *testing.T) {
	scraper := NewECBScraper("")

	validXML := `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="1.0820"/>
			<Cube currency="JPY" rate="160.58"/>
			<Cube currency="GBP" rate="0.8542"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`

	rates, err := scraper.parseXML([]byte(validXML))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Should have EUR + 3 currencies
	if len(rates) != 4 {
		t.Errorf("Expected 4 rates (including EUR), got %d", len(rates))
	}

	// EUR should always be 1.0
	if rates["EUR"] != 1.0 {
		t.Errorf("Expected EUR to be 1.0, got %f", rates["EUR"])
	}

	// Check specific rates
	if rates["USD"] != 1.0820 {
		t.Errorf("Expected USD to be 1.0820, got %f", rates["USD"])
	}

	if rates["JPY"] != 160.58 {
		t.Errorf("Expected JPY to be 160.58, got %f", rates["JPY"])
	}

	if rates["GBP"] != 0.8542 {
		t.Errorf("Expected GBP to be 0.8542, got %f", rates["GBP"])
	}
}

func TestECBScraper_ParseXML_Invalid(t *testing.T) {
	scraper := NewECBScraper("")

	tests := []struct {
		name string
		xml  string
	}{
		{
			name: "Invalid XML",
			xml:  `<invalid>xml`,
		},
		{
			name: "Empty XML",
			xml:  ``,
		},
		{
			name: "Negative rate",
			xml: `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="-1.0820"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`,
		},
		{
			name: "Zero rate",
			xml: `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
			<Cube currency="USD" rate="0"/>
		</Cube>
	</Cube>
</gesmes:Envelope>`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := scraper.parseXML([]byte(tt.xml))
			if err == nil {
				t.Error("Expected error but got none")
			}
		})
	}
}

func TestECBScraper_Fetch_Success(t *testing.T) {
	// Create mock HTTP server
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

	scraper := NewECBScraper(server.URL)
	ctx := context.Background()

	rates, err := scraper.Fetch(ctx)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if len(rates) != 3 { // EUR + USD + JPY
		t.Errorf("Expected 3 rates, got %d", len(rates))
	}

	if rates["EUR"] != 1.0 {
		t.Error("Expected EUR to be 1.0")
	}

	if rates["USD"] != 1.0820 {
		t.Error("Expected USD to be 1.0820")
	}
}

func TestECBScraper_Fetch_HTTPErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
	}{
		{"404 Not Found", http.StatusNotFound},
		{"500 Internal Server Error", http.StatusInternalServerError},
		{"503 Service Unavailable", http.StatusServiceUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
			}))
			defer server.Close()

			scraper := NewECBScraper(server.URL)
			ctx := context.Background()

			_, err := scraper.Fetch(ctx)
			if err == nil {
				t.Error("Expected error but got none")
			}
		})
	}
}

func TestECBScraper_Fetch_InvalidURL(t *testing.T) {
	scraper := NewECBScraper("http://invalid-url-that-does-not-exist-12345.com")
	ctx := context.Background()

	_, err := scraper.Fetch(ctx)
	if err == nil {
		t.Error("Expected error for invalid URL")
	}
}

func TestECBScraper_Fetch_ContextCancellation(t *testing.T) {
	// Create a server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	scraper := NewECBScraper(server.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	_, err := scraper.Fetch(ctx)
	if err == nil {
		t.Error("Expected context cancellation error")
	}
}

func TestECBScraper_Fetch_EmptyRates(t *testing.T) {
	// XML with no currency cubes
	emptyXML := `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<Cube>
		<Cube time="2024-02-15">
		</Cube>
	</Cube>
</gesmes:Envelope>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(emptyXML))
	}))
	defer server.Close()

	scraper := NewECBScraper(server.URL)
	ctx := context.Background()

	// Should still succeed because EUR is added
	rates, err := scraper.Fetch(ctx)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Should have at least EUR
	if len(rates) < 1 {
		t.Error("Expected at least EUR in rates")
	}

	if rates["EUR"] != 1.0 {
		t.Error("Expected EUR to be 1.0")
	}
}
