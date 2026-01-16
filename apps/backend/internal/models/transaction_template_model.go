package models

import "time"

type TransactionTemplateModel struct {
	ID                 int64                       `json:"id" doc:"Unique identifier"`
	Name               string                      `json:"name" doc:"Template name"`
	Type               string                      `json:"type" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount             int64                       `json:"amount" doc:"Template amount"`
	Account            TransactionAccountEmbedded  `json:"account" doc:"Source account details"`
	Category           TransactionCategoryEmbedded `json:"category" doc:"Category details"`
	DestinationAccount *TransactionAccountEmbedded `json:"destinationAccount,omitempty" doc:"Destination account details (transfers only)"`
	Note               *string                     `json:"note,omitempty" doc:"Template notes"`
	Recurrence         string                      `json:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate          time.Time                   `json:"startDate" doc:"Template start date" format:"date"`
	EndDate            *time.Time                  `json:"endDate,omitempty" doc:"Template end date" format:"date"`
	LastExecutedAt     *time.Time                  `json:"lastExecutedAt,omitempty" doc:"Last execution timestamp" format:"date-time"`
	CreatedAt          time.Time                   `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt          time.Time                   `json:"updatedAt" doc:"Last update timestamp" format:"date-time"`
	DeletedAt          *time.Time                  `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type TransactionTemplatesSearchModel struct {
	PageNumber           int    `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize             int    `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy               string `query:"sortBy" default:"createdAt" enum:"id,name,amount,type,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder            string `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	Name                 string `query:"name" doc:"Search by template name"`
	Type                 string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	AccountID            *int64 `query:"accountId" minimum:"1" doc:"Filter by source account ID"`
	CategoryID           *int64 `query:"categoryId" minimum:"1" doc:"Filter by category ID"`
	DestinationAccountID *int64 `query:"destinationAccountId" minimum:"1" doc:"Filter by destination account ID"`
}

type TransactionTemplatesPagedModel struct {
	Items      []TransactionTemplateModel `json:"items" doc:"List of transaction templates"`
	PageNumber int                        `json:"pageNumber" doc:"Current page number"`
	PageSize   int                        `json:"pageSize" doc:"Items per page"`
	TotalCount int                        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                        `json:"totalPages" doc:"Total number of pages"`
}

type CreateTransactionTemplateModel struct {
	Name                 string     `json:"name" required:"true" minLength:"1" maxLength:"100" doc:"Template name"`
	Type                 string     `json:"type" required:"true" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               int64      `json:"amount" required:"true" minimum:"1" doc:"Template amount"`
	AccountID            int64      `json:"accountId" required:"true" minimum:"1" doc:"Source account ID"`
	CategoryID           int64      `json:"categoryId" required:"true" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string    `json:"note,omitempty" doc:"Template notes"`
	Recurrence           string     `json:"recurrence" required:"true" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate            time.Time  `json:"startDate" required:"true" doc:"Template start date" format:"date"`
	EndDate              *time.Time `json:"endDate,omitempty" doc:"Template end date" format:"date"`
}

type UpdateTransactionTemplateModel struct {
	Name                 *string    `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"Template name"`
	Type                 *string    `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               *int64     `json:"amount,omitempty" minimum:"1" doc:"Template amount"`
	AccountID            *int64     `json:"accountId,omitempty" minimum:"1" doc:"Source account ID"`
	CategoryID           *int64     `json:"categoryId,omitempty" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string    `json:"note,omitempty" doc:"Template notes"`
	Recurrence           *string    `json:"recurrence,omitempty" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate            *time.Time `json:"startDate,omitempty" doc:"Template start date" format:"date"`
	EndDate              *time.Time `json:"endDate,omitempty" doc:"Template end date" format:"date"`
}
