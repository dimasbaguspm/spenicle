package schemas

import (
	"encoding/json"
	"testing"
)

func TestSummaryAccountModel(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		item := SummaryAccountModel{
			AccountID:     1,
			AccountName:   "Cash",
			AccountType:   "expense",
			TotalCount:    100,
			IncomeAmount:  3000000,
			ExpenseAmount: 2500000,
			Net:           500000,
		}
		data, err := json.Marshal(item)
		if err != nil {
			t.Fatalf("failed to marshal: %v", err)
		}
		if len(data) == 0 {
			t.Error("expected non-empty JSON")
		}
	})
}

func TestSummaryAccountSchema(t *testing.T) {
	t.Run("marshals to JSON correctly", func(t *testing.T) {
		schema := SummaryAccountSchema{
			Data: []SummaryAccountModel{
				{
					AccountID:     1,
					AccountName:   "Cash",
					TotalCount:    50,
					IncomeAmount:  1000000,
					ExpenseAmount: 750000,
					Net:           250000,
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
		schema := SummaryAccountSchema{
			Data: []SummaryAccountModel{},
		}
		if len(schema.Data) != 0 {
			t.Error("expected empty data array")
		}
	})
}
