package schemas

type SearchParamTransactionSchema struct {
	Type           string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type" example:"expense"`
	AccountID      int    `query:"account_id" doc:"Filter by account ID" example:"1" minimum:"0"`
	CategoryID     int    `query:"category_id" doc:"Filter by category ID" example:"1" minimum:"0"`
	Page           int    `query:"page" default:"1" minimum:"1" doc:"Page number for pagination" example:"1"`
	Limit          int    `query:"limit" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page" example:"10"`
	OrderBy        string `query:"orderBy" default:"created_at" enum:"id,type,date,amount,created_at,updated_at" doc:"Field to order by" example:"date"`
	OrderDirection string `query:"orderDirection" default:"desc" enum:"asc,desc" doc:"Order direction" example:"desc"`
}
