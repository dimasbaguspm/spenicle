package models

import "time"

// TagModel represents a tag
type TagModel struct {
	ID        int64      `json:"id" doc:"Unique identifier"`
	Name      string     `json:"name" doc:"Tag name"`
	CreatedAt time.Time  `json:"createdAt" doc:"Creation timestamp"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp"`
}

// ListTagsRequestModel defines query parameters for tag listing endpoint
type ListTagsRequestModel struct {
	PageNumber int    `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int    `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string `query:"sortBy" default:"createdAt" enum:"id,name,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder  string `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	Name       string `query:"name" doc:"Search by tag name"`
}

// ListTagsResponseModel represents paginated list of tags
type ListTagsResponseModel struct {
	Data       []TagModel `json:"data" doc:"List of tags"`
	PageNumber int        `json:"pageNumber" doc:"Current page number"`
	PageSize   int        `json:"pageSize" doc:"Items per page"`
	TotalCount int        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int        `json:"totalPages" doc:"Total number of pages"`
}

// CreateTagRequestModel represents input for creating a tag
type CreateTagRequestModel struct {
	Name string `json:"name" required:"true" minLength:"1" maxLength:"50" doc:"Tag name"`
}

// CreateTagResponseModel is the response when creating a tag
type CreateTagResponseModel struct {
	TagModel
}

// GetTagResponseModel is the response for getting a single tag
type GetTagResponseModel struct {
	TagModel
}

// UpdateTagRequestModel represents input for updating a tag
type UpdateTagRequestModel struct {
	Name *string `json:"name,omitempty" minLength:"1" maxLength:"50" doc:"Tag name"`
}

// UpdateTagResponseModel is the response when updating a tag
type UpdateTagResponseModel struct {
	TagModel
}

// DeleteTagResponseModel is the response for deleting a tag
type DeleteTagResponseModel struct{}
