package clients

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type Clients struct {
	Auth                AuthClient
	Account             AccountClient
	Category            CategoryClient
	Transaction         TransactionClient
	Budget              BudgetClient
	BudgetTemplate      BudgetTemplateClient
	Summary             SummaryClient
	Tag                 TagClient
	TransactionTemplate TransactionTemplateClient
}

func NewClients(baseURL string, client http.Client) Clients {
	return Clients{
		Auth:                NewAuthClient(baseURL, client),
		Account:             NewAccountClient(baseURL, client),
		Category:            NewCategoryClient(baseURL, client),
		Transaction:         NewTransactionClient(baseURL, client),
		Budget:              NewBudgetClient(baseURL, client),
		BudgetTemplate:      NewBudgetTemplateClient(baseURL, client),
		Summary:             NewSummaryClient(baseURL, client),
		Tag:                 NewTagClient(baseURL, client),
		TransactionTemplate: NewTransactionTemplateClient(baseURL, client),
	}
}

func NewDefaultClient() http.Client {
	return http.Client{
		Timeout: models.DefaultTimeout,
	}
}
