package models

import "time"

type ListCategoriesRequestModel struct {
	PageNumber int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string   `query:"sortBy" default:"createdAt" enum:"name,type,createdAt,updatedAt" doc:"Field to sort by"`
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
	ArchivedAt   *time.Time `json:"archivedAt,omitempty" doc:"Timestamp when archived (null if active)"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp"`
}

type ListCategoriesResponseModel struct {
	Data       []CategoryModel `json:"data" doc:"List of categories"`
	PageNumber int             `json:"pageNumber" doc:"Current page number"`
	PageSize   int             `json:"pageSize" doc:"Items per page"`
	TotalCount int             `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int             `json:"totalPages" doc:"Total number of pages"`
}

type CreateCategoryRequestModel struct {
	Name      string  `json:"name" minLength:"1" required:"true" doc:"Category name"`
	Type      string  `json:"type" minLength:"1" required:"true" enum:"expense,income,transfer" doc:"Category type"`
	Note      string  `json:"note" doc:"Optional category notes"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color code"`
}

type CreateCategoryResponseModel struct {
	CategoryModel
}

type GetCategoryResponseModel struct {
	CategoryModel
}

type UpdateCategoryRequestModel struct {
	Name       *string `json:"name,omitempty" minLength:"1" doc:"Category name"`
	Type       *string `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Category type"`
	Note       *string `json:"note,omitempty" doc:"Category notes"`
	Icon       *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor  *string `json:"iconColor,omitempty" doc:"Icon color code"`
	ArchivedAt *string `json:"archivedAt,omitempty" doc:"Archive status (null string to unarchive, any other value to archive)"`
}

type UpdateCategoryResponseModel struct {
	CategoryModel
}

type DeleteCategoryResponseModel struct {
}

type ReorderCategoryItemModel struct {
	ID           int64 `json:"id" doc:"Category ID"`
	DisplayOrder int   `json:"displayOrder" doc:"New display order"`
}

type ReorderCategoriesRequestModel struct {
	Items []ReorderCategoryItemModel `json:"items" doc:"List of categories to reorder"`
}

type ReorderCategoriesResponseModel struct {
}
