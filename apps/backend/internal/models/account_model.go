package models

import "time"

type AccountsSearchModel struct {
	PageNumber int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string   `query:"sortBy" default:"createdAt" enum:"name,type,amount,displayOrder,createdAt,updatedAt" doc:"Field to sort by (name, type, amount, displayOrder, createdAt, updatedAt)"`
	SortOrder  string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order (asc or desc)"`
	ID         []int    `query:"id" doc:"Filter by account IDs"`
	Name       string   `query:"name" doc:"Filter by account name (partial match)"`
	Type       []string `query:"type" enum:"expense,income" doc:"Filter by account type (expense or income)"`
	Archived   string   `query:"archived" doc:"Filter by archived status (true or false)"`
}

type AccountModel struct {
	ID           int64      `json:"id" doc:"Unique identifier"`
	Name         string     `json:"name" minLength:"1" doc:"Account name"`
	Type         string     `json:"type" minLength:"1" enum:"expense,income" doc:"Account type (expense or income)"`
	Note         string     `json:"note" doc:"Account notes"`
	Amount       int64      `json:"amount" doc:"Current balance"`
	Icon         *string    `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor    *string    `json:"iconColor,omitempty" doc:"Icon color code"`
	DisplayOrder int        `json:"displayOrder" doc:"Display order sequence"`
	ArchivedAt   *time.Time `json:"archivedAt,omitempty" doc:"Timestamp when archived (null if active)"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type AccountsPagedModel struct {
	Items      []AccountModel `json:"items" doc:"List of accounts"`
	PageNumber int            `json:"pageNumber" doc:"Current page number"`
	PageSize   int            `json:"pageSize" doc:"Items per page"`
	TotalCount int            `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int            `json:"totalPages" doc:"Total number of pages"`
}

type CreateAccountModel struct {
	Name      string  `json:"name" minLength:"1" required:"true" doc:"Account name"`
	Type      string  `json:"type" minLength:"1" required:"true" enum:"expense,income" doc:"Account type (expense or income)"`
	Note      string  `json:"note" doc:"Optional account notes"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color code"`
}

type UpdateAccountModel struct {
	Name       *string `json:"name,omitempty" minLength:"1" doc:"Account name"`
	Type       *string `json:"type,omitempty" minLength:"1" enum:"expense,income" doc:"Account type (expense or income)"`
	Note       *string `json:"note,omitempty" doc:"Account notes"`
	Icon       *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor  *string `json:"iconColor,omitempty" doc:"Icon color code"`
	ArchivedAt *string `json:"archivedAt,omitempty" doc:"Archive status (null string to unarchive, any other value to archive)"`
}

type ReorderAccountItemModel struct {
	ID           int64 `json:"id" doc:"Account ID"`
	DisplayOrder int   `json:"displayOrder" doc:"New display order"`
}

type ReorderAccountsRequestModel struct {
	Data []ReorderAccountItemModel `json:"data" doc:"List of accounts to reorder"`
}
