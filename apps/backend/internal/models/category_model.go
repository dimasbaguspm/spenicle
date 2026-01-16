package models

import "time"

type CategoriesSearchModel struct {
	PageNumber int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string   `query:"sortBy" default:"createdAt" enum:"name,type,createdAt,updatedAt,displayOrder" doc:"Field to sort by"`
	SortOrder  string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order (asc or desc)"`
	ID         []int    `query:"id" doc:"Filter by category IDs"`
	Name       string   `query:"name" doc:"Filter by category name (partial match)"`
	Type       []string `query:"type" enum:"expense,income,transfer" doc:"Filter by category type"`
	Archived   string   `query:"archived" doc:"Filter by archived status (true or false)"`
}

type CategoryModel struct {
	ID           int64      `json:"id" doc:"Unique identifier"`
	Name         string     `json:"name" minLength:"1" doc:"Category name"`
	Type         string     `json:"type" minLength:"1" enum:"expense,income,transfer" doc:"Category type"`
	Note         string     `json:"note" doc:"Category notes"`
	Icon         *string    `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor    *string    `json:"iconColor,omitempty" doc:"Icon color code"`
	DisplayOrder int        `json:"displayOrder" doc:"Display order sequence"`
	ArchivedAt   *time.Time `json:"archivedAt,omitempty" doc:"Timestamp when archived (null if active)" format:"date-time"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type CategoriesPagedModel struct {
	Items      []CategoryModel `json:"items" doc:"List of categories"`
	PageNumber int             `json:"pageNumber" doc:"Current page number"`
	PageSize   int             `json:"pageSize" doc:"Items per page"`
	TotalCount int             `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int             `json:"totalPages" doc:"Total number of pages"`
}

type CreateCategoryModel struct {
	Name      string  `json:"name" minLength:"1" required:"true" doc:"Category name"`
	Type      string  `json:"type" minLength:"1" required:"true" enum:"expense,income,transfer" doc:"Category type"`
	Note      string  `json:"note" doc:"Optional category notes"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color code"`
}

type UpdateCategoryModel struct {
	Name       *string `json:"name,omitempty" minLength:"1" doc:"Category name"`
	Type       *string `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Category type"`
	Note       *string `json:"note,omitempty" doc:"Category notes"`
	Icon       *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor  *string `json:"iconColor,omitempty" doc:"Icon color code"`
	ArchivedAt *string `json:"archivedAt,omitempty" doc:"Archive status (null string to unarchive, any other value to archive)"`
}

type ReorderCategoriesModel struct {
	Items []int64 `json:"items" doc:"Ordered list of category IDs, first item will receive displayOrder 0"`
}
