package schemas

// SearchParamCategorySchema represents the search parameters for querying categories
type SearchParamCategorySchema struct {
	ID         []int    `query:"id" doc:"Filter by category ID" minimum:"0"`
	Name       string   `query:"name"`
	Type       []string `query:"type" enum:"expense,income,transfer"`
	Archived   string   `query:"archived" doc:"Filter by archived state (true=archived, false=active, empty=all)\" enum:\"true,false"`
	SortBy     string   `query:"sortBy" enum:"name,type,displayOrder,createdAt,updatedAt"`
	SortOrder  string   `query:"sortOrder" enum:"asc,desc"`
	PageNumber int      `query:"pageNumber" minimum:"1" default:"1"`
	PageSize   int      `query:"pageSize" minimum:"1" maximum:"100" default:"10"`
}
