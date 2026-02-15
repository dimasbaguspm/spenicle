package models

import "time"

type TransactionTemplateRecurringStats struct {
	Occurrences int64  `json:"occurrences" doc:"Number of related transactions created"`
	Remaining   *int64 `json:"remaining" doc:"Number of remaining occurrences (null if no end date)"`
	TotalSpent  int64  `json:"totalSpent" doc:"Total amount spent from related transactions"`
}

type TransactionTemplateModel struct {
	ID                 int64                             `json:"id" doc:"Unique identifier"`
	Name               string                            `json:"name" doc:"Template name"`
	Type               string                            `json:"type" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount             int64                             `json:"amount" doc:"Template amount in base currency (IDR)"`
	CurrencyCode       *string                           `json:"currencyCode,omitempty" doc:"ISO 4217 currency code (null = base currency only)"`
	Account            TransactionAccountEmbedded        `json:"account" doc:"Source account details"`
	Category           TransactionCategoryEmbedded       `json:"category" doc:"Category details"`
	DestinationAccount *TransactionAccountEmbedded       `json:"destinationAccount,omitempty" doc:"Destination account details (transfers only)"`
	Note               *string                           `json:"note,omitempty" doc:"Template notes"`
	Recurrence         string                            `json:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate          time.Time                         `json:"startDate" doc:"Template start date" format:"date-time"`
	EndDate            *time.Time                        `json:"endDate" doc:"Template end date" format:"date-time"`
	NextDueAt          *time.Time                        `json:"nextDueAt" doc:"Next due date for recurring transactions" format:"date-time"`
	LastExecutedAt     *time.Time                        `json:"lastExecutedAt,omitempty" doc:"Last execution timestamp" format:"date-time"`
	RecurringStats     TransactionTemplateRecurringStats `json:"recurringStats" doc:"Recurring transaction statistics"`
	CreatedAt          time.Time                         `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt          time.Time                         `json:"updatedAt" doc:"Last update timestamp" format:"date-time"`
	DeletedAt          *time.Time                        `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type TransactionTemplatesSearchModel struct {
	PageNumber           int    `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize             int    `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy               string `query:"sortBy" default:"createdAt" enum:"id,name,amount,type,createdAt,updatedAt,nextDueAt" doc:"Field to sort by"`
	SortOrder            string `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	Name                 string `query:"name" doc:"Search by template name"`
	Type                 string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	AccountID            int64  `query:"accountId" minimum:"1" doc:"Filter by source account ID"`
	CategoryID           int64  `query:"categoryId" minimum:"1" doc:"Filter by category ID"`
	DestinationAccountID int64  `query:"destinationAccountId" minimum:"1" doc:"Filter by destination account ID"`
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
	Amount               int64      `json:"amount" required:"true" minimum:"1" doc:"Template amount in base currency (IDR)"`
	CurrencyCode         *string    `json:"currencyCode,omitempty" minLength:"3" maxLength:"3" doc:"ISO 4217 currency code (optional, defaults to base currency)"`
	AccountID            int64      `json:"accountId" required:"true" minimum:"1" doc:"Source account ID"`
	CategoryID           int64      `json:"categoryId" required:"true" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string    `json:"note,omitempty" doc:"Template notes"`
	Recurrence           string     `json:"recurrence" required:"true" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate            time.Time  `json:"startDate" required:"true" doc:"Template start date" format:"date-time"`
	EndDate              *time.Time `json:"endDate,omitempty" doc:"Template end date" format:"date-time"`
}

type UpdateTransactionTemplateModel struct {
	Name                 *string    `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"Template name"`
	Type                 *string    `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               *int64     `json:"amount,omitempty" minimum:"1" doc:"Template amount in base currency (IDR)"`
	CurrencyCode         *string    `json:"currencyCode,omitempty" minLength:"3" maxLength:"3" doc:"ISO 4217 currency code (null = base currency only, affects future-dated transactions)"`
	AccountID            *int64     `json:"accountId,omitempty" minimum:"1" doc:"Source account ID"`
	CategoryID           *int64     `json:"categoryId,omitempty" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string    `json:"note,omitempty" doc:"Template notes"`
	Recurrence           *string    `json:"recurrence,omitempty" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	EndDate              *time.Time `json:"endDate,omitempty" doc:"Template end date" format:"date-time"`
}

type TransactionTemplateRelatedTransactionsSearchModel struct {
	PageNumber            int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize              int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy                string   `query:"sortBy" default:"date" enum:"id,type,date,amount,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder             string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order (asc or desc)"`
	Type                  []string `query:"type" enum:"expense,income,transfer" doc:"Filter by transaction type"`
	AccountIDs            []int    `query:"accountId" doc:"Filter by source account IDs"`
	CategoryIDs           []int    `query:"categoryId" doc:"Filter by category IDs"`
	DestinationAccountIDs []int    `query:"destinationAccountId" doc:"Filter by destination account IDs (transfers)"`
	TagIDs                []int    `query:"tagId" doc:"Filter by tag IDs"`
	StartDate             string   `query:"startDate" doc:"Filter by start date (YYYY-MM-DD)" format:"date-time"`
	EndDate               string   `query:"endDate" doc:"Filter by end date (YYYY-MM-DD)" format:"date-time"`
	MinAmount             int64    `query:"minAmount" doc:"Filter by minimum amount" minimum:"0"`
	MaxAmount             int64    `query:"maxAmount" doc:"Filter by maximum amount" minimum:"0"`
}

type TransactionTemplateRelatedTransactionsPagedModel struct {
	Items      []TransactionModel `json:"items" doc:"List of related transactions"`
	PageNumber int                `json:"pageNumber" doc:"Current page number"`
	PageSize   int                `json:"pageSize" doc:"Items per page"`
	TotalCount int                `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                `json:"totalPages" doc:"Total number of pages"`
}
