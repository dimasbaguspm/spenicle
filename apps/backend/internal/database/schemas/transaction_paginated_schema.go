package schemas

import (
	"github.com/jackc/pgx/v5"
)

type PaginatedTransactionSchema struct {
	PageTotal  int                 `json:"pageTotal" doc:"Total number of pages" example:"5"`
	PageNumber int                 `json:"pageNumber" doc:"Current page number" example:"1"`
	PageSize   int                 `json:"pageSize" doc:"Number of items per page" example:"10"`
	TotalCount int                 `json:"totalCount" doc:"Total number of items" example:"50"`
	Items      []TransactionSchema `json:"items" doc:"List of transactions in current page"`
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
			&transaction.DestinationAccountID,
			&transaction.Note,
			&transaction.CreatedAt,
			&transaction.UpdatedAt,
			&transaction.DeletedAt,
		)
		if err != nil {
			return err
		}
		p.Items = append(p.Items, transaction)
	}
	return rows.Err()
}
