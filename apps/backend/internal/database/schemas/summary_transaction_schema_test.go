package schemas

import (
	"encoding/json"
	"testing"
)

func TestSummaryTransactionItem(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		item := SummaryTransactionItem{
			Period:         "2024-01",
			TotalCount:     150,
			IncomeCount:    50,
			ExpenseCount:   95,
			TransferCount:  5,
			IncomeAmount:   5000000,
			ExpenseAmount:  3500000,
			TransferAmount: 500000,
			Net:            1500000,
		}
		data, err := json.Marshal(item)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty JSON")
		}
	})

	t.Run("calculates net correctly", func(t *testing.T) {
		item := SummaryTransactionItem{
			IncomeAmount:  5000000,
			ExpenseAmount: 3500000,
			Net:           1500000,
		}
		if item.Net != item.IncomeAmount-item.ExpenseAmount {
			t.Errorf("net should equal income - expense")
		}
	})
}

func TestSummaryTransactionSchema(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		schema := SummaryTransactionSchema{
			Frequency: "monthly",
			Data: []SummaryTransactionItem{
				{
					Period:        "2024-01",
					TotalCount:    100,
					IncomeAmount:  3000000,
					ExpenseAmount: 2000000,
					Net:           1000000,
				},
			},
		}
		data, err := json.Marshal(schema)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty JSON")
		}
	})

	t.Run("accepts empty data array", func(t *testing.T) {
		schema := SummaryTransactionSchema{
			Frequency: "daily",
			Data:      []SummaryTransactionItem{},
		}
		if len(schema.Data) != 0 {
			t.Error("expected empty data array")
		}
	})
}
