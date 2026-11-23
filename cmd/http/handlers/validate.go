package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// validate is the one validator for the process: rules are registered once, and every
// request struct declares its constraints as tags instead of doing the checks by hand.
//
// Domain invariants that need arithmetic — postings summing to zero, a rate parsing as
// a big.Rat — are not tags and stay in the entity layer. Everything that is "this
// field must look like X" is a tag.
var validate = newValidator() //nolint:gochecknoglobals // one registry, built once

// newValidator registers the project's custom rules.
func newValidator() *validator.Validate {
	instance := validator.New(validator.WithRequiredStructEnabled())

	rules := map[string]validator.Func{
		// currency: an ISO 4217 code this build knows.
		"currency": func(field validator.FieldLevel) bool {
			_, err := entity.CurrencyByCode(field.Field().String())

			return err == nil
		},
		// money: a signed integer string in minor units, never a float.
		"money": func(field validator.FieldLevel) bool {
			_, err := strconv.ParseInt(strings.TrimSpace(field.Field().String()), 10, 64)

			return err == nil
		},
		// datestr: the wire format for a calendar day.
		"datestr": func(field validator.FieldLevel) bool {
			raw := strings.TrimSpace(field.Field().String())
			if raw == "" {
				return false
			}

			_, err := time.Parse(constant.DateLayout, raw)

			return err == nil
		},
		// rate: an exact decimal, the only shape a currency rate may take.
		"rate": func(field validator.FieldLevel) bool {
			_, err := entity.ParseRate(field.Field().String())

			return err == nil
		},
		// capturekind: one of the channels the queue accepts.
		"capturekind": func(field validator.FieldLevel) bool {
			switch field.Field().String() {
			case constant.CaptureKindShare, constant.CaptureKindImage,
				constant.CaptureKindEmail, constant.CaptureKindStatement,
				constant.CaptureKindRecurring, constant.CaptureKindManual:
				return true
			default:
				return false
			}
		},
		// source: the channel a ledger entry came from.
		"source": func(field validator.FieldLevel) bool {
			switch field.Field().String() {
			case constant.EntrySourceManual, constant.EntrySourceShare, constant.EntrySourceEmail,
				constant.EntrySourceStatement, constant.EntrySourceRecurring,
				constant.EntrySourceAdjustment:
				return true
			default:
				return false
			}
		},
		// capturestatus: one of the queue's states.
		"capturestatus": func(field validator.FieldLevel) bool {
			switch field.Field().String() {
			case constant.CaptureStatusExtracting, constant.CaptureStatusPending,
				constant.CaptureStatusDuplicate, constant.CaptureStatusApproved,
				constant.CaptureStatusRejected, constant.CaptureStatusFailed:
				return true
			default:
				return false
			}
		},
	}

	for tag, rule := range rules {
		// Registration only fails on a duplicate tag or a nil function; both are
		// programming errors caught the first time this runs.
		_ = instance.RegisterValidation(tag, rule)
	}

	return instance
}

// validationFailure promotes one field failure to the error code a client branches
// on. A rejected currency is not a generic bad request: the domain has a name for it,
// and the tag must not swallow it.
type validationFailure struct {
	field string
	tag   string
	code  string
}

var validationCodes = []validationFailure{ //nolint:gochecknoglobals // read-only table
	{field: "Currency", tag: "currency", code: "unknown_currency"},
	{field: "Kind", tag: "capturekind", code: "unknown_capture_kind"},
	{field: "Postings", tag: "min", code: "invalid_postings"},
	{field: "FXRate", tag: "rate", code: "invalid_rate"},
}

// pathIDRequest is the shape every /{id} route binds: one positive integer.
type pathIDRequest struct {
	ID int64 `path:"id" validate:"required,gt=0"`
}

// bindBody reads a bounded JSON body into target and validates it. It writes the
// response itself and reports whether the handler may continue, so no handler repeats
// the decode-validate-answer sequence.
func bindBody(w http.ResponseWriter, r *http.Request, limit int64, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)

	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_json", err.Error())

		return false
	}

	if err := validate.Struct(target); err != nil {
		writeInvalid(w, err)

		return false
	}

	return true
}

// bindQuery fills a struct from the query string and validates it. Field tags:
//
//	Limit int `query:"limit" validate:"omitempty,gte=0,lte=200"`
func bindQuery(r *http.Request, target any) error {
	values := r.URL.Query()

	if err := fillFrom(target, "query", func(name string) (string, bool) {
		value := values.Get(name)

		return value, value != ""
	}); err != nil {
		return err
	}

	return validateBound(target)
}

// bindPath fills a struct from the route's path values and validates it.
func bindPath(r *http.Request, target any) error {
	if err := fillFrom(target, "path", func(name string) (string, bool) {
		value := strings.TrimSpace(r.PathValue(name))

		return value, value != ""
	}); err != nil {
		return err
	}

	return validateBound(target)
}

// validateBound is the last step of bindQuery and bindPath. A wrapped failure still
// answers with the field envelope: writeInvalid unwraps it.
func validateBound(target any) error {
	if err := validate.Struct(target); err != nil {
		return fmt.Errorf("invalid binding: %w", err)
	}

	return nil
}

// fillFrom copies raw strings onto the struct's string, integer and time fields.
func fillFrom(target any, tag string, lookup func(string) (string, bool)) error {
	inspect := reflectValue(target)
	if inspect.Kind() != kindPtr || inspect.Elem().Kind() != kindStruct {
		return errors.New("bind target must be a pointer to a struct")
	}

	element := inspect.Elem()

	for index := range element.NumField() {
		field := element.Type().Field(index)
		name := field.Tag.Get(tag)

		if name == "" {
			continue
		}

		raw, ok := lookup(name)
		if !ok {
			continue
		}

		if err := setField(element.Field(index), raw); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
	}

	return nil
}

// writeInvalid turns a validation failure into the project's error envelope: one code,
// one message naming the fields, no HTTP-layer detail leaked.
func writeInvalid(w http.ResponseWriter, err error) {
	var invalid validator.ValidationErrors

	if errors.As(err, &invalid) {
		code := "invalid_request"
		reasons := make([]string, 0, len(invalid))

		for _, fieldErr := range invalid {
			code = promotedCode(fieldErr, code)
			reasons = append(reasons, fmt.Sprintf("%s failed %s", fieldErr.Field(), fieldErr.Tag()))
		}

		httpx.WriteError(w, http.StatusUnprocessableEntity, code, strings.Join(reasons, "; "))

		return
	}

	httpx.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
}

// promotedCode returns the domain code a field failure deserves, or fallback.
func promotedCode(fieldErr validator.FieldError, fallback string) string {
	for _, failure := range validationCodes {
		if failure.field == fieldErr.Field() && failure.tag == fieldErr.Tag() {
			return failure.code
		}
	}

	return fallback
}
