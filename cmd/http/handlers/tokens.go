package handlers

import (
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
)

type tokenCreateRequest struct {
	Name   string   `json:"name"   validate:"required,min=1,max=100"`
	Scopes []string `json:"scopes" validate:"required,min=1,max=20,dive,scope"`
}

type tokenListQuery struct {
	Status string `query:"status" validate:"omitempty,oneof=active revoked"`
	Used   string `query:"used"   validate:"omitempty,oneof=used never"`
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
}

type tokenResponse struct {
	Ref        string   `json:"ref"`
	Name       string   `json:"name"`
	Preview    string   `json:"preview"`
	Scopes     []string `json:"scopes"`
	CreatedAt  string   `json:"created_at"`
	LastUsedAt string   `json:"last_used_at,omitempty"`
	RevokedAt  string   `json:"revoked_at,omitempty"`
}

type tokenIssuedResponse struct {
	tokenResponse

	Token string `json:"token"`
}

func (s *Server) CreateToken(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Tokens.Create")
	defer endSpan()

	var request tokenCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	token, plain, err := s.deps.Tokens.Create(ctx, tokens.CreateInput{
		Name:   request.Name,
		Scopes: request.Scopes,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, tokenIssuedResponse{
		tokenResponse: toTokenResponse(token),
		Token:         plain,
	})
}

func (s *Server) ListTokens(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Tokens.List")
	defer endSpan()

	var query tokenListQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	limit := list.ClampLimit(query.Limit)

	stored, err := s.deps.Tokens.List(ctx, entity.TokenFilter{
		Status: query.Status,
		Used:   query.Used,
		Cursor: query.Cursor,
		Limit:  limit,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	rows := make([]tokenResponse, 0, len(stored))

	for _, token := range stored {
		rows = append(rows, toTokenResponse(token))
	}

	list.Write(w, "tokens", rows, list.Meta{Limit: limit})
}

// RevokeToken is POST /api/tokens/{ref}/revoke: a token is never deleted, it
// stops authenticating and keeps its row and its journal entries.
func (s *Server) RevokeToken(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Tokens.Revoke")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	token, err := s.deps.Tokens.Revoke(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toTokenResponse(token))
}

func toTokenResponse(token entity.Token) tokenResponse {
	out := tokenResponse{
		Ref:       token.Ref,
		Name:      token.Name,
		Preview:   token.Preview,
		Scopes:    token.Scopes,
		CreatedAt: token.CreatedAt.Format(constant.TimestampLayout),
	}

	if token.LastUsedAt != nil {
		out.LastUsedAt = token.LastUsedAt.Format(constant.TimestampLayout)
	}

	if token.RevokedAt != nil {
		out.RevokedAt = token.RevokedAt.Format(constant.TimestampLayout)
	}

	return out
}

// Bearer answers the credential on the Authorization header, empty when the
// request carries none. The root credential and a token travel the same way.
func Bearer(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return ""
	}

	const prefix = "Bearer "

	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return ""
	}

	return strings.TrimSpace(header[len(prefix):])
}
