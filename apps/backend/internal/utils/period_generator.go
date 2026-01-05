package utils

import (
	"fmt"
	"time"
)

// GeneratePeriods generates all periods between start and end dates based on frequency
// Returns a slice of period strings in the format matching the SQL date formatting
func GeneratePeriods(startDate, endDate time.Time, frequency string) []string {
	var periods []string

	switch frequency {
	case "daily":
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			periods = append(periods, d.Format("2006-01-02"))
		}
	case "weekly":
		// Start from the beginning of the week
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 7) {
			year, week := d.ISOWeek()
			periods = append(periods, fmt.Sprintf("%d-W%02d", year, week))
		}
	case "monthly":
		current := time.Date(startDate.Year(), startDate.Month(), 1, 0, 0, 0, 0, startDate.Location())
		end := time.Date(endDate.Year(), endDate.Month(), 1, 0, 0, 0, 0, endDate.Location())
		for !current.After(end) {
			periods = append(periods, current.Format("2006-01"))
			current = current.AddDate(0, 1, 0)
		}
	case "yearly":
		for year := startDate.Year(); year <= endDate.Year(); year++ {
			periods = append(periods, fmt.Sprintf("%d", year))
		}
	}

	return periods
}

// FillMissingPeriods takes existing data and fills in missing periods with zero values
func FillMissingPeriods(allPeriods []string, existingData map[string]interface{}, defaultValue interface{}) []interface{} {
	result := make([]interface{}, 0, len(allPeriods))
	for _, period := range allPeriods {
		if data, exists := existingData[period]; exists {
			result = append(result, data)
		} else {
			result = append(result, defaultValue)
		}
	}
	return result
}
