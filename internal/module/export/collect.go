package export

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type snapshot struct {
	schemaVersion int
	exportedAt    time.Time
	baseCurrency  string
	accounts      []entity.Account
	payees        []entity.Payee
	entries       []entity.Entry
	captures      []entity.Capture
	recurring     []entity.Recurring
	rates         []entity.Rate
	customQueries []entity.CustomQuery
	accountRefs   map[int64]string
	payeeRefs     map[int64]string
	entryRefs     map[int64]string
}

func collect(ctx context.Context, deps Deps) (*snapshot, error) {
	schemaVersion, err := deps.System.SchemaVersion(ctx)
	if err != nil {
		return nil, err
	}

	out := &snapshot{
		schemaVersion: schemaVersion,
		exportedAt:    deps.Clock.Now().UTC(),
		baseCurrency:  deps.BaseCurrency,
	}

	if out.accounts, err = listAccounts(ctx, deps.Accounts); err != nil {
		return nil, err
	}

	if out.payees, err = listPayees(ctx, deps.Payees); err != nil {
		return nil, err
	}

	if out.entries, err = listEntries(ctx, deps.Ledger); err != nil {
		return nil, err
	}

	if out.captures, err = listCaptures(ctx, deps.Captures); err != nil {
		return nil, err
	}

	if out.recurring, err = listRecurring(ctx, deps.Recurring); err != nil {
		return nil, err
	}

	if out.rates, err = deps.Rates.ListRates(ctx); err != nil {
		return nil, err
	}

	if out.customQueries, err = deps.CustomQueries.ListCustomQueries(ctx); err != nil {
		return nil, err
	}

	out.sort()

	return out, nil
}

func (s *snapshot) sort() {
	sortByRef(s.accounts, func(account entity.Account) string { return account.Ref })
	sortByRef(s.payees, func(payee entity.Payee) string { return payee.Ref })
	sortByRef(s.captures, func(capture entity.Capture) string { return capture.Ref })
	sortByRef(s.recurring, func(rule entity.Recurring) string { return rule.Ref })
	sortByRef(s.customQueries, func(query entity.CustomQuery) string { return query.Ref })

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

func listAccounts(ctx context.Context, store repository.Accounts) ([]entity.Account, error) {
	return paginate(func(cursor string) ([]entity.Account, error) {
		return store.ListAccounts(ctx, entity.AccountFilter{Cursor: cursor, Limit: pageLimit})
	}, func(account entity.Account) string { return account.Ref })
}

func listPayees(ctx context.Context, store repository.Payees) ([]entity.Payee, error) {
	return paginate(func(cursor string) ([]entity.Payee, error) {
		return store.ListPayees(ctx, entity.PayeeFilter{Cursor: cursor, Limit: pageLimit})
	}, func(payee entity.Payee) string { return payee.Ref })
}

func listEntries(ctx context.Context, store repository.Ledger) ([]entity.Entry, error) {
	return paginate(func(cursor string) ([]entity.Entry, error) {
		return store.ListEntries(ctx, entity.EntryFilter{Cursor: cursor, Limit: pageLimit})
	}, func(entry entity.Entry) string { return entry.Ref })
}

func listCaptures(ctx context.Context, store repository.Captures) ([]entity.Capture, error) {
	return paginate(func(cursor string) ([]entity.Capture, error) {
		return store.ListCaptures(ctx, entity.CaptureFilter{Cursor: cursor, Limit: pageLimit})
	}, func(capture entity.Capture) string { return capture.Ref })
}

func listRecurring(ctx context.Context, store repository.Recurring) ([]entity.Recurring, error) {
	return paginate(func(cursor string) ([]entity.Recurring, error) {
		return store.ListRecurring(ctx, entity.RecurringFilter{Cursor: cursor, Limit: pageLimit})
	}, func(rule entity.Recurring) string { return rule.Ref })
}
