package schemas

import (
	"encoding/json"

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
		var destAccountID, destAccountAmount *int64
		var destAccountName, destAccountType, destAccountIcon, destAccountIconColor *string
		var tagsJSON []byte

		err := rows.Scan(
			&transaction.ID,
			&transaction.Type,
			&transaction.Date,
			&transaction.Amount,
			&transaction.Note,
			&transaction.CreatedAt,
			&transaction.UpdatedAt,
			&transaction.DeletedAt,
			// Account
			&transaction.Account.ID,
			&transaction.Account.Name,
			&transaction.Account.Type,
			&transaction.Account.Amount,
			&transaction.Account.Icon,
			&transaction.Account.IconColor,
			// Category
			&transaction.Category.ID,
			&transaction.Category.Name,
			&transaction.Category.Type,
			&transaction.Category.Icon,
			&transaction.Category.IconColor,
			// Destination Account (nullable)
			&destAccountID,
			&destAccountName,
			&destAccountType,
			&destAccountAmount,
			&destAccountIcon,
			&destAccountIconColor,
			// Tags (JSON array)
			&tagsJSON,
		)
		if err != nil {
			return err
		}

		// Populate internal ID fields for DB operations
		transaction.AccountID = int(transaction.Account.ID)
		transaction.CategoryID = int(transaction.Category.ID)

		// Populate destination account if present
		if destAccountID != nil {
			destAccID := int(*destAccountID)
			transaction.DestinationAccountID = &destAccID
			transaction.DestinationAccount = &TransactionAccountSchema{
				ID:        *destAccountID,
				Name:      *destAccountName,
				Type:      *destAccountType,
				Amount:    *destAccountAmount,
				Icon:      destAccountIcon,
				IconColor: destAccountIconColor,
			}
		}

		// Unmarshal tags JSON
		if len(tagsJSON) > 0 {
			if err := json.Unmarshal(tagsJSON, &transaction.Tags); err != nil {
				return err
			}
		}
		if transaction.Tags == nil {
			transaction.Tags = []TransactionTagSchema{}
		}

		p.Items = append(p.Items, transaction)
	}
	return rows.Err()
}
