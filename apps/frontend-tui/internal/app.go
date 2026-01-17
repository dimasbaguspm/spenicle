package internal

import (
	"net/http"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/dimasbaguspm/spenicle-tui/internal/clients"
	"github.com/dimasbaguspm/spenicle-tui/internal/configs"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
	dialogrouter "github.com/dimasbaguspm/spenicle-tui/internal/routers/dialog-router"
	pagerouter "github.com/dimasbaguspm/spenicle-tui/internal/routers/page-router"
	"github.com/dimasbaguspm/spenicle-tui/internal/ui"
	overlay "github.com/rmhubbert/bubbletea-overlay"
)

type App struct {
	state        *models.App
	env          configs.Environment
	clients      clients.Clients
	pageRouter   pagerouter.PageRouter
	dialogRouter dialogrouter.DialogRouter
	ui           ui.UIs
	width        int
	height       int
}

func NewApp(client *http.Client, env configs.Environment) *App {
	clients := clients.NewClients(env.BaseAPIURL, *client)
	pageRouter := pagerouter.NewPageRouter(clients)
	dialogRouter := dialogrouter.NewDialogRouter()

	ui := ui.NewUIs()

	return &App{
		state:        &models.App{},
		env:          env,
		clients:      clients,
		pageRouter:   pageRouter,
		dialogRouter: dialogRouter,
		ui:           ui,
		width:        80, // default
		height:       24, // default
	}
}

func (a *App) Init() tea.Cmd {
	a.pageRouter.Init.OnSuccess = func(resp models.LoginResponseModel) {
		a.state.Page = &models.Page{ID: "dashboard", Name: "Dashboard", Path: "/dashboard"}
		a.state.Session = &resp
	}

	return tea.Batch(tea.EnterAltScreen, a.pageRouter.Init.Init())
}

func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		return a, nil

	case tea.KeyMsg:
		if a.state.Session == nil {
			return a, nil
		}

		newPage, pageCmd := a.pageRouter.HandleKey(msg, a.state.Page)
		a.state.Page = newPage

		newDrawer, drawerCmd := a.dialogRouter.HandleKey(msg, a.state.Drawer)
		a.state.Drawer = newDrawer

		if a.state.Drawer != nil {
			updatedDrawer, updateCmd := a.dialogRouter.HandleUpdate(msg, a.state.Drawer)
			a.state.Drawer = updatedDrawer
			drawerCmd = tea.Batch(drawerCmd, updateCmd)
		}

		return a, tea.Batch(pageCmd, drawerCmd)

	default:
		if a.state.Session == nil {
			updatedRoute, cmd := a.pageRouter.Init.HandleUpdate(msg)
			a.pageRouter.Init = updatedRoute
			return a, cmd
		}

		if a.state.Drawer != nil {
			newDrawer, cmd := a.dialogRouter.HandleUpdate(msg, a.state.Drawer)
			a.state.Drawer = newDrawer
			return a, cmd
		}

		return a, nil
	}
}

func (a *App) View() string {
	if a.state.Session == nil {
		return a.pageRouter.Init.View()
	}

	var content string
	content = a.pageRouter.HandleView(a.state.Page)

	bodyContent := content

	headerContent, headerH := a.ui.Header.Render()
	headerStr := lipgloss.NewStyle().Width(a.width).Render(headerContent)

	footerContent, footerH := a.ui.Footer.Render()
	footerStr := lipgloss.NewStyle().Width(a.width).Render(footerContent)

	bodyHeight := a.height - headerH - footerH
	if bodyHeight < 0 {
		bodyHeight = 0
	}

	bodyStyle := lipgloss.NewStyle().Width(a.width).Height(bodyHeight)
	bodyStr := bodyStyle.Render(bodyContent)

	fullStr := lipgloss.JoinVertical(lipgloss.Top, headerStr, bodyStr, footerStr)

	if a.state.Drawer != nil {
		if d, ok := a.state.Drawer.Dialog.(interface{ View() string }); ok {
			dialogStr := d.View()
			fullStr = overlay.Composite(dialogStr, fullStr, overlay.Center, overlay.Center, 0, -1)
		}
	}

	return fullStr
}
