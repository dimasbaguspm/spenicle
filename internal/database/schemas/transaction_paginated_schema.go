package schemas

import (
	"github.com/jackc/pgx/v5"
)

type PaginatedTransactionSchema struct {
	Data       []TransactionSchema `json:"data"`
	Page       int                 `json:"page"`
	Limit      int                 `json:"limit"`
	TotalItems int                 `json:"total_items"`
	TotalPages int                 `json:"total_pages"`
}

func (p *PaginatedTransactionSchema) FromRows(rows pgx.Rows) error {
	for rows.Next() {
		var transaction TransactionSchema
		err := rows.Scan(
			&transaction.ID,
			&transaction.Type,
			&transaction.Date,
			&transaction.Amount,
			&transaction.AccountID,
			&transaction.CategoryID,
			&transaction.Note,
			&transaction.CreatedAt,
			&transaction.UpdatedAt,
			&transaction.DeletedAt,
		)
		if err != nil {
			return err
		}
		p.Data = append(p.Data, transaction)
	}
	return rows.Err()
}
