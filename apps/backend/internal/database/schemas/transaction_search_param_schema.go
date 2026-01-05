package schemas

type SearchParamTransactionSchema struct {
	ID                    []int    `query:"id" doc:"Filter by transaction ID" minimum:"0"`
	Type                  []string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	StartDate             string   `query:"startDate" doc:"Filter by start date (inclusive)" format:"date" example:"2023-01-01"`
	EndDate               string   `query:"endDate" doc:"Filter by end date (inclusive)" format:"date" example:"2023-12-31"`
	MinAmount             int64    `query:"minAmount" doc:"Filter by minimum amount" example:"1000"`
	MaxAmount             int64    `query:"maxAmount" doc:"Filter by maximum amount" example:"5000"`
	AccountIDs            []int    `query:"accountIds" doc:"Filter by account IDs" minimum:"0"`
	DestinationAccountIDs []int    `query:"destinationAccountIds" doc:"Filter by destination account IDs" minimum:"0"`
	CategoryIDs           []int    `query:"categoryIds" doc:"Filter by category IDs" minimum:"0"`
	TagIDs                []int    `query:"tagIds" doc:"Filter by tag IDs (returns transactions with any of these tags)" minimum:"0"`
	PageNumber            int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination" example:"1"`
	PageSize              int      `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page" example:"10"`
	SortBy                string   `query:"sortBy" default:"createdAt" enum:"id,type,date,amount,createdAt,updatedAt" doc:"Field to order by" example:"date"`
	SortOrder             string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Order direction" example:"desc"`
}
