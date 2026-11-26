package handlers

import (
	"reflect"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestDashboardWindowRequiresAnOrderedPairOfDays(t *testing.T) {
	tests := []struct {
		name     string
		from     string
		to       string
		wantFrom string
		wantTo   string
		wantErr  bool
	}{
		{name: "explicit window", from: "2026-02-01", to: "2026-02-28", wantFrom: "2026-02-01", wantTo: "2026-02-28"},
		{name: "missing from", to: "2026-02-28", wantErr: true},
		{name: "missing to", from: "2026-02-01", wantErr: true},
		{name: "malformed from", from: "02/01/2026", to: "2026-02-28", wantErr: true},
		{name: "reversed window", from: "2026-03-01", to: "2026-02-28", wantErr: true},
		{name: "widest allowed window", from: "2025-02-01", to: "2026-02-01", wantFrom: "2025-02-01", wantTo: "2026-02-01"},
		{name: "window over the cap", from: "2025-02-01", to: "2026-02-02", wantErr: true},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			from, to, err := dashboardWindow(dashboardQuery{From: testCase.from, To: testCase.to})
			assertWindowError(t, err, testCase.wantErr)
			if testCase.wantErr {
				return
			}
			if got := from.Format(constant.DateLayout); got != testCase.wantFrom {
				t.Fatalf("from = %q, want %q", got, testCase.wantFrom)
			}
			if got := to.Format(constant.DateLayout); got != testCase.wantTo {
				t.Fatalf("to = %q, want %q", got, testCase.wantTo)
			}
			if from.Location() != time.UTC || to.Location() != time.UTC {
				t.Fatalf("window location = %s/%s, want UTC/UTC", from.Location(), to.Location())
			}
		})
	}
}

func assertWindowError(t *testing.T, err error, wantErr bool) {
	t.Helper()
	if wantErr {
		if err == nil {
			t.Fatal("dashboardWindow() error = nil, want an error")
		}

		return
	}

	if err != nil {
		t.Fatalf("dashboardWindow() error = %v", err)
	}
}

func TestMonthTotalsSerializeAsStrings(t *testing.T) {
	tests := []struct {
		name string
		in   []entity.MonthTotal
		want []monthTotalResponse
	}{
		{
			name: "empty rollup is an empty array",
			in:   nil,
			want: []monthTotalResponse{},
		},
		{
			name: "keeps month order and signed amounts",
			in: []entity.MonthTotal{
				{Month: "2026-01", SpendMinor: 1500, NetMinor: -1500},
				{Month: "2026-02", SpendMinor: 250, IncomeMinor: 1000, NetMinor: 750},
			},
			want: []monthTotalResponse{
				{Month: "2026-01", SpendMinor: "1500", IncomeMinor: "0", NetMinor: "-1500"},
				{Month: "2026-02", SpendMinor: "250", IncomeMinor: "1000", NetMinor: "750"},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := monthTotals(tc.in); !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("monthTotals() = %#v, want %#v", got, tc.want)
			}
		})
	}
}
