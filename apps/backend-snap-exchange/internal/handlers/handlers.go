package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/models"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/storage"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Handler struct {
	store *storage.RateStore
}

func NewHandler(store *storage.RateStore) *Handler {
	return &Handler{
		store: store,
	}
}

// GetAllRates returns all available currency rates
func (h *Handler) GetAllRates(w http.ResponseWriter, r *http.Request) {
	// Check if store is empty
	if h.store.IsEmpty() {
		h.sendError(w, "Service unavailable: rates not loaded yet", http.StatusServiceUnavailable)
		return
	}

	rates := h.store.GetAllRates()

	response := models.AllRatesResponse{
		Rates:       rates,
		Base:        h.store.GetAnchor(),
		LastUpdated: h.store.GetLastUpdated(),
	}

	h.sendJSON(w, response, http.StatusOK)
}

// GetConversion calculates and returns the conversion rate between two currencies
func (h *Handler) GetConversion(w http.ResponseWriter, r *http.Request) {
	// Check if store is empty
	if h.store.IsEmpty() {
		h.sendError(w, "Service unavailable: rates not loaded yet", http.StatusServiceUnavailable)
		return
	}

	// Extract base currency from path
	base := strings.TrimPrefix(r.URL.Path, "/")
	if base == "" {
		h.sendError(w, "Base currency is required", http.StatusBadRequest)
		return
	}

	// Validate base currency format (3 uppercase letters)
	base = strings.ToUpper(base)
	if len(base) != 3 {
		h.sendError(w, "Invalid currency code format", http.StatusBadRequest)
		return
	}

	// Extract target currency from query parameter
	target := r.URL.Query().Get("to")
	if target == "" {
		h.sendError(w, "Target currency parameter 'to' is required", http.StatusBadRequest)
		return
	}

	target = strings.ToUpper(target)
	if len(target) != 3 {
		h.sendError(w, "Invalid target currency code format", http.StatusBadRequest)
		return
	}

	// Calculate conversion rate
	rate, err := h.store.ConvertRate(base, target)
	if err != nil {
		slog.Error("Conversion failed", "err", err, "from", base, "to", target)
		h.sendError(w, err.Error(), http.StatusNotFound)
		return
	}

	response := models.ConversionResponse{
		From:        base,
		To:          target,
		Rate:        rate,
		Base:        h.store.GetAnchor(),
		LastUpdated: h.store.GetLastUpdated(),
	}

	h.sendJSON(w, response, http.StatusOK)
}

// HealthCheck returns the health status of the service
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	rates := h.store.GetAllRates()

	status := "healthy"
	if len(rates) == 0 {
		status = "degraded"
	}

	response := models.HealthResponse{
		Status:      status,
		RatesCount:  len(rates),
		LastUpdated: h.store.GetLastUpdated(),
	}

	h.sendJSON(w, response, http.StatusOK)
}

// Routes sets up HTTP routes
func (h *Handler) Routes() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.HealthCheck)
	mux.Handle("GET /metrics", promhttp.Handler())
	mux.HandleFunc("GET /{base}", h.GetConversion)
	mux.HandleFunc("GET /", h.GetAllRates)

	return mux
}

// sendJSON is a helper to send JSON responses
func (h *Handler) sendJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("Failed to encode JSON response", "err", err)
	}
}

// sendError is a helper to send error responses
func (h *Handler) sendError(w http.ResponseWriter, message string, status int) {
	response := models.ErrorResponse{
		Error:  message,
		Status: status,
	}

	h.sendJSON(w, response, status)
}
