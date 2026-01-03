package schemas

import (
	"time"

	"github.com/jackc/pgx/v5"
)

// TransactionTemplateSchema represents a recurring transaction template
type TransactionTemplateSchema struct {
	ID                 int64      `json:"id" doc:"Unique identifier"`
	AccountID          int64      `json:"accountId" doc:"Account ID for the transaction"`
	CategoryID         int64      `json:"categoryId" doc:"Category ID for the transaction"`
	Type               string     `json:"type" doc:"Transaction type: income, expense, transfer" enum:"income,expense,transfer"`
	Amount             int        `json:"amount" doc:"Transaction amount in cents"`
	Description        *string    `json:"description,omitempty" doc:"Transaction description"`
	Recurrence         string     `json:"recurrence" doc:"Recurrence pattern: none, daily, weekly, monthly, yearly" enum:"none,daily,weekly,monthly,yearly"`
	StartDate          time.Time  `json:"startDate" doc:"Start date for recurring transactions"`
	EndDate            *time.Time `json:"endDate,omitempty" doc:"End date for recurring transactions (optional)"`
	InstallmentCount   *int       `json:"installmentCount,omitempty" doc:"Total number of installments (for installment payments)"`
	InstallmentCurrent int        `json:"installmentCurrent" doc:"Current installment number (0-based)"`
	Note               *string    `json:"note,omitempty" doc:"Additional notes"`
	CreatedAt          time.Time  `json:"createdAt" doc:"Creation timestamp"`
	UpdatedAt          time.Time  `json:"updatedAt" doc:"Last update timestamp"`
	DeletedAt          *time.Time `json:"deletedAt,omitempty" doc:"Deletion timestamp (soft delete)"`
}

// FromRows scans multiple rows into TransactionTemplateSchema slice
func (s PaginatedTransactionTemplateSchema) FromRows(rows pgx.Rows) ([]TransactionTemplateSchema, error) {
	items := []TransactionTemplateSchema{}
	for rows.Next() {
		var item TransactionTemplateSchema
		err := rows.Scan(
			&item.ID,
			&item.AccountID,
			&item.CategoryID,
			&item.Type,
			&item.Amount,
			&item.Description,
			&item.Recurrence,
			&item.StartDate,
			&item.EndDate,
			&item.InstallmentCount,
			&item.InstallmentCurrent,
			&item.Note,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
