// Package validating owns the one validator registry the process uses: the custom
// rules, the struct tags they back and the translation from a field failure to the
// domain code a client branches on. It imports no HTTP package, so the worker can
// validate a value without pulling the driver in.
package validating

import (
	"errors"
	"fmt"

	"github.com/go-playground/validator/v10"
)

var instance = newValidator() //nolint:gochecknoglobals // one registry, built once

func Struct(target any) error {
	if err := instance.Struct(target); err != nil {
		return fmt.Errorf("validation: %w", err)
	}

	return nil
}

func Var(value any, tag string) error {
	if err := instance.Var(value, tag); err != nil {
		return fmt.Errorf("validation %s: %w", tag, err)
	}

	return nil
}

func Invalid(err error) (string, []string, bool) {
	var failures validator.ValidationErrors
	if !errors.As(err, &failures) {
		return "", nil, false
	}

	code := "invalid_request"
	reasons := make([]string, 0, len(failures))

	for _, failure := range failures {
		code = promotedCode(failure, code)
		reasons = append(reasons, fmt.Sprintf("%s failed %s", failure.Field(), failure.Tag()))
	}

	return code, reasons, true
}

func newValidator() *validator.Validate {
	built := validator.New(validator.WithRequiredStructEnabled())

	for tag, rule := range rules {
		_ = built.RegisterValidation(tag, rule)
	}

	return built
}

type validationFailure struct {
	field string
	tag   string
	code  string
}

var validationCodes = []validationFailure{ //nolint:gochecknoglobals // read-only table
	{field: "Currency", tag: tagCurrency, code: "unknown_currency"},
	{field: "Base", tag: tagCurrency, code: "unknown_currency"},
	{field: "Quote", tag: tagCurrency, code: "unknown_currency"},
	{field: "Kind", tag: "capturekind", code: "unknown_capture_kind"},
	{field: "Postings", tag: "min", code: "invalid_postings"},
	{field: "FXRate", tag: "rate", code: "invalid_rate"},
}

func promotedCode(failure validator.FieldError, fallback string) string {
	for _, code := range validationCodes {
		if code.field == failure.Field() && code.tag == failure.Tag() {
			return code.code
		}
	}

	return fallback
}
