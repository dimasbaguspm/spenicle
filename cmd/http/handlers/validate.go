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

var validate = newValidator() //nolint:gochecknoglobals // one registry, built once

func newValidator() *validator.Validate {
	instance := validator.New(validator.WithRequiredStructEnabled())

	rules := map[string]validator.Func{
		"currency": func(field validator.FieldLevel) bool {
			_, err := entity.CurrencyByCode(field.Field().String())

			return err == nil
		},
		"money": func(field validator.FieldLevel) bool {
			_, err := strconv.ParseInt(strings.TrimSpace(field.Field().String()), 10, 64)

			return err == nil
		},
		"datestr": func(field validator.FieldLevel) bool {
			raw := strings.TrimSpace(field.Field().String())
			if raw == "" {
				return false
			}

			_, err := time.Parse(constant.DateLayout, raw)

			return err == nil
		},
		"rate": func(field validator.FieldLevel) bool {
			_, err := entity.ParseRate(field.Field().String())

			return err == nil
		},
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
		"ref": validRef,
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
		_ = instance.RegisterValidation(tag, rule)
	}

	return instance
}

type validationFailure struct {
	field string
	tag   string
	code  string
}

var validationCodes = []validationFailure{ //nolint:gochecknoglobals // read-only table
	{field: "Currency", tag: "currency", code: "unknown_currency"},
	{field: "Base", tag: "currency", code: "unknown_currency"},
	{field: "Quote", tag: "currency", code: "unknown_currency"},
	{field: "Kind", tag: "capturekind", code: "unknown_capture_kind"},
	{field: "Postings", tag: "min", code: "invalid_postings"},
	{field: "FXRate", tag: "rate", code: "invalid_rate"},
}

const refLength = 32

type pathRefRequest struct {
	Ref string `path:"ref" validate:"required,ref"`
}

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

func bindPath(r *http.Request, target any) error {
	if err := fillFrom(target, "path", func(name string) (string, bool) {
		value := strings.TrimSpace(r.PathValue(name))

		return value, value != ""
	}); err != nil {
		return err
	}

	return validateBound(target)
}

func validateBound(target any) error {
	if err := validate.Struct(target); err != nil {
		return fmt.Errorf("invalid binding: %w", err)
	}

	return nil
}

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

func promotedCode(fieldErr validator.FieldError, fallback string) string {
	for _, failure := range validationCodes {
		if failure.field == fieldErr.Field() && failure.tag == fieldErr.Tag() {
			return failure.code
		}
	}

	return fallback
}

func validRef(field validator.FieldLevel) bool {
	raw := strings.TrimSpace(field.Field().String())
	if len(raw) != refLength {
		return false
	}

	for _, char := range raw {
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') {
			return false
		}
	}

	return true
}
