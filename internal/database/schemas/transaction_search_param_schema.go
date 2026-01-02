package schemas

type SearchParamTransactionSchema struct {
	ID             []int    `query:"id" doc:"Filter by transaction ID" minimum:"0"`
	Type           []string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	AccountIDs     []int    `query:"accountId" doc:"Filter by account ID" minimum:"0"`
	CategoryIDs    []int    `query:"categoryId" doc:"Filter by category ID" minimum:"0"`
	Page           int      `query:"page" default:"1" minimum:"1" doc:"Page number for pagination" example:"1"`
	Limit          int      `query:"limit" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page" example:"10"`
	OrderBy        string   `query:"orderBy" default:"createdAt" enum:"id,type,date,amount,createdAt,updatedAt" doc:"Field to order by" example:"date"`
	OrderDirection string   `query:"orderDirection" default:"desc" enum:"asc,desc" doc:"Order direction" example:"desc"`
}
