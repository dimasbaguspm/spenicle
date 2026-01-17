package pagerouter

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/dimasbaguspm/spenicle-tui/internal/clients"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type PageRouter struct {
	Init        InitPageRoute
	Dashboard   DashboardPageRoute
	Transaction TransactionPageRoute
}

func NewPageRouter(clients clients.Clients) PageRouter {
	return PageRouter{
		Init:        NewInitPageRoute(clients),
		Dashboard:   NewDashboardPageRoute(clients),
		Transaction: NewTransactionPageRoute(),
	}
}

func (pr *PageRouter) HandleKey(msg tea.Msg, currentPage *models.Page) (*models.Page, tea.Cmd) {
	if key, ok := msg.(tea.KeyMsg); ok {
		switch key.String() {
		case "1":
			return &models.Page{ID: "dashboard", Name: "Dashboard", Path: "/dashboard"}, nil
		case "2":
			return &models.Page{ID: "transactions", Name: "Transactions", Path: "/transactions"}, nil
		}
	}
	return currentPage, nil
}

func (pr *PageRouter) HandleView(page *models.Page) string {
	if page == nil {
		return "No Page"
	}

	switch page.ID {
	case "dashboard":
		return pr.Dashboard.Render()
	case "transactions":
		return pr.Transaction.Render()
	default:
		return "Unknown Page"
	}
}

func (pr *PageRouter) GetPages() map[string]*models.Page {
	return map[string]*models.Page{
		"Dashboard":    {ID: "dashboard", Name: "Dashboard", Path: "/dashboard"},
		"Transactions": {ID: "transactions", Name: "Transactions", Path: "/transactions"},
		"Summary":      {ID: "summary", Name: "Summary", Path: "/summary"},
		"Accounts":     {ID: "accounts", Name: "Accounts", Path: "/accounts"},
		"Categories":   {ID: "categories", Name: "Categories", Path: "/categories"},
		"Budgets":      {ID: "budgets", Name: "Budgets", Path: "/budgets"},
	}
}
