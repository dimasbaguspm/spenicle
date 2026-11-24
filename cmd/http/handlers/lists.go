package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func entryFilter(params list.Params) (entity.EntryFilter, error) {
	refs, err := params.SplitRefs()
	if err != nil {
		return entity.EntryFilter{}, err
	}

	filter := entity.EntryFilter{
		AccountRefs: list.Split(params.AccountRefs),
		PayeeRefs:   list.Split(params.PayeeRefs),
		Sources:     list.Split(params.Sources),
		Currency:    params.Currency,
		Query:       params.Query,
		Refs:        refs,
		Voided:      params.Voided,
		Cursor:      params.Cursor,
		Limit:       list.ClampLimit(params.Limit),
	}

	if filter.From, err = parseDayValue(params.From, "from"); err != nil {
		return entity.EntryFilter{}, err
	}

	if filter.To, err = parseDayValue(params.To, "to"); err != nil {
		return entity.EntryFilter{}, err
	}

	if params.AmountMin != "" {
		if filter.AmountMin, err = parseMoney(params.AmountMin, "amount_min"); err != nil {
			return entity.EntryFilter{}, err
		}
	}

	if params.AmountMax != "" {
		if filter.AmountMax, err = parseMoney(params.AmountMax, "amount_max"); err != nil {
			return entity.EntryFilter{}, err
		}
	}

	return filter, nil
}

func captureFilter(params list.Params) (entity.CaptureFilter, error) {
	refs, err := params.SplitRefs()
	if err != nil {
		return entity.CaptureFilter{}, err
	}

	return entity.CaptureFilter{
		Status: params.Status,
		Refs:   refs,
		Cursor: params.Cursor,
		Limit:  list.ClampLimit(params.Limit),
	}, nil
}

func accountFilter(params list.Params) (entity.AccountFilter, error) {
	refs, err := params.SplitRefs()
	if err != nil {
		return entity.AccountFilter{}, err
	}

	return entity.AccountFilter{
		Query:     params.Query,
		Refs:      refs,
		Currency:  params.Currency,
		Kind:      params.Kind,
		ParentRef: params.ParentRef,
		Archived:  params.Archived,
		Cursor:    params.Cursor,
		Limit:     list.ClampLimit(params.Limit),
	}, nil
}

func payeeFilter(params list.Params) (entity.PayeeFilter, error) {
	refs, err := params.SplitRefs()
	if err != nil {
		return entity.PayeeFilter{}, err
	}

	return entity.PayeeFilter{
		Query:    params.Query,
		Refs:     refs,
		Archived: params.Archived,
		Cursor:   params.Cursor,
		Limit:    list.ClampLimit(params.Limit),
	}, nil
}

func recurringFilter(params list.Params) (entity.RecurringFilter, error) {
	refs, err := params.SplitRefs()
	if err != nil {
		return entity.RecurringFilter{}, err
	}

	return entity.RecurringFilter{
		Query:   params.Query,
		Refs:    refs,
		State:   params.State,
		Cadence: params.Cadence,
		Cursor:  params.Cursor,
		Limit:   list.ClampLimit(params.Limit),
	}, nil
}

func parseDayValue(raw, name string) (time.Time, error) {
	if raw == "" {
		return time.Time{}, nil
	}

	parsed, err := time.Parse(constant.DateLayout, raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse %s: %w", name, err)
	}

	return parsed, nil
}

func parseMoney(raw, name string) (*int64, error) {
	parsed, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", name, err)
	}

	return &parsed, nil
}

func bindListParams[T any](
	w http.ResponseWriter,
	r *http.Request,
	build func(list.Params) (T, error),
) (T, bool) {
	var empty T

	var params list.Params
	if err := bindQuery(r, &params); err != nil {
		writeInvalid(w, err)

		return empty, false
	}

	filter, err := build(params)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return empty, false
	}

	return filter, true
}

type pageRequest struct {
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
}

func writeEventPage[T, R any](
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
	server *Server,
	fetch func(cursor string, limit int) ([]T, error),
	refOf func(T) string,
	toRow func(T) R,
) {
	var request pageRequest
	if err := bindQuery(r, &request); err != nil {
		writeInvalid(w, err)

		return
	}

	limit := list.ClampLimit(request.Limit)

	writeList(ctx, w, server, "events", limit,
		func() ([]T, error) { return fetch(request.Cursor, limit) }, refOf, toRow)
}

func writeList[T, R any](
	ctx context.Context,
	w http.ResponseWriter,
	s *Server,
	key string,
	limit int,
	fetch func() ([]T, error),
	refOf func(T) string,
	toRow func(T) R,
) {
	items, err := fetch()
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	items, meta := list.Paginate(items, limit, refOf)

	rows := make([]R, 0, len(items))

	for _, item := range items {
		rows = append(rows, toRow(item))
	}

	list.Write(w, key, rows, meta)
}
