package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type payeeCreateRequest struct {
	Name               string `json:"name"                 validate:"required,max=80"`
	DefaultAccountRef  string `json:"default_account_ref"  validate:"omitempty,ref"`
	DefaultCategoryRef string `json:"default_category_ref" validate:"omitempty,ref"`
}

type payeePatchRequest struct {
	Name               *string `json:"name,omitempty"                 validate:"omitempty,max=80"`
	DefaultAccountRef  *string `json:"default_account_ref,omitempty"  validate:"omitempty,ref"`
	DefaultCategoryRef *string `json:"default_category_ref,omitempty" validate:"omitempty,ref"`
	Archived           *bool   `json:"archived,omitempty"`
}

type payeeResponse struct {
	Ref                string `json:"ref"`
	Name               string `json:"name"`
	DefaultAccountRef  string `json:"default_account_ref,omitempty"`
	DefaultCategoryRef string `json:"default_category_ref,omitempty"`
	Archived           bool   `json:"archived"`
	CreatedAt          string `json:"created_at"`
}

func (s *Server) CreatePayee(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Payees.Post")
	defer endSpan()

	var request payeeCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	payee := entity.Payee{Name: request.Name}

	if !s.fillPayeeRefs(ctx, w, &payee, request.DefaultAccountRef, request.DefaultCategoryRef) {
		return
	}

	created, err := s.deps.Payees.CreatePayee(ctx, payee)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toPayeeResponse(created))
}

func (s *Server) PatchPayee(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Payees.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request payeePatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	payee, found, err := s.deps.Payees.PayeeByRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no payee "+path.Ref)

		return
	}

	if request.Name != nil {
		payee.Name = *request.Name
	}

	if request.Archived != nil {
		payee.ArchivedAt = archivedAt(*request.Archived)
	}

	if request.DefaultAccountRef != nil {
		if !s.fillPayeeRefs(ctx, w, &payee, *request.DefaultAccountRef, "") {
			return
		}
	}

	if request.DefaultCategoryRef != nil {
		if !s.fillPayeeRefs(ctx, w, &payee, "", *request.DefaultCategoryRef) {
			return
		}
	}

	updated, err := s.deps.Payees.UpdatePayee(ctx, payee)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toPayeeResponse(updated))
}

func (s *Server) fillPayeeRefs(
	ctx context.Context,
	w http.ResponseWriter,
	payee *entity.Payee,
	accountRef, categoryRef string,
) bool {
	if accountRef != "" {
		if _, found, err := s.deps.Accounts.AccountByRef(ctx, accountRef); err != nil || !found {
			httpx.WriteError(w, http.StatusUnprocessableEntity, "unknown_reference",
				"no account "+accountRef)

			return false
		}

		payee.DefaultAccountRef = accountRef
	}

	if categoryRef != "" {
		if _, found, err := s.deps.Accounts.AccountByRef(ctx, categoryRef); err != nil || !found {
			httpx.WriteError(w, http.StatusUnprocessableEntity, "unknown_reference",
				"no account "+categoryRef)

			return false
		}

		payee.DefaultCategoryRef = categoryRef
	}

	return true
}

func toPayeeResponse(payee entity.Payee) payeeResponse {
	return payeeResponse{
		Ref:                payee.Ref,
		Name:               payee.Name,
		DefaultAccountRef:  payee.DefaultAccountRef,
		DefaultCategoryRef: payee.DefaultCategoryRef,
		Archived:           payee.ArchivedAt != nil,
		CreatedAt:          payee.CreatedAt.Format(time.RFC3339),
	}
}

func (s *Server) ListPayees(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Payees.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, payeeFilter)
	if !ok {
		return
	}

	writeList(
		ctx, w, s, "payees", filter.Limit,
		func() ([]entity.Payee, error) { return s.deps.Payees.ListPayees(ctx, filter) },
		func(payee entity.Payee) string { return payee.Ref },
		toPayeeResponse,
	)
}
