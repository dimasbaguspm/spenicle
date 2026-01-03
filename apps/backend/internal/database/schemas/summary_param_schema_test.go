package schemas

import (
	"testing"
	"time"
)

func TestSummaryParamModel(t *testing.T) {
	t.Run("accepts zero time values for no filtering", func(t *testing.T) {
		schema := SummaryParamModel{}
		if !schema.StartDate.IsZero() {
			t.Error("expected zero start date")
		}
		if !schema.EndDate.IsZero() {
			t.Error("expected zero end date")
		}
	})

	t.Run("accepts valid dates", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		schema := SummaryParamModel{
			StartDate: start,
			EndDate:   end,
		}
		if schema.StartDate.IsZero() {
			t.Error("expected non-zero start date")
		}
		if schema.EndDate.IsZero() {
			t.Error("expected non-zero end date")
		}
	})
}

func TestSummaryTransactionParamModel(t *testing.T) {
	t.Run("has frequency field", func(t *testing.T) {
		schema := SummaryTransactionParamModel{
			Frequency: "monthly",
		}
		if schema.Frequency != "monthly" {
			t.Errorf("expected frequency 'monthly', got %s", schema.Frequency)
		}
	})

	t.Run("embeds SummaryParamModel", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		schema := SummaryTransactionParamModel{
			SummaryParamModel: SummaryParamModel{
				StartDate: start,
			},
			Frequency: "daily",
		}
		if schema.StartDate.IsZero() {
			t.Error("expected embedded StartDate to be accessible")
		}
	})
}
