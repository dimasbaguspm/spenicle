package internal

import (
	"net/http"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/dimasbaguspm/spenicle-tui/internal/configs"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
	"github.com/dimasbaguspm/spenicle-tui/internal/routers"
)

type App struct {
	state     *models.App
	env       configs.Environment
	client    *http.Client
	initRoute routers.InitRoute
}

func NewApp(client *http.Client, env configs.Environment) *App {
	return &App{
		state:     &models.App{},
		env:       env,
		client:    client,
		initRoute: routers.NewInitRoute(env, *client),
	}
}

func (a *App) Init() tea.Cmd {
	a.state.Page = models.Page{ID: "dashboard", Name: "Dashboard", Path: "/dashboard"}

	a.initRoute.OnSuccess = func(resp models.LoginResponseModel) {
		a.state.Session = &resp
	}

	return a.initRoute.Init()
}

func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if keyMsg, ok := msg.(tea.KeyMsg); ok && keyMsg.String() == tea.KeyCtrlC.String() {
		return a, tea.Quit
	}

	if a.state.Session == nil {
		updatedRoute, cmd := a.initRoute.HandleUpdate(msg)
		a.initRoute = updatedRoute
		return a, cmd
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "1":
			a.state.Page = models.Page{ID: "dashboard", Name: "Dashboard", Path: "/dashboard"}
		case "2":
			a.state.Page = models.Page{ID: "transactions", Name: "Transactions", Path: "/transactions"}
		}
	}
	return a, nil
}

func (a *App) View() string {
	if a.state.Session == nil {
		return a.initRoute.View()
	}

	var content string
	switch a.state.Page.ID {
	case "dashboard":
		content = routers.NewDashboardRoute().Render()
	case "transactions":
		content = routers.NewTransactionRoute().Render()
	default:
		content = "Unknown Page"
	}

	footer := "\n\nNavigation:\n[1] Home/Dashboard  [2] Transactions  [Ctrl+C] Quit"

	return content + footer
}
