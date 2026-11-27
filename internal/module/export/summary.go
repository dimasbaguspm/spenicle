package export

import (
	"sort"
	"strconv"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const monthLayout = "2006-01"

type summaryAccount struct {
	Ref          string `json:"ref"`
	Name         string `json:"name"`
	Kind         string `json:"kind"`
	Currency     string `json:"currency"`
	BalanceMinor string `json:"balance_minor"`
}

type summaryMonth struct {
	Month       string `json:"month"`
	SpendMinor  string `json:"spend_minor"`
	IncomeMinor string `json:"income_minor"`
}

type summaryCategory struct {
	AccountRef string `json:"account_ref"`
	Name       string `json:"name"`
	SpendMinor string `json:"spend_minor"`
}

type summaryWindow struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type summary struct {
	Accounts   []summaryAccount  `json:"accounts"`
	Months     []summaryMonth    `json:"months"`
	Categories []summaryCategory `json:"categories"`
	Counts     map[string]int    `json:"counts"`
	Window     *summaryWindow    `json:"window,omitempty"`
}

type monthAccrual struct {
	spend  int64
	income int64
}

func (s *snapshot) summarise() summary {
	kinds := make(map[string]string, len(s.accounts))
	names := make(map[string]string, len(s.accounts))
	balances := make(map[string]int64, len(s.accounts))

	for _, account := range s.accounts {
		kinds[account.Ref] = account.Kind
		names[account.Ref] = account.Name
	}

	months := make(map[string]*monthAccrual)
	categories := make(map[string]int64)

	for _, entry := range s.entries {
		if entry.VoidedAt != nil || entry.ReversesEntryRef != "" {
			continue
		}

		month := entry.OccurredOn.UTC().Format(monthLayout)

		for _, posting := range entry.Postings {
			balances[posting.AccountRef] += posting.BaseAmountMinor

			accrual, seen := months[month]
			if !seen {
				accrual = &monthAccrual{}
				months[month] = accrual
			}

			switch kinds[posting.AccountRef] {
			case constant.AccountKindExpense:
				accrual.spend += posting.BaseAmountMinor
				categories[posting.AccountRef] += posting.BaseAmountMinor
			case constant.AccountKindIncome:
				accrual.income -= posting.BaseAmountMinor
			}
		}
	}

	out := summary{
		Accounts:   s.summaryAccounts(balances),
		Months:     s.summaryMonths(months),
		Categories: s.summaryCategories(categories, names),
		Counts:     s.counts(),
	}

	if s.window != nil {
		out.Window = &summaryWindow{
			From: s.window.From.Format(constant.DateLayout),
			To:   s.window.To.Format(constant.DateLayout),
		}
	}

	return out
}

func (s *snapshot) summaryAccounts(balances map[string]int64) []summaryAccount {
	out := make([]summaryAccount, 0, len(s.accounts))

	for _, account := range s.accounts {
		out = append(out, summaryAccount{
			Ref:          account.Ref,
			Name:         account.Name,
			Kind:         account.Kind,
			Currency:     account.Currency,
			BalanceMinor: strconv.FormatInt(balances[account.Ref], 10),
		})
	}

	sort.Slice(out, func(left, right int) bool { return out[left].Ref < out[right].Ref })

	return out
}

func (s *snapshot) summaryMonths(months map[string]*monthAccrual) []summaryMonth {
	out := make([]summaryMonth, 0, len(months))

	for month, accrual := range months {
		out = append(out, summaryMonth{
			Month:       month,
			SpendMinor:  strconv.FormatInt(accrual.spend, 10),
			IncomeMinor: strconv.FormatInt(accrual.income, 10),
		})
	}

	sort.Slice(out, func(left, right int) bool { return out[left].Month < out[right].Month })

	return out
}

func (s *snapshot) summaryCategories(totals map[string]int64, names map[string]string) []summaryCategory {
	out := make([]summaryCategory, 0, len(totals))

	for accountRef, spend := range totals {
		if spend == 0 {
			continue
		}

		out = append(out, summaryCategory{
			AccountRef: accountRef,
			Name:       names[accountRef],
			SpendMinor: strconv.FormatInt(spend, 10),
		})
	}

	sort.Slice(out, func(left, right int) bool { return out[left].AccountRef < out[right].AccountRef })

	return out
}

func (s *snapshot) counts() map[string]int {
	postings := 0

	for _, entry := range s.entries {
		postings += len(entry.Postings)
	}

	return map[string]int{
		"accounts":             len(s.accounts),
		"payees":               len(s.payees),
		"entries":              len(s.entries),
		"postings":             postings,
		"captures":             len(s.captures),
		"recurring":            len(s.recurring),
		"rates":                len(s.rates),
		"custom_queries":       len(s.customQueries),
		"categorization_rules": len(s.categorizationRules),
	}
}
