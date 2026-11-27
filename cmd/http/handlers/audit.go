package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type auditQuery struct {
	EntityKind string `query:"entity_kind" validate:"omitempty,auditkind"`
	EntityRef  string `query:"entity_ref"  validate:"omitempty,max=64"`
	Action     string `query:"action"      validate:"omitempty,auditaction"`
	ActorKind  string `query:"actor_kind"  validate:"omitempty,auditactor"`
	From       string `query:"from"        validate:"omitempty,momentstr"`
	To         string `query:"to"          validate:"omitempty,momentstr"`
	Cursor     string `query:"cursor"      validate:"omitempty,ref"`
	Limit      int64  `query:"limit"       validate:"omitempty,gte=0,lte=200"`
}

type auditResponse struct {
	Ref        string          `json:"ref"`
	EntityKind string          `json:"entity_kind"`
	EntityRef  string          `json:"entity_ref,omitempty"`
	Action     string          `json:"action"`
	ActorKind  string          `json:"actor_kind"`
	ActorRef   string          `json:"actor_ref,omitempty"`
	From       json.RawMessage `json:"from,omitempty"`
	To         json.RawMessage `json:"to,omitempty"`
	At         string          `json:"at"`
}

func (s *Server) ListAudit(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Audit.List")
	defer endSpan()

	var query auditQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	filter, err := auditFilterOf(query, s.location)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	writeList(
		ctx, w, s, "audit", filter.Limit,
		func() ([]entity.Audit, error) { return s.deps.Audit.ListAudit(ctx, filter) },
		func(record entity.Audit) string { return record.Ref },
		toAuditResponse,
	)
}

func auditFilterOf(query auditQuery, loc *time.Location) (entity.AuditFilter, error) {
	filter := entity.AuditFilter{
		EntityKind: query.EntityKind,
		EntityRef:  query.EntityRef,
		Action:     query.Action,
		ActorKind:  query.ActorKind,
		Cursor:     query.Cursor,
		Limit:      list.ClampLimit(query.Limit),
	}

	if query.From != "" {
		from, err := validating.Moment(query.From, "from", loc)
		if err != nil {
			return entity.AuditFilter{}, err
		}

		filter.From = from
	}

	if query.To != "" {
		to, err := validating.MomentEnd(query.To, "to", loc)
		if err != nil {
			return entity.AuditFilter{}, err
		}

		filter.To = to
	}

	return filter, nil
}

func toAuditResponse(record entity.Audit) auditResponse {
	out := auditResponse{
		Ref:        record.Ref,
		EntityKind: record.EntityKind,
		EntityRef:  record.EntityRef,
		Action:     record.Action,
		ActorKind:  record.ActorKind,
		ActorRef:   record.ActorRef,
		At:         record.At.Format(constant.TimestampLayout),
	}

	if json.Valid([]byte(record.FromJSON)) {
		out.From = json.RawMessage(record.FromJSON)
	}

	if json.Valid([]byte(record.ToJSON)) {
		out.To = json.RawMessage(record.ToJSON)
	}

	return out
}
