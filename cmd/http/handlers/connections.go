package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
)

const disconnectedStatus = "disconnected"

type connectionStartRequest struct {
	ClientID     string `json:"client_id"     validate:"required,min=8,max=200"`
	ClientSecret string `json:"client_secret" validate:"required,min=8,max=200"`
	RedirectURL  string `json:"redirect_url"  validate:"required,url,max=500"`
}

type connectionCallbackQuery struct {
	Code  string `query:"code"  validate:"required,max=2048"`
	State string `query:"state" validate:"required,max=200"`
}

type connectionResponse struct {
	Ref             string   `json:"ref,omitempty"`
	Provider        string   `json:"provider"`
	Status          string   `json:"status"`
	Account         string   `json:"account,omitempty"`
	Scopes          []string `json:"scopes,omitempty"`
	AccessExpiresAt string   `json:"access_expires_at,omitempty"`
	LastRefreshedAt string   `json:"last_refreshed_at,omitempty"`
	RevokedAt       string   `json:"revoked_at,omitempty"`
}

type connectionStartResponse struct {
	AuthorizeURL string `json:"authorize_url"`
	State        string `json:"state"`
}

func (s *Server) GetConnection(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Connections.Get")
	defer endSpan()

	connection, found, err := s.deps.Connections.Status(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toConnectionResponse(connection, found))
}

func (s *Server) StartConnection(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Connections.Start")
	defer endSpan()

	var request connectionStartRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	authorization, err := s.deps.Connections.Start(ctx, connections.StartInput{
		ClientID:     request.ClientID,
		ClientSecret: request.ClientSecret,
		RedirectURL:  request.RedirectURL,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, connectionStartResponse{
		AuthorizeURL: authorization.AuthorizeURL,
		State:        authorization.State,
	})
}

func (s *Server) CompleteConnection(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Connections.Complete")
	defer endSpan()

	var query connectionCallbackQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	connection, err := s.deps.Connections.Complete(ctx, connections.CompleteInput{
		Code:  query.Code,
		State: query.State,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toConnectionResponse(connection, true))
}

func (s *Server) RevokeConnection(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Connections.Revoke")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	current, found, err := s.deps.Connections.Status(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found || current.Ref != path.Ref {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no connection with that ref")

		return
	}

	revoked, err := s.deps.Connections.Revoke(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toConnectionResponse(revoked, true))
}

func toConnectionResponse(connection entity.Connection, found bool) connectionResponse {
	if !found {
		return connectionResponse{Provider: constant.ProviderGoogle, Status: disconnectedStatus}
	}

	response := connectionResponse{
		Ref:      connection.Ref,
		Provider: connection.Provider,
		Status:   connection.Status,
		Account:  connection.Account,
		Scopes:   connection.Scopes,
	}

	if !connection.AccessExpiresAt.IsZero() {
		response.AccessExpiresAt = connection.AccessExpiresAt.Format(constant.TimestampLayout)
	}

	if !connection.LastRefreshedAt.IsZero() {
		response.LastRefreshedAt = connection.LastRefreshedAt.Format(constant.TimestampLayout)
	}

	if connection.RevokedAt != nil {
		response.RevokedAt = connection.RevokedAt.Format(constant.TimestampLayout)
	}

	return response
}
