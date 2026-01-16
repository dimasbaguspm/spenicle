package models

import "time"

type TagModel struct {
	ID        int64      `json:"id" doc:"Unique identifier"`
	Name      string     `json:"name" doc:"Tag name"`
	Color     *string    `json:"color,omitempty" doc:"Tag color code"`
	CreatedAt time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type TagsSearchModel struct {
	PageNumber int    `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int    `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string `query:"sortBy" default:"createdAt" enum:"id,name,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder  string `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	Name       string `query:"name" doc:"Search by tag name"`
}

type TagsPagedModel struct {
	Items      []TagModel `json:"items" doc:"List of tags"`
	PageNumber int        `json:"pageNumber" doc:"Current page number"`
	PageSize   int        `json:"pageSize" doc:"Items per page"`
	TotalCount int        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int        `json:"totalPages" doc:"Total number of pages"`
}

type CreateTagModel struct {
	Name  string  `json:"name" required:"true" minLength:"1" maxLength:"50" doc:"Tag name"`
	Color *string `json:"color,omitempty" maxLength:"7" doc:"Tag color code"`
}

type UpdateTagModel struct {
	Name  *string `json:"name,omitempty" minLength:"1" maxLength:"50" doc:"Tag name"`
	Color *string `json:"color,omitempty" maxLength:"7" doc:"Tag color code"`
}
