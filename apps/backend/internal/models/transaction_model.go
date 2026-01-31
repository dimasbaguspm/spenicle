package models

import "time"

type TransactionsSearchModel struct {
	PageNumber            int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize              int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy                string   `query:"sortBy" default:"date" enum:"id,type,date,amount,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder             string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order (asc or desc)"`
	IDs                   []int    `query:"id" doc:"Filter by transaction IDs"`
	Type                  []string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	AccountIDs            []int    `query:"accountId" doc:"Filter by account IDs (source or destination)"`
	CategoryIDs           []int    `query:"categoryId" doc:"Filter by category IDs"`
	DestinationAccountIDs []int    `query:"destinationAccountId" doc:"Filter by destination account IDs (transfers)"`
	TagIDs                []int    `query:"tagId" doc:"Filter by tag IDs"`
	StartDate             string   `query:"startDate" doc:"Filter by start date (YYYY-MM-DD)" format:"date-time"`
	EndDate               string   `query:"endDate" doc:"Filter by end date (YYYY-MM-DD)" format:"date-time"`
	MinAmount             int64    `query:"minAmount" doc:"Filter by minimum amount" minimum:"0"`
	MaxAmount             int64    `query:"maxAmount" doc:"Filter by maximum amount" minimum:"0"`
}

type TransactionAccountEmbedded struct {
	ID        int64   `json:"id" doc:"Account ID"`
	Name      string  `json:"name" doc:"Account name"`
	Type      string  `json:"type" enum:"expense,income" doc:"Account type"`
	Amount    int64   `json:"amount" doc:"Account balance"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color"`
}

type TransactionCategoryEmbedded struct {
	ID        int64   `json:"id" doc:"Category ID"`
	Name      string  `json:"name" doc:"Category name"`
	Type      string  `json:"type" enum:"expense,income,transfer" doc:"Category type"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color"`
}

type TransactionTagEmbedded struct {
	ID   int64  `json:"id" doc:"Tag ID"`
	Name string `json:"name" doc:"Tag name"`
}

type TransactionTemplateEmbedded struct {
	ID         int64      `json:"id" doc:"Template ID"`
	Name       string     `json:"name" doc:"Template name"`
	Amount     int64      `json:"amount" doc:"Template amount"`
	Recurrence string     `json:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate  time.Time  `json:"startDate" doc:"Template start date" format:"date-time"`
	EndDate    *time.Time `json:"endDate" doc:"Template end date" format:"date-time"`
}

type TransactionModel struct {
	ID                 int64                        `json:"id" doc:"Unique identifier"`
	Type               string                       `json:"type" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Date               time.Time                    `json:"date" doc:"Transaction date" format:"date-time"`
	Amount             int64                        `json:"amount" doc:"Transaction amount"`
	Account            TransactionAccountEmbedded   `json:"account" doc:"Source account details"`
	Category           TransactionCategoryEmbedded  `json:"category" doc:"Category details"`
	DestinationAccount *TransactionAccountEmbedded  `json:"destinationAccount,omitempty" doc:"Destination account (transfers only)"`
	Tags               []TransactionTagEmbedded     `json:"tags" doc:"Transaction tags"`
	Template           *TransactionTemplateEmbedded `json:"template" doc:"Associated transaction template details"`
	Note               *string                      `json:"note,omitempty" doc:"Transaction notes"`
	CreatedAt          time.Time                    `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt          *time.Time                   `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt          *time.Time                   `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type TransactionsPagedModel struct {
	Items      []TransactionModel `json:"items" doc:"List of transactions"`
	PageNumber int                `json:"pageNumber" doc:"Current page number"`
	PageSize   int                `json:"pageSize" doc:"Items per page"`
	TotalCount int                `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                `json:"totalPages" doc:"Total number of pages"`
}

type CreateTransactionModel struct {
	Type                 string    `json:"type" minLength:"1" required:"true" enum:"expense,income,transfer" doc:"Transaction type"`
	Date                 time.Time `json:"date" required:"true" doc:"Transaction date" format:"date-time"`
	Amount               int64     `json:"amount" required:"true" minimum:"1" doc:"Transaction amount"`
	AccountID            int64     `json:"accountId" required:"true" minimum:"1" doc:"Source account ID"`
	CategoryID           int64     `json:"categoryId" required:"true" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64    `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string   `json:"note,omitempty" doc:"Optional transaction notes"`
}

type UpdateTransactionModel struct {
	Type                 *string    `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Date                 *time.Time `json:"date,omitempty" doc:"Transaction date" format:"date-time"`
	Amount               *int64     `json:"amount,omitempty" minimum:"1" doc:"Transaction amount"`
	AccountID            *int64     `json:"accountId,omitempty" minimum:"1" doc:"Source account ID"`
	CategoryID           *int64     `json:"categoryId,omitempty" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string    `json:"note,omitempty" doc:"Transaction notes"`
}
