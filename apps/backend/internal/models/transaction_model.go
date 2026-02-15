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
	TemplateIDs           []int    `query:"templateId" doc:"Filter by transaction template IDs"`
	TagIDs                []int    `query:"tagId" doc:"Filter by tag IDs"`
	CurrencyCodes         []string `query:"currencyCode" doc:"Filter by currency codes (e.g., USD, EUR)"`
	StartDate             string   `query:"startDate" doc:"Filter by start date (YYYY-MM-DD)" format:"date-time"`
	EndDate               string   `query:"endDate" doc:"Filter by end date (YYYY-MM-DD)" format:"date-time"`
	MinAmount             int64    `query:"minAmount" doc:"Filter by minimum amount" minimum:"0"`
	MaxAmount             int64    `query:"maxAmount" doc:"Filter by maximum amount" minimum:"0"`
	Latitude              float64  `query:"latitude" doc:"Latitude for geospatial search" minimum:"-90" maximum:"90"`
	Longitude             float64  `query:"longitude" doc:"Longitude for geospatial search" minimum:"-180" maximum:"180"`
	RadiusMeters          int      `query:"radiusMeters" default:"500" minimum:"100" maximum:"50000" doc:"Search radius in meters"`
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
	Amount             int64                        `json:"amount" doc:"Transaction amount in base currency (IDR)"`
	AmountForeign      *int64                       `json:"amountForeign,omitempty" doc:"Foreign currency amount (as input by user). Null if transaction is in base currency."`
	CurrencyCode       *string                      `json:"currencyCode,omitempty" doc:"ISO 4217 currency code for foreign amount (e.g., USD, EUR). Null if transaction is in base currency."`
	ExchangeRate       *float64                     `json:"exchangeRate,omitempty" doc:"Exchange rate applied: foreign_currency → base_currency (IDR). e.g., 16500.5 for USD→IDR. Null if no conversion."`
	ExchangeAt         *time.Time                   `json:"exchangeAt,omitempty" doc:"Timestamp when the currency conversion was applied. Null for base currency transactions." format:"date-time"`
	Account            TransactionAccountEmbedded   `json:"account" doc:"Source account details"`
	Category           TransactionCategoryEmbedded  `json:"category" doc:"Category details"`
	DestinationAccount *TransactionAccountEmbedded  `json:"destinationAccount,omitempty" doc:"Destination account (transfers only)"`
	Latitude           *float64                     `json:"latitude,omitempty" doc:"Transaction latitude" minimum:"-90" maximum:"90"`
	Longitude          *float64                     `json:"longitude,omitempty" doc:"Transaction longitude" minimum:"-180" maximum:"180"`
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
	Amount               int64     `json:"amount" required:"true" minimum:"1" doc:"Transaction amount in the specified currency (defaults to base currency if currencyCode not provided)"`
	CurrencyCode         *string   `json:"currencyCode,omitempty" doc:"ISO 4217 currency code (e.g., USD, EUR). If omitted, amount is treated as base currency."`
	AccountID            int64     `json:"accountId" required:"true" minimum:"1" doc:"Source account ID"`
	CategoryID           int64     `json:"categoryId" required:"true" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64    `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Latitude             *float64  `json:"latitude,omitempty" doc:"Transaction latitude" minimum:"-90" maximum:"90"`
	Longitude            *float64  `json:"longitude,omitempty" doc:"Transaction longitude" minimum:"-180" maximum:"180"`
	Note                 *string   `json:"note,omitempty" doc:"Optional transaction notes"`
}

type UpdateTransactionModel struct {
	Type                 *string    `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Date                 *time.Time `json:"date,omitempty" doc:"Transaction date" format:"date-time"`
	Amount               *int64     `json:"amount,omitempty" minimum:"1" doc:"Transaction amount in the specified currency"`
	CurrencyCode         *string    `json:"currencyCode,omitempty" doc:"ISO 4217 currency code (e.g., USD, EUR)"`
	AccountID            *int64     `json:"accountId,omitempty" minimum:"1" doc:"Source account ID"`
	CategoryID           *int64     `json:"categoryId,omitempty" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64     `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Latitude             *float64   `json:"latitude,omitempty" doc:"Transaction latitude" minimum:"-90" maximum:"90"`
	Longitude            *float64   `json:"longitude,omitempty" doc:"Transaction longitude" minimum:"-180" maximum:"180"`
	Note                 *string    `json:"note,omitempty" doc:"Transaction notes"`
}

// Request model for saving draft (no draftId needed - one draft per user)
type BulkTransactionDraftModel struct {
	Updates []BulkTransactionUpdateItemModel `json:"updates" minLength:"1" maxLength:"500" doc:"List of transaction updates (max 500)"`
}

// Individual transaction update in bulk request
type BulkTransactionUpdateItemModel struct {
	ID int64 `json:"id" minimum:"1" doc:"Transaction ID to update"`
	UpdateTransactionModel
}

// Response model for draft operations
type BulkTransactionDraftResponseModel struct {
	TransactionCount int       `json:"transactionCount" doc:"Number of transactions in draft"`
	CreatedAt        time.Time `json:"createdAt" doc:"Draft creation timestamp" format:"date-time"`
	UpdatedAt        time.Time `json:"updatedAt" doc:"Draft last update timestamp" format:"date-time"`
	ExpiresAt        time.Time `json:"expiresAt" doc:"Draft expiration timestamp" format:"date-time"`
}

// Response model for commit operation
type BulkTransactionCommitResponseModel struct {
	SuccessCount int     `json:"successCount" doc:"Number of successfully updated transactions"`
	UpdatedIDs   []int64 `json:"updatedIds" doc:"List of updated transaction IDs"`
	DurationMs   int64   `json:"durationMs" doc:"Total processing time in milliseconds"`
}
