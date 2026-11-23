package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"

	"github.com/dimasbaguspm/spenicle/internal/domain"
	"github.com/dimasbaguspm/spenicle/internal/usecase/ledger"
)

const maxBodyBytes = 1 << 20

// observe starts a span per request and records the outcome on it.
func (s *Server) observe(next http.Handler) http.Handler {
	tracer := otel.Tracer("spenicle/http")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, span := tracer.Start(r.Context(), r.Method+" "+r.URL.Path)
		defer span.End()

		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r.WithContext(ctx))

		span.SetAttributes(
			attribute.String("http.request.method", r.Method),
			attribute.String("url.path", r.URL.Path),
			attribute.Int("http.response.status_code", rec.status),
		)
		if rec.status >= http.StatusInternalServerError {
			span.SetStatus(codes.Error, http.StatusText(rec.status))
		}
	})
}

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	var body errorBody
	body.Error.Code = code
	body.Error.Message = message
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type healthResponse struct {
	Status        string `json:"status"`
	SchemaVersion int    `json:"schema_version"`
	AppSecret     string `json:"app_secret"`
	BaseCurrency  string `json:"base_currency"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	version, err := s.deps.Health.SchemaVersion(ctx)
	if err == nil {
		err = s.deps.Health.Ping(ctx)
	}
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "degraded", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, healthResponse{
		Status:        "ok",
		SchemaVersion: version,
		AppSecret:     s.deps.Sealer.Fingerprint(),
		BaseCurrency:  s.deps.BaseCurrency,
	})
}

type postingRequest struct {
	AccountID   int64  `json:"account_id"`
	AmountMinor string `json:"amount_minor"`
	FXRate      string `json:"fx_rate,omitempty"`
	FXRateDate  string `json:"fx_rate_date,omitempty"`
}

type postEntryRequest struct {
	ClientID   string           `json:"client_id,omitempty"`
	OccurredOn string           `json:"occurred_on"`
	PayeeID    *int64           `json:"payee_id,omitempty"`
	Note       string           `json:"note,omitempty"`
	Currency   string           `json:"currency"`
	Source     string           `json:"source,omitempty"`
	Postings   []postingRequest `json:"postings"`
}

type postingResponse struct {
	AccountID       int64  `json:"account_id"`
	AmountMinor     string `json:"amount_minor"`
	BaseAmountMinor string `json:"base_amount_minor"`
	FXRate          string `json:"fx_rate"`
	FXSource        string `json:"fx_source"`
}

type entryResponse struct {
	ID         int64             `json:"id"`
	OccurredOn string            `json:"occurred_on"`
	Currency   string            `json:"currency"`
	Source     string            `json:"source"`
	Note       string            `json:"note,omitempty"`
	Postings   []postingResponse `json:"postings"`
}

func (s *Server) handlePostEntry(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	var req postEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	in, err := toPostInput(req)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())
		return
	}

	entry, created, err := s.deps.Ledger.Post(r.Context(), in)
	if err != nil {
		status, code := classify(err)
		writeError(w, status, code, err.Error())
		return
	}

	// A replayed client id returns the stored entry untouched: 200, not 201.
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, toEntryResponse(entry))
}

func toPostInput(req postEntryRequest) (ledger.PostInput, error) {
	occurred, err := time.Parse("2006-01-02", strings.TrimSpace(req.OccurredOn))
	if err != nil {
		return ledger.PostInput{}, errors.New("occurred_on must be YYYY-MM-DD")
	}

	postings := make([]ledger.PostingInput, 0, len(req.Postings))
	for _, p := range req.Postings {
		amount, err := strconv.ParseInt(strings.TrimSpace(p.AmountMinor), 10, 64)
		if err != nil {
			return ledger.PostInput{}, errors.New("amount_minor must be an integer string")
		}
		postings = append(postings, ledger.PostingInput{
			AccountID:   p.AccountID,
			AmountMinor: amount,
			FXRate:      p.FXRate,
			FXRateDate:  p.FXRateDate,
		})
	}

	return ledger.PostInput{
		ClientID:   req.ClientID,
		OccurredOn: occurred,
		PayeeID:    req.PayeeID,
		Note:       req.Note,
		Currency:   req.Currency,
		Source:     req.Source,
		Postings:   postings,
	}, nil
}

func toEntryResponse(e domain.Entry) entryResponse {
	out := entryResponse{
		ID:         e.ID,
		OccurredOn: e.OccurredOn.Format("2006-01-02"),
		Currency:   e.Currency,
		Source:     e.Source,
		Note:       e.Note,
	}
	for _, p := range e.Postings {
		out.Postings = append(out.Postings, postingResponse{
			AccountID:       p.AccountID,
			AmountMinor:     strconv.FormatInt(p.AmountMinor, 10),
			BaseAmountMinor: strconv.FormatInt(p.BaseAmountMinor, 10),
			FXRate:          p.FXRate,
			FXSource:        p.FXSource,
		})
	}
	return out
}

// classify maps domain errors onto HTTP without leaking internals.
func classify(err error) (int, string) {
	switch {
	case errors.Is(err, domain.ErrZeroSum):
		return http.StatusUnprocessableEntity, "postings_not_balanced"
	case errors.Is(err, domain.ErrInvalidPostings):
		return http.StatusUnprocessableEntity, "invalid_postings"
	case errors.Is(err, domain.ErrUnknownCurrency):
		return http.StatusUnprocessableEntity, "unknown_currency"
	case errors.Is(err, domain.ErrInvalidRate), errors.Is(err, domain.ErrInvalidAmount):
		return http.StatusUnprocessableEntity, "invalid_rate"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}
