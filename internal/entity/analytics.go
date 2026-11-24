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
