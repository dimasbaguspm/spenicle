package pagerouter

import "github.com/dimasbaguspm/spenicle-tui/internal/clients"

type DashboardPageRoute struct {
	clients clients.Clients
}

func NewDashboardPageRoute(clients clients.Clients) DashboardPageRoute {
	return DashboardPageRoute{
		clients: clients,
	}
}

func (dr DashboardPageRoute) Render() string {
	return "Welcome to the Dashboard!"
}
