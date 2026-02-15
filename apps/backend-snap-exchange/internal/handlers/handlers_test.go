package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/models"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/storage"
)

func setupTestHandler() (*Handler, *storage.RateStore) {
	store := storage.NewRateStore()
	handler := NewHandler(store)
	return handler, store
}

func TestHandler_GetAllRates_Success(t *testing.T) {
	handler, store := setupTestHandler()

	// Populate store
	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
		"JPY": 160.58,
	}
	store.UpdateRates(rates)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	handler.GetAllRates(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response models.AllRatesResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(response.Rates) != 3 {
		t.Errorf("Expected 3 rates, got %d", len(response.Rates))
	}

	if response.Base != "EUR" {
		t.Errorf("Expected base to be EUR, got %s", response.Base)
	}

	if response.Rates["USD"] != 1.0820 {
		t.Errorf("Expected USD rate to be 1.0820, got %f", response.Rates["USD"])
	}
}

func TestHandler_GetAllRates_EmptyStore(t *testing.T) {
	handler, _ := setupTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	handler.GetAllRates(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503, got %d", w.Code)
	}

	var response models.ErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Status != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503 in response, got %d", response.Status)
	}
}

func TestHandler_GetConversion_Success(t *testing.T) {
	handler, store := setupTestHandler()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
		"JPY": 160.58,
	}
	store.UpdateRates(rates)

	req := httptest.NewRequest(http.MethodGet, "/USD?to=EUR", nil)
	w := httptest.NewRecorder()

	handler.GetConversion(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response models.ConversionResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.From != "USD" {
		t.Errorf("Expected from to be USD, got %s", response.From)
	}

	if response.To != "EUR" {
		t.Errorf("Expected to to be EUR, got %s", response.To)
	}

	if response.Rate <= 0 {
		t.Error("Expected positive conversion rate")
	}
}

func TestHandler_GetConversion_InvalidCurrency(t *testing.T) {
	handler, store := setupTestHandler()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	}
	store.UpdateRates(rates)

	tests := []struct {
		name       string
		url        string
		expectCode int
	}{
		{
			name:       "Missing base currency",
			url:        "/?to=EUR",
			expectCode: http.StatusBadRequest,
		},
		{
			name:       "Missing to parameter",
			url:        "/USD",
			expectCode: http.StatusBadRequest,
		},
		{
			name:       "Invalid base format",
			url:        "/US?to=EUR",
			expectCode: http.StatusBadRequest,
		},
		{
			name:       "Invalid to format",
			url:        "/USD?to=EU",
			expectCode: http.StatusBadRequest,
		},
		{
			name:       "Non-existent currency",
			url:        "/XXX?to=EUR",
			expectCode: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()

			handler.GetConversion(w, req)

			if w.Code != tt.expectCode {
				t.Errorf("Expected status %d, got %d", tt.expectCode, w.Code)
			}
		})
	}
}

func TestHandler_GetConversion_EmptyStore(t *testing.T) {
	handler, _ := setupTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/USD?to=EUR", nil)
	w := httptest.NewRecorder()

	handler.GetConversion(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503, got %d", w.Code)
	}
}

func TestHandler_GetConversion_CaseInsensitive(t *testing.T) {
	handler, store := setupTestHandler()

	rates := map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	}
	store.UpdateRates(rates)

	// Test lowercase input
	req := httptest.NewRequest(http.MethodGet, "/usd?to=eur", nil)
	w := httptest.NewRecorder()

	handler.GetConversion(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response models.ConversionResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Response should be uppercase
	if response.From != "USD" {
		t.Errorf("Expected from to be USD, got %s", response.From)
	}

	if response.To != "EUR" {
		t.Errorf("Expected to to be EUR, got %s", response.To)
	}
}

func TestHandler_HealthCheck(t *testing.T) {
	tests := []struct {
		name           string
		setupStore     func(*storage.RateStore)
		expectedStatus string
		expectedCount  int
	}{
		{
			name: "Healthy with rates",
			setupStore: func(s *storage.RateStore) {
				s.UpdateRates(map[string]float64{
					"EUR": 1.0,
					"USD": 1.0820,
				})
			},
			expectedStatus: "healthy",
			expectedCount:  2,
		},
		{
			name:           "Degraded without rates",
			setupStore:     func(s *storage.RateStore) {},
			expectedStatus: "degraded",
			expectedCount:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, store := setupTestHandler()
			tt.setupStore(store)

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			w := httptest.NewRecorder()

			handler.HealthCheck(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("Expected status 200, got %d", w.Code)
			}

			var response models.HealthResponse
			if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
				t.Fatalf("Failed to decode response: %v", err)
			}

			if response.Status != tt.expectedStatus {
				t.Errorf("Expected status %s, got %s", tt.expectedStatus, response.Status)
			}

			if response.RatesCount != tt.expectedCount {
				t.Errorf("Expected count %d, got %d", tt.expectedCount, response.RatesCount)
			}
		})
	}
}

func TestHandler_HealthCheck_LastUpdated(t *testing.T) {
	handler, store := setupTestHandler()

	before := time.Now()
	store.UpdateRates(map[string]float64{"EUR": 1.0})
	after := time.Now()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	var response models.HealthResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.LastUpdated.Before(before) || response.LastUpdated.After(after) {
		t.Error("LastUpdated timestamp is not within expected range")
	}
}

func TestHandler_Routes(t *testing.T) {
	handler, _ := setupTestHandler()

	mux := handler.Routes()
	if mux == nil {
		t.Fatal("Routes() returned nil")
	}

	// Test that routes are registered by making requests
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{"Health endpoint", http.MethodGet, "/health"},
		{"Metrics endpoint", http.MethodGet, "/metrics"},
		{"Root endpoint", http.MethodGet, "/"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			mux.ServeHTTP(w, req)

			// Should not return 404
			if w.Code == http.StatusNotFound {
				t.Errorf("Route %s %s returned 404", tt.method, tt.path)
			}
		})
	}
}

func TestHandler_ContentType(t *testing.T) {
	handler, store := setupTestHandler()

	store.UpdateRates(map[string]float64{
		"EUR": 1.0,
		"USD": 1.0820,
	})

	tests := []struct {
		name    string
		handler func(http.ResponseWriter, *http.Request)
		path    string
	}{
		{"GetAllRates", handler.GetAllRates, "/"},
		{"GetConversion", handler.GetConversion, "/USD?to=EUR"},
		{"HealthCheck", handler.HealthCheck, "/health"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			w := httptest.NewRecorder()

			tt.handler(w, req)

			contentType := w.Header().Get("Content-Type")
			if contentType != "application/json" {
				t.Errorf("Expected Content-Type to be application/json, got %s", contentType)
			}
		})
	}
}
