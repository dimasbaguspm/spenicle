package ecb_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
)

const dailyXML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender>
    <gesmes:name>European Central Bank</gesmes:name>
  </gesmes:Sender>
  <Cube>
    <Cube time="2026-11-20">
      <Cube currency="USD" rate="1.1598"/>
      <Cube currency="JPY" rate="171.53"/>
      <Cube currency="IDR" rate="17420.11"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

func TestDailyParsesTheReferenceRates(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		_, _ = w.Write([]byte(dailyXML))
	}))
	t.Cleanup(server.Close)

	fetchedAt := time.Date(2026, time.November, 20, 15, 30, 0, 0, time.UTC)

	client, err := ecb.New(server.URL, 5*time.Second, fixedClock{at: fetchedAt})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	rates, err := client.Daily(t.Context())
	if err != nil {
		t.Fatalf("daily: %v", err)
	}

	if len(rates) != 3 {
		t.Fatalf("got %d rates, want 3", len(rates))
	}

	first := rates[0]
	if first.Base != "EUR" || first.Quote != "USD" || first.Rate != "1.1598" {
		t.Fatalf("first rate = %+v", first)
	}

	if got := first.OnDate.Format("2006-01-02"); got != "2026-11-20" {
		t.Fatalf("on date = %q", got)
	}

	if first.Source != "ecb" {
		t.Fatalf("source = %q", first.Source)
	}

	if !first.FetchedAt.Equal(fetchedAt) {
		t.Fatalf("fetched at = %s, want %s", first.FetchedAt, fetchedAt)
	}
}

func TestDailyReportsAFailedFetch(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	t.Cleanup(server.Close)

	client, err := ecb.New(server.URL, 5*time.Second, fixedClock{at: time.Now()})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	if _, err := client.Daily(t.Context()); err == nil {
		t.Fatal("expected an error for a 503 answer")
	}
}

func TestNewRejectsAnEmptyEndpoint(t *testing.T) {
	t.Parallel()

	if _, err := ecb.New("  ", time.Second, fixedClock{}); err == nil {
		t.Fatal("expected an error for an empty endpoint")
	}
}

func TestDailyHonoursTheCallerContext(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))
	t.Cleanup(server.Close)

	client, err := ecb.New(server.URL, 5*time.Second, fixedClock{at: time.Now()})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	ctx, cancel := context.WithTimeout(t.Context(), 50*time.Millisecond)
	defer cancel()

	if _, err := client.Daily(ctx); err == nil {
		t.Fatal("expected the request to be cancelled")
	}
}
