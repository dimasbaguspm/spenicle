package export

import (
	"context"
	"slices"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type snapshot struct {
	schemaVersion       int
	exportedAt          time.Time
	baseCurrency        string
	window              *Window
	accounts            []entity.Account
	payees              []entity.Payee
	entries             []entity.Entry
	captures            []entity.Capture
	recurring           []entity.Recurring
	rates               []entity.Rate
	customQueries       []entity.CustomQuery
	categorizationRules []entity.CategorizationRule
	accountRefs         map[int64]string
	payeeRefs           map[int64]string
	entryRefs           map[int64]string
}

func collect(ctx context.Context, deps Deps, window *Window) (*snapshot, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.Collect")
	defer endSpan()

	schemaVersion, err := deps.System.SchemaVersion(ctx)
	if err != nil {
		return nil, err
	}

	out := &snapshot{
		schemaVersion: schemaVersion,
		baseCurrency:  deps.BaseCurrency,
	}

	if out.accounts, err = deps.Exporter.AllAccounts(ctx); err != nil {
		return nil, err
	}

	if out.payees, err = deps.Exporter.AllPayees(ctx); err != nil {
		return nil, err
	}

	if out.entries, err = listEntries(ctx, deps.Ledger, window); err != nil {
		return nil, err
	}

	if out.captures, err = deps.Exporter.AllCaptures(ctx); err != nil {
		return nil, err
	}

	if out.recurring, err = deps.Exporter.AllRecurring(ctx); err != nil {
		return nil, err
	}

	if out.rates, err = deps.Rates.ListRates(ctx); err != nil {
		return nil, err
	}

	if out.customQueries, err = deps.CustomQueries.ListCustomQueries(ctx); err != nil {
		return nil, err
	}

	if out.categorizationRules, err = deps.Exporter.AllCategorizationRules(ctx); err != nil {
		return nil, err
	}

	out.sort()
	out.keep(window)
	out.exportedAt = out.dataWatermark()

	return out, nil
}

func (s *snapshot) dataWatermark() time.Time {
	var latest time.Time

	note := func(at time.Time) {
		if at.After(latest) {
			latest = at
		}
	}

	noteOptional := func(at *time.Time) {
		if at != nil {
			note(*at)
		}
	}

	for _, account := range s.accounts {
		note(account.CreatedAt)
		noteOptional(account.ArchivedAt)
	}

	for _, payee := range s.payees {
		note(payee.CreatedAt)
		noteOptional(payee.ArchivedAt)
	}

	for _, entry := range s.entries {
		note(entry.OccurredOn)
		note(entry.CreatedAt)
		noteOptional(entry.VoidedAt)
	}

	for _, capture := range s.captures {
		note(capture.ReceivedAt)
		noteOptional(capture.ResolvedAt)
	}

	for _, rule := range s.recurring {
		note(rule.CreatedAt)
		note(rule.NextDueOn)
		noteOptional(rule.EndsOn)
		noteOptional(rule.LastPostedOn)
	}

	for _, rate := range s.rates {
		note(rate.OnDate)
		note(rate.FetchedAt)
	}

	for _, query := range s.customQueries {
		note(query.CreatedAt)
		note(query.UpdatedAt)
	}

	for _, rule := range s.categorizationRules {
		note(rule.CreatedAt)
		noteOptional(rule.ArchivedAt)
	}

	return latest.UTC()
}

func (s *snapshot) keep(window *Window) {
	s.window = window

	if window == nil {
		return
	}

	kept := make([]entity.Entry, 0, len(s.entries))

	for _, entry := range s.entries {
		if window.Holds(entry.OccurredOn) {
			kept = append(kept, entry)
		}
	}

	s.entries = kept
}

func (w Window) Holds(day time.Time) bool {
	return !day.Before(w.From) && !day.After(w.To)
}

func (s *snapshot) sort() {
	sortByRef(s.accounts, func(account entity.Account) string { return account.Ref })
	sortByRef(s.payees, func(payee entity.Payee) string { return payee.Ref })
	sortByRef(s.captures, func(capture entity.Capture) string { return capture.Ref })
	sortByRef(s.recurring, func(rule entity.Recurring) string { return rule.Ref })
	sortByRef(s.customQueries, func(query entity.CustomQuery) string { return query.Ref })
	sortByRef(s.categorizationRules, func(rule entity.CategorizationRule) string { return rule.Ref })

	slices.SortFunc(s.entries, func(left, right entity.Entry) int {
		if order := left.OccurredOn.Compare(right.OccurredOn); order != 0 {
			return order
		}

		return strings.Compare(left.Ref, right.Ref)
	})

	s.accountRefs = refsByID(s.accounts, func(account entity.Account) (int64, string) {
		return account.ID, account.Ref
	})
	s.payeeRefs = refsByID(s.payees, func(payee entity.Payee) (int64, string) {
		return payee.ID, payee.Ref
	})
	s.entryRefs = refsByID(s.entries, func(entry entity.Entry) (int64, string) {
		return entry.ID, entry.Ref
	})
}

func sortByRef[T any](rows []T, refOf func(T) string) {
	slices.SortFunc(rows, func(left, right T) int {
		return strings.Compare(refOf(left), refOf(right))
	})
}

func refsByID[T any](rows []T, idAndRef func(T) (int64, string)) map[int64]string {
	out := make(map[int64]string, len(rows))

	for _, row := range rows {
		id, ref := idAndRef(row)
		out[id] = ref
	}

	return out
}

func paginate[T any](
	fetch func(cursor string) ([]T, error),
	refOf func(T) string,
) ([]T, error) {
	all := make([]T, 0, pageLimit)
	seen := make(map[string]bool, pageLimit)

	cursor := ""

	for {
		rows, err := fetch(cursor)
		if err != nil {
			return nil, err
		}

		if len(rows) == 0 {
			return all, nil
		}

		more := len(rows) > pageLimit
		if more {
			rows = rows[:pageLimit]
		}

		for _, row := range rows {
			if ref := refOf(row); !seen[ref] {
				seen[ref] = true

				all = append(all, row)
			}
		}

		if !more {
			return all, nil
		}

		cursor = refOf(rows[len(rows)-1])
	}
}

func listEntries(ctx context.Context, store repository.Ledger, window *Window) ([]entity.Entry, error) {
	filter := entity.EntryFilter{Limit: pageLimit}
	if window != nil {
		filter.From = window.From
		filter.To = window.To
	}

	return paginate(func(cursor string) ([]entity.Entry, error) {
		filter.Cursor = cursor

		return store.ListEntries(ctx, filter)
	}, func(entry entity.Entry) string { return entry.Ref })
}
