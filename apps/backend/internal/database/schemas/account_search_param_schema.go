package schemas

// SearchParamAccountSchema represents the search parameters for querying accounts
type SearchParamAccountSchema struct {
	ID         []int    `query:"id" doc:"Filter by account ID" minimum:"0"`
	Name       string   `query:"name"`
	Type       []string `query:"type" enum:"expense,income"`
	Archived   string   `query:"archived" doc:"Filter by archived state (true=archived, false=active, empty=all)" enum:"true,false"`
	SortBy     string   `query:"sortBy" enum:"name,type,amount,displayOrder,createdAt,updatedAt"`
	SortOrder  string   `query:"sortOrder" enum:"asc,desc"`
	PageNumber int      `query:"pageNumber" minimum:"1" default:"1"`
	PageSize   int      `query:"pageSize" minimum:"1" maximum:"100" default:"10"`
}
