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
	Ref             string   `json:"ref,omitempty"     pattern:"^[0-9a-f]{32}$"`
	Provider        string   `json:"provider"`
	Status          string   `json:"status"`
	Account         string   `json:"account,omitempty"`
	Scopes          []string `json:"scopes,omitempty"`
	AccessExpiresAt string   `format:"date-time"       json:"access_expires_at,omitempty"`
	LastRefreshedAt string   `format:"date-time"       json:"last_refreshed_at,omitempty"`
	RevokedAt       string   `format:"date-time"       json:"revoked_at,omitempty"`
}

type connectionStartResponse struct {
	AuthorizeURL string `json:"authorize_url"`
	State        string `json:"state"`
}

// @Summary     The current Google mailbox connection, or `disconnected`
// @Description Answers `disconnected` when no grant is stored; the secrets never leave the sealed row.
// @Tags        connections
// @Produce     json
// @Success     200 {object} connectionResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/connections [get]
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

// @Summary     Store OAuth client credentials and start authorisation
// @Description Writes the client id and secret into the sealed row and answers the URL the browser must visit. The secret is never echoed back.
// @Tags        connections
// @Accept      json
// @Param       body body connectionStartRequest true "the request body"
// @Produce     json
// @Success     201 {object} connectionStartResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/connections/google [post]
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

// @Summary     Finish the Google grant from the browser redirect
// @Description Public route: the browser arrives here with `code` and `state`, not with a credential. An unknown or replayed `state` is refused.
// @Tags        connections
// @Produce     json
// @Param       code query string true "the grant code"
// @Param       state query string true "the state issued at start"
// @Success     200 {object} connectionResponse
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/connections/google/callback [get]
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

// @Summary     Disconnect the stored grant, keep the row
// @Description Marks the connection revoked; a capture that already arrived keeps its evidence.
// @Tags        connections
// @Produce     json
// @Param       ref path string true "connection ref"
// @Success     200 {object} connectionResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/connections/{ref}/revoke [post]
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
