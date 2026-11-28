package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type tokenCreateRequest struct {
	Name      string     `json:"name"        validate:"required,min=1,max=100"`
	Scopes    []string   `json:"scopes"      validate:"required,min=1,max=20,dive,scope"`
	ExpiresAt *time.Time `format:"date-time" json:"expires_at"`
}

type tokenListQuery struct {
	Status string `query:"status" validate:"omitempty,oneof=active revoked"`
	Used   string `query:"used"   validate:"omitempty,oneof=used never"`
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
}

type tokenResponse struct {
	Ref        string   `json:"ref"         pattern:"^[0-9a-f]{32}$"`
	Name       string   `json:"name"`
	Preview    string   `json:"preview"`
	Scopes     []string `json:"scopes"`
	CreatedAt  string   `format:"date-time" json:"created_at"`
	LastUsedAt string   `format:"date-time" json:"last_used_at,omitempty"`
	RevokedAt  string   `format:"date-time" json:"revoked_at,omitempty"`
	ExpiresAt  string   `format:"date-time" json:"expires_at,omitempty"`
}

type tokenIssuedResponse struct {
	tokenResponse

	Token string `json:"token"`
}

// @Summary     Mint a scoped, non-root credential
// @Description The plaintext exists exactly once, in this response. Only its HMAC digest and a masked preview are stored; the scopes decide which scoped routes it answers.
// @Tags        tokens
// @Accept      json
// @Param       body body tokenCreateRequest true "the request body"
// @Produce     json
// @Success     201 {object} tokenIssuedResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/tokens [post]
func (s *Server) CreateToken(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Tokens.Create")
	defer endSpan()

	var request tokenCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	issued, err := s.issueToken(ctx, request)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, issued)
}

// @Summary     Every issued token, never its secret
// @Description Newest first. `status` and `used` narrow the listing; the preview is the only thing that identifies a token.
// @Tags        tokens
// @Produce     json
// @Param       status query string false "active or revoked"
// @Param       used query string false "used or never"
// @Param       cursor query string false "return tokens after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{tokens=[]tokenResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/tokens [get]
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

	page, meta := list.Paginate(rows, limit, func(row tokenResponse) string { return row.Ref })
	list.Write(w, "tokens", page, meta)
}

// RevokeToken is POST /api/tokens/{ref}/revoke: a token is never deleted, it
// stops authenticating and keeps its row and its journal entries.
// @Summary     Revoke a token; the row stays
// @Description `revoked_at` stamps the row, the credential stops authenticating immediately, and the journal keeps the entry.
// @Tags        tokens
// @Produce     json
// @Param       ref path string true "token ref"
// @Success     200 {object} tokenResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/tokens/{ref}/revoke [post]
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

	if token.ExpiresAt != nil {
		out.ExpiresAt = token.ExpiresAt.Format(constant.TimestampLayout)
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
