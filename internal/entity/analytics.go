package entity

type MonthTotal struct {
	Month       string
	SpendMinor  int64
	IncomeMinor int64
	NetMinor    int64
}

func (m MonthTotal) Net() int64 { return m.IncomeMinor - m.SpendMinor }
