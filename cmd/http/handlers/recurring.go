package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type recurringCreateRequest struct {
	PayeeRef         string `json:"payee_ref"                    pattern:"^[0-9a-f]{32}$"          validate:"required,ref"`
	AccountRef       string `json:"account_ref"                  pattern:"^[0-9a-f]{32}$"          validate:"required,ref"`
	CategoryRef      string `json:"category_ref,omitempty"       pattern:"^[0-9a-f]{32}$"          validate:"omitempty,ref"`
	AmountMinor      string `json:"amount_minor"                 pattern:"^[+-]?[0-9]+$"           validate:"required,money"`
	Currency         string `json:"currency"                     maxLength:"3"                     minLength:"3"                validate:"required,currency"`
	Cadence          string `json:"cadence"                      validate:"required,cadence"`
	IntervalN        int    `json:"interval_n,omitempty"         validate:"omitempty,gte=1,lte=52"`
	DayOfMonth       int    `json:"day_of_month,omitempty"       validate:"omitempty,gte=1,lte=31"`
	BusinessDayShift string `json:"business_day_shift,omitempty" validate:"omitempty,shift"`
	NextDueOn        string `format:"date"                       json:"next_due_on"                validate:"required,datestr"`
	EndsOn           string `format:"date"                       json:"ends_on,omitempty"          validate:"omitempty,datestr"`
}

type recurringPatchRequest struct {
	AmountMinor *string `json:"amount_minor,omitempty" pattern:"^[+-]?[0-9]+$"             validate:"omitempty,money"`
	Cadence     *string `json:"cadence,omitempty"      validate:"omitempty,cadence"`
	IntervalN   *int    `json:"interval_n,omitempty"   validate:"omitempty,gte=1,lte=52"`
	DayOfMonth  *int    `json:"day_of_month,omitempty" validate:"omitempty,gte=1,lte=31"`
	NextDueOn   *string `format:"date"                 json:"next_due_on,omitempty"        validate:"omitempty,datestr"`
	EndsOn      *string `format:"date"                 json:"ends_on,omitempty"            validate:"omitempty,datestr"`
	State       *string `json:"state,omitempty"        validate:"omitempty,recurringstate"`
}

type recurringResponse struct {
	Ref              string `json:"ref"                    pattern:"^[0-9a-f]{32}$"`
	PayeeRef         string `json:"payee_ref"              pattern:"^[0-9a-f]{32}$"`
	AccountRef       string `json:"account_ref"            pattern:"^[0-9a-f]{32}$"`
	CategoryRef      string `json:"category_ref,omitempty" pattern:"^[0-9a-f]{32}$"`
	AmountMinor      string `json:"amount_minor"           pattern:"^[+-]?[0-9]+$"`
	Currency         string `json:"currency"               maxLength:"3"            minLength:"3"`
	Cadence          string `json:"cadence"`
	IntervalN        int    `json:"interval_n"`
	DayOfMonth       int    `json:"day_of_month,omitempty"`
	BusinessDayShift string `json:"business_day_shift"`
	NextDueOn        string `format:"date"                 json:"next_due_on"`
	EndsOn           string `format:"date"                 json:"ends_on,omitempty"`
	Origin           string `json:"origin"`
	State            string `json:"state"`
	CreatedAt        string `format:"date-time"            json:"created_at"`
}

// @Summary     Create a recurring rule
// @Description The worker queues a capture for each due rule and never posts an entry: an approval still writes the ledger.
// @Tags        recurring
// @Accept      json
// @Param       body body recurringCreateRequest true "the request body"
// @Produce     json
// @Success     201 {object} recurringResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody "unknown_reference"
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/recurring [post]
func (s *Server) CreateRecurring(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Recurring.Post")
	defer endSpan()

	var request recurringCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	amount, err := validating.Money(request.AmountMinor, "amount_minor")
	if err != nil {
		writeInvalid(w, err)

		return
	}

	nextDue, err := validating.Day(request.NextDueOn, "next_due_on")
	if err != nil {
		writeInvalid(w, err)

		return
	}

	if request.CategoryRef != "" && !s.categoryAccount(ctx, w, request.CategoryRef) {
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

// @Summary     Every recurring rule, soonest due first
// @Description `state` narrows to active or paused rules; a `* list` parameter widens with comma-separated values.
// @Tags        recurring
// @Produce     json
// @Param       query query string false "substring of the payee name"
// @Param       refs query string false "rule refs, comma-separated"
// @Param       state query string false "active or paused"
// @Param       cadence query string false "the rule interval kind"
// @Param       cursor query string false "return rules after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{recurring=[]recurringResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/recurring [get]
func (s *Server) ListRecurring(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Recurring.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, s.location, recurringFilter)
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

// @Summary     Steer a recurring rule
// @Description Absolute values only. Pausing is `state: paused`; the row and its journal entries stay.
// @Tags        recurring
// @Accept      json
// @Param       body body recurringPatchRequest true "the request body"
// @Produce     json
// @Param       ref path string true "rule ref"
// @Success     200 {object} recurringResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/recurring/{ref} [patch]
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

	parsed, err := validating.Day(raw, "day")
	if err != nil {
		return nil, err
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
		amount, err := validating.Money(*request.AmountMinor, "amount_minor")
		if err != nil {
			return err
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
		next, err := validating.Day(*request.NextDueOn, "next_due_on")
		if err != nil {
			return err
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
