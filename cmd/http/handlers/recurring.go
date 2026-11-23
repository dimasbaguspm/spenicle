package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type recurringCreateRequest struct {
	PayeeRef         string `json:"payee_ref"                    validate:"required,ref"`
	AccountRef       string `json:"account_ref"                  validate:"required,ref"`
	CategoryRef      string `json:"category_ref,omitempty"       validate:"omitempty,ref"`
	AmountMinor      string `json:"amount_minor"                 validate:"required,money"`
	Currency         string `json:"currency"                     validate:"required,currency"`
	Cadence          string `json:"cadence"                      validate:"required,cadence"`
	IntervalN        int    `json:"interval_n,omitempty"         validate:"omitempty,gte=1,lte=52"`
	DayOfMonth       int    `json:"day_of_month,omitempty"       validate:"omitempty,gte=1,lte=31"`
	BusinessDayShift string `json:"business_day_shift,omitempty" validate:"omitempty,shift"`
	NextDueOn        string `json:"next_due_on"                  validate:"required,datestr"`
	EndsOn           string `json:"ends_on,omitempty"            validate:"omitempty,datestr"`
}

type recurringPatchRequest struct {
	AmountMinor *string `json:"amount_minor,omitempty" validate:"omitempty,money"`
	Cadence     *string `json:"cadence,omitempty"      validate:"omitempty,cadence"`
	IntervalN   *int    `json:"interval_n,omitempty"   validate:"omitempty,gte=1,lte=52"`
	DayOfMonth  *int    `json:"day_of_month,omitempty" validate:"omitempty,gte=1,lte=31"`
	NextDueOn   *string `json:"next_due_on,omitempty"  validate:"omitempty,datestr"`
	EndsOn      *string `json:"ends_on,omitempty"      validate:"omitempty,datestr"`
	State       *string `json:"state,omitempty"        validate:"omitempty,recurringstate"`
}

type recurringResponse struct {
	Ref              string `json:"ref"`
	PayeeRef         string `json:"payee_ref"`
	AccountRef       string `json:"account_ref"`
	CategoryRef      string `json:"category_ref,omitempty"`
	AmountMinor      string `json:"amount_minor"`
	Currency         string `json:"currency"`
	Cadence          string `json:"cadence"`
	IntervalN        int    `json:"interval_n"`
	DayOfMonth       int    `json:"day_of_month,omitempty"`
	BusinessDayShift string `json:"business_day_shift"`
	NextDueOn        string `json:"next_due_on"`
	EndsOn           string `json:"ends_on,omitempty"`
	Origin           string `json:"origin"`
	State            string `json:"state"`
	CreatedAt        string `json:"created_at"`
}

func (s *Server) CreateRecurring(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Recurring.Post")
	defer endSpan()

	var request recurringCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	amount, err := strconv.ParseInt(request.AmountMinor, 10, 64)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	nextDue, err := time.Parse(constant.DateLayout, request.NextDueOn)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	rule := entity.Recurring{
		PayeeRef:         request.PayeeRef,
		AccountRef:       request.AccountRef,
		CategoryRef:      request.CategoryRef,
		AmountMinor:      amount,
		Currency:         request.Currency,
		Cadence:          request.Cadence,
		IntervalN:        orOne(request.IntervalN),
		DayOfMonth:       request.DayOfMonth,
		BusinessDayShift: stringOr(request.BusinessDayShift, constant.ShiftNone),
		NextDueOn:        nextDue,
		State:            constant.RecurringStateActive,
	}

	if rule.EndsOn, err = parseOptionalDay(request.EndsOn); err != nil {
		writeInvalid(w, err)

		return
	}

	created, err := s.deps.Recurring.CreateRecurring(ctx, rule)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toRecurringResponse(created))
}

func (s *Server) ListRecurring(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Recurring.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, recurringFilter)
	if !ok {
		return
	}

	writeList(
		ctx, w, s, "recurring", filter.Limit,
		func() ([]entity.Recurring, error) { return s.deps.Recurring.ListRecurring(ctx, filter) },
		func(rule entity.Recurring) string { return rule.Ref },
		toRecurringResponse,
	)
}

func (s *Server) PatchRecurring(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Recurring.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request recurringPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	rule, found, err := s.deps.Recurring.RecurringByRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no recurring rule "+path.Ref)

		return
	}

	if patchErr := applyRecurringPatch(&rule, request); patchErr != nil {
		writeInvalid(w, patchErr)

		return
	}

	updated, err := s.deps.Recurring.UpdateRecurring(ctx, rule)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toRecurringResponse(updated))
}

func toRecurringResponse(rule entity.Recurring) recurringResponse {
	out := recurringResponse{
		Ref:              rule.Ref,
		PayeeRef:         rule.PayeeRef,
		AccountRef:       rule.AccountRef,
		CategoryRef:      rule.CategoryRef,
		AmountMinor:      strconv.FormatInt(rule.AmountMinor, 10),
		Currency:         rule.Currency,
		Cadence:          rule.Cadence,
		IntervalN:        rule.IntervalN,
		DayOfMonth:       rule.DayOfMonth,
		BusinessDayShift: rule.BusinessDayShift,
		NextDueOn:        rule.NextDueOn.Format(constant.DateLayout),
		Origin:           rule.Origin,
		State:            rule.State,
		CreatedAt:        rule.CreatedAt.Format(constant.TimestampLayout),
	}

	if rule.EndsOn != nil {
		out.EndsOn = rule.EndsOn.Format(constant.DateLayout)
	}

	return out
}

func parseOptionalDay(raw string) (*time.Time, error) {
	if raw == "" {
		return nil, nil //nolint:nilnil // an absent date is not an error
	}

	parsed, err := time.Parse(constant.DateLayout, raw)
	if err != nil {
		return nil, fmt.Errorf("parse %q as a day: %w", raw, err)
	}

	return &parsed, nil
}

func stringOr(value, fallback string) string {
	if value == "" {
		return fallback
	}

	return value
}

func orOne(value int) int {
	if value == 0 {
		return 1
	}

	return value
}

func applyRecurringPatch(rule *entity.Recurring, request recurringPatchRequest) error {
	if request.AmountMinor != nil {
		amount, err := strconv.ParseInt(*request.AmountMinor, 10, 64)
		if err != nil {
			return fmt.Errorf("parse amount_minor: %w", err)
		}

		rule.AmountMinor = amount
	}

	if request.Cadence != nil {
		rule.Cadence = *request.Cadence
	}

	if request.IntervalN != nil {
		rule.IntervalN = *request.IntervalN
	}

	if request.DayOfMonth != nil {
		rule.DayOfMonth = *request.DayOfMonth
	}

	if request.State != nil {
		rule.State = *request.State
	}

	if request.NextDueOn != nil {
		next, err := time.Parse(constant.DateLayout, *request.NextDueOn)
		if err != nil {
			return fmt.Errorf("parse next_due_on: %w", err)
		}

		rule.NextDueOn = next
	}

	if request.EndsOn != nil {
		ends, err := parseOptionalDay(*request.EndsOn)
		if err != nil {
			return err
		}

		rule.EndsOn = ends
	}

	return nil
}
