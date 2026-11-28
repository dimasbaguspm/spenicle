package entity

type MonthTotal struct {
	Month       string
	SpendMinor  int64
	IncomeMinor int64
	NetMinor    int64
}

func (m MonthTotal) Net() int64 { return m.IncomeMinor - m.SpendMinor }

type CategoryMonthTotal struct {
	Month       string
	AmountMinor int64
}

type CategoryMonthlyTotal struct {
	AccountRef  string
	AccountName string
	Months      []CategoryMonthTotal
}

// PayeeTotal is spend that names somebody: the row with an empty ref is the spend that named
// nobody, which is a fact worth showing rather than hiding.
type PayeeTotal struct {
	PayeeRef    string
	PayeeName   string
	AmountMinor int64
}

// AccountFlow is one money account's movement in one window: what went in, what went out, and
// what the two leave behind. Inflow and outflow are magnitudes, so a liability reads the way a
// person says it, and NetMinor keeps the sign the ledger uses.
type AccountFlow struct {
	AccountRef   string
	AccountName  string
	Kind         string
	InflowMinor  int64
	OutflowMinor int64
	NetMinor     int64
}

type LedgerStats struct {
	Entries      int
	BusiestOn    string
	BusiestSpend int64
}
