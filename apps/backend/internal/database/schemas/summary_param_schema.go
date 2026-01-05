package schemas

import "time"

// SummaryParamModel defines the query parameters for summary endpoints
type SummaryParamModel struct {
	StartDate time.Time `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true"`
	EndDate   time.Time `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true"`
}

// SummaryTransactionParamModel defines the query parameters for transaction summary endpoint
type SummaryTransactionParamModel struct {
	SummaryParamModel
	Frequency string `query:"frequency" enum:"daily,weekly,monthly,yearly" default:"monthly" doc:"Grouping frequency" example:"monthly"`
}
