package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/binding"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
)

type pathRefRequest struct {
	Ref string `path:"ref" validate:"required,ref"`
}

func bindBody(w http.ResponseWriter, r *http.Request, limit int64, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_json", err.Error())

		return false
	}

	if err := validating.Struct(target); err != nil {
		writeInvalid(w, err)

		return false
	}

	return true
}

func bindQuery(r *http.Request, target any) error {
	values := r.URL.Query()

	if err := binding.Fill(target, "query", func(name string) (string, bool) {
		value := values.Get(name)

		return value, value != ""
	}); err != nil {
		return err
	}

	return validateBound(target)
}

func bindPath(r *http.Request, target any) error {
	if err := binding.Fill(target, "path", func(name string) (string, bool) {
		value := strings.TrimSpace(r.PathValue(name))

		return value, value != ""
	}); err != nil {
		return err
	}

	return validateBound(target)
}

func validateBound(target any) error {
	if err := validating.Struct(target); err != nil {
		return fmt.Errorf("invalid binding: %w", err)
	}

	return nil
}

func writeInvalid(w http.ResponseWriter, err error) {
	if code, reasons, ok := validating.Invalid(err); ok {
		httpx.WriteError(w, http.StatusUnprocessableEntity, code, strings.Join(reasons, "; "))

		return
	}

	httpx.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
}
