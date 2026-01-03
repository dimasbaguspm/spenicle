# Trend Analysis Feature

## Overview

Extends the summary feature to provide trend analysis for accounts and categories, showing whether spending/income patterns are increasing, decreasing, stable, or volatile over time.

## Endpoints

### GET /summary/accounts/trends

Returns trend analysis for all accounts grouped by time period.

**Query Parameters:**

- `startDate` (required): ISO 8601 timestamp for start of date range
- `endDate` (required): ISO 8601 timestamp for end of date range
- `frequency` (optional): "weekly" or "monthly" (default: "monthly")

**Response:**

```json
{
  "frequency": "monthly",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "data": [
    {
      "accountId": 1,
      "accountName": "Cash",
      "avgChange": 5.2,
      "trendStatus": "increasing",
      "periods": [
        {
          "period": "2024-01",
          "totalAmount": 1000000,
          "incomeAmount": 5000000,
          "expenseAmount": 4000000,
          "transferAmount": 0,
          "net": 1000000,
          "count": 50,
          "changePercent": 0,
          "trend": "stable"
        },
        {
          "period": "2024-02",
          "totalAmount": 1100000,
          "incomeAmount": 5500000,
          "expenseAmount": 4400000,
          "transferAmount": 0,
          "net": 1100000,
          "count": 55,
          "changePercent": 10.0,
          "trend": "increasing"
        }
      ]
    }
  ]
}
```

### GET /summary/categories/trends

Returns trend analysis for all categories grouped by time period.

**Query Parameters:**

- `startDate` (required): ISO 8601 timestamp for start of date range
- `endDate` (required): ISO 8601 timestamp for end of date range
- `frequency` (optional): "weekly" or "monthly" (default: "monthly")

**Response:**

```json
{
  "frequency": "monthly",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "data": [
    {
      "categoryId": 1,
      "categoryName": "Food",
      "categoryType": "expense",
      "avgChange": -3.5,
      "trendStatus": "decreasing",
      "periods": [
        {
          "period": "2024-01",
          "totalAmount": 1000000,
          "incomeAmount": 0,
          "expenseAmount": 1000000,
          "transferAmount": 0,
          "net": -1000000,
          "count": 30,
          "changePercent": 0,
          "trend": "stable"
        },
        {
          "period": "2024-02",
          "totalAmount": 900000,
          "incomeAmount": 0,
          "expenseAmount": 900000,
          "transferAmount": 0,
          "net": -900000,
          "count": 28,
          "changePercent": -10.0,
          "trend": "decreasing"
        }
      ]
    }
  ]
}
```

## Trend Calculation Logic

### Period-over-Period Change

- For each period, calculate percentage change from previous period: `(current - previous) / previous * 100`
- First period always has `changePercent: 0` and `trend: "stable"`

### Trend Direction (per period)

- `"increasing"`: Change > 5%
- `"decreasing"`: Change < -5%
- `"stable"`: Change between -5% and 5%

### Overall Trend Status

- `"increasing"`: Increasing periods > 2x decreasing periods
- `"decreasing"`: Decreasing periods > 2x increasing periods
- `"volatile"`: Both increasing and decreasing periods present (not dominated by one)
- `"stable"`: Neither increasing nor decreasing dominates

### Average Change

Average of all period-over-period percentage changes across the date range.

## Technical Implementation

### Database Queries

- Uses efficient SQL with `GROUP BY` on account/category and period
- Period formatting via `TO_CHAR`:
  - Weekly: `'IYYY-"W"IW'` (ISO week number format, e.g., "2024-W01")
  - Monthly: `'YYYY-MM'` (e.g., "2024-01")
- Conditional aggregation with `FILTER` clauses for income/expense/transfer amounts
- Returns data ordered by entity ID and period ascending

### Calculation Flow

1. Query groups transactions by entity (account/category) and period
2. Repository calculates trends per period using `calculateTrendMetrics()`
3. Repository calculates overall trend using `calculateOverallTrend()`
4. Service sets default frequency to "monthly" if not provided
5. Resource returns formatted response

## Architecture

- **Schema**: [summary_trend_schema.go](../internal/database/schemas/summary_trend_schema.go)
- **Repository**: `GetAccountTrend()` and `GetCategoryTrend()` in [summary_repository.go](../internal/repositories/summary_repository.go)
- **Service**: `GetAccountTrend()` and `GetCategoryTrend()` in [summary_service.go](../internal/services/summary_service.go)
- **Resource**: `GetAccountTrends()` and `GetCategoryTrends()` in [summary_resource.go](../internal/resources/summary_resource.go)

## Testing

Comprehensive tests cover all layers:

### Repository Tests ([summary_repository_test.go](../internal/repositories/summary_repository_test.go))

- `TestSummaryRepositoryGetAccountTrend`: Monthly/weekly trends, empty data handling, SQL query validation
- `TestSummaryRepositoryGetCategoryTrend`: Category-specific trends, multiple periods, trend calculations

### Service Tests ([summary_service_test.go](../internal/services/summary_service_test.go))

- `TestSummaryServiceGetAccountTrend`: Default frequency handling, error propagation
- `TestSummaryServiceGetCategoryTrend`: Service layer validation and business logic

### Resource Tests ([summary_resource_test.go](../internal/resources/summary_resource_test.go))

- `TestSummaryResourceGetAccountTrends`: HTTP endpoint validation, status codes, frequency parameters
- `TestSummaryResourceGetCategoryTrends`: Response format validation, error handling

All tests validate:

- Correct percentage change calculations
- Proper trend direction detection (increasing/decreasing/stable/volatile)
- Empty result handling
- Both weekly and monthly frequency support
- Query parameter handling (startDate, endDate, frequency)

## Use Cases

- **Financial Planning**: Identify accounts with increasing expenses
- **Budget Analysis**: Track which categories are growing or shrinking
- **Spending Insights**: Understand volatility in spending patterns
- **Income Tracking**: Monitor income growth trends across time
