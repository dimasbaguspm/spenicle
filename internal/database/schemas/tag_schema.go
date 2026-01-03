package schemas

import "time"

// TagSchema represents a tag in the database
type TagSchema struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

// CreateTagSchema is the input for creating a new tag
type CreateTagSchema struct {
	Name string `json:"name" maxLength:"50" minLength:"1" doc:"Tag name" example:"bali-2026"`
}

// PaginatedTagSchema represents a paginated list of tags
type PaginatedTagSchema struct {
	Data       []TagSchema `json:"data"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalItems int         `json:"totalItems"`
	TotalPages int         `json:"totalPages"`
}

// SearchParamTagSchema represents query parameters for searching tags
type SearchParamTagSchema struct {
	Page   int    `query:"page" minimum:"1" default:"1" doc:"Page number"`
	Limit  int    `query:"limit" minimum:"1" maximum:"100" default:"10" doc:"Items per page"`
	Search string `query:"search" maxLength:"50" doc:"Search by tag name"`
}

// DeleteTagInput represents the input for deleting a tag
type DeleteTagInput struct {
	ID int `path:"id" minimum:"1" doc:"Tag ID to delete" example:"1"`
}
