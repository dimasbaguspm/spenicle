package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
)

type ruleCreateRequest struct {
	Pattern     string `json:"pattern"      validate:"required,rulepattern"`
	Field       string `json:"field"        validate:"required,rulefield"`
	MatchKind   string `json:"match_kind"   validate:"required,rulematch"`
	CategoryRef string `json:"category_ref" validate:"required,ref"`
	Priority    int    `json:"priority"`
}

type rulePatchRequest struct {
	Pattern     *string `json:"pattern,omitempty"      validate:"omitempty,rulepattern"`
	CategoryRef *string `json:"category_ref,omitempty" validate:"omitempty,ref"`
	Priority    *int    `json:"priority,omitempty"`
	Archived    *bool   `json:"archived,omitempty"`
}

type ruleResponse struct {
	Ref         string `json:"ref"`
	Pattern     string `json:"pattern"`
	Field       string `json:"field"`
	MatchKind   string `json:"match_kind"`
	CategoryRef string `json:"category_ref"`
	Priority    int    `json:"priority"`
	Archived    bool   `json:"archived"`
	CreatedAt   string `json:"created_at"`
}

type ruleListQuery struct {
	IncludeArchived string `query:"include_archived" validate:"omitempty,oneof=true false"`
	AccountRef      string `query:"account_ref"      validate:"omitempty,ref"`
	Cursor          string `query:"cursor"           validate:"omitempty,ref"`
	Limit           int64  `query:"limit"            validate:"omitempty,gte=0,lte=200"`
}

type suggestQuery struct {
	PayeeRef string `query:"payee_ref" validate:"omitempty,ref"`
	Text     string `query:"text"      validate:"omitempty,max=200"`
	Kind     string `query:"kind"      validate:"omitempty,oneof=expense income"`
}

type suggestResponse struct {
	AccountRef  string `json:"account_ref"`
	AccountName string `json:"account_name"`
	Why         string `json:"why"`
	Tier        string `json:"tier"`
	RuleRef     string `json:"rule_ref,omitempty"`
}

func (s *Server) ListCategorizationRules(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Categorization.List")
	defer endSpan()

	var query ruleListQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	filter := entity.CategorizationFilter{
		AccountRef:      query.AccountRef,
		IncludeArchived: query.IncludeArchived == "true",
		Cursor:          query.Cursor,
		Limit:           list.ClampLimit(query.Limit),
	}

	writeList(
		ctx, w, s, "rules", filter.Limit,
		func() ([]entity.CategorizationRule, error) {
			return s.deps.Rules.ListRules(ctx, filter)
		},
		func(rule entity.CategorizationRule) string { return rule.Ref },
		toRuleResponse,
	)
}

func (s *Server) CreateCategorizationRule(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Categorization.Post")
	defer endSpan()

	var request ruleCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	if !s.categoryExists(ctx, w, request.CategoryRef) {
		return
	}

	created, err := s.deps.Rules.CreateRule(ctx, entity.CategorizationRule{
		Pattern:    request.Pattern,
		Field:      request.Field,
		MatchKind:  request.MatchKind,
		AccountRef: request.CategoryRef,
		Priority:   request.Priority,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toRuleResponse(created))
}

func (s *Server) PatchCategorizationRule(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Categorization.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request rulePatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	rule, found, err := s.deps.Rules.RuleByRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no categorization rule "+path.Ref)

		return
	}

	if request.Pattern != nil {
		rule.Pattern = *request.Pattern
	}

	if request.Priority != nil {
		rule.Priority = *request.Priority
	}

	if request.Archived != nil {
		rule.ArchivedAt = archivedAt(*request.Archived)
	}

	if request.CategoryRef != nil {
		if !s.categoryExists(ctx, w, *request.CategoryRef) {
			return
		}

		rule.AccountRef = *request.CategoryRef
	}

	updated, err := s.deps.Rules.UpdateRule(ctx, rule)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toRuleResponse(updated))
}

func (s *Server) SuggestCategory(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Categorization.Suggest")
	defer endSpan()

	var query suggestQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	if query.PayeeRef == "" && query.Text == "" {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
			"send a payee_ref or a text")

		return
	}

	kind := query.Kind
	if kind == "" {
		kind = constant.AccountKindExpense
	}

	suggestion, err := s.deps.Categorization.Resolve(ctx, categorization.SuggestInput{
		PayeeRef: query.PayeeRef,
		Text:     query.Text,
		Kind:     kind,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, suggestResponse{
		AccountRef:  suggestion.AccountRef,
		AccountName: suggestion.AccountName,
		Why:         suggestion.Why,
		Tier:        suggestion.Tier,
		RuleRef:     suggestion.RuleRef,
	})
}

func (s *Server) categoryExists(ctx context.Context, w http.ResponseWriter, ref string) bool {
	account, found, err := s.deps.Accounts.AccountByRef(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return false
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no account "+ref)

		return false
	}

	if account.Kind != constant.AccountKindExpense && account.Kind != constant.AccountKindIncome {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
			"a rule needs an expense or income category")

		return false
	}

	return true
}

func toRuleResponse(rule entity.CategorizationRule) ruleResponse {
	return ruleResponse{
		Ref:         rule.Ref,
		Pattern:     rule.Pattern,
		Field:       rule.Field,
		MatchKind:   rule.MatchKind,
		CategoryRef: rule.AccountRef,
		Priority:    rule.Priority,
		Archived:    rule.ArchivedAt != nil,
		CreatedAt:   rule.CreatedAt.Format(time.RFC3339),
	}
}
