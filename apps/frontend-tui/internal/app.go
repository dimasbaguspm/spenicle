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
	focus        string
}

func NewApp(client *http.Client, env configs.Environment) *App {
	clients := clients.NewClients(env.BaseAPIURL, *client)
	pageRouter := pagerouter.NewPageRouter(clients)
	dialogRouter := dialogrouter.NewDialogRouter()

	ui := ui.NewUIs()

	a := &App{
		state:        &models.App{},
		env:          env,
		clients:      clients,
		pageRouter:   pageRouter,
		dialogRouter: dialogRouter,
		ui:           ui,
		width:        80,
		height:       24,
		focus:        "sidebar",
	}

	a.ui.Sidebar.OnChangePage = func(page string) {
		a.changePage(page)
	}

	return a
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

		newDrawer, drawerCmd := a.dialogRouter.HandleKey(msg, a.state.Drawer)
		a.state.Drawer = newDrawer

		if a.state.Drawer != nil {
			updatedDrawer, updateCmd := a.dialogRouter.HandleUpdate(msg, a.state.Drawer)
			a.state.Drawer = updatedDrawer
			drawerCmd = tea.Batch(drawerCmd, updateCmd)
			return a, drawerCmd
		}

		a.focus = a.ui.Layout.HandleKey(msg, a.focus)
		if a.focus == "sidebar" {
			a.ui.Sidebar.HandleKey(msg)
			return a, drawerCmd
		}

		newPage, pageCmd := a.pageRouter.HandleKey(msg, a.state.Page)
		a.state.Page = newPage

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

	bodyContent := a.pageRouter.HandleView(a.state.Page)

	headerContent, headerH := a.ui.Header.Render(a.width)
	headerStr := headerContent

	footerContent, footerH := a.ui.Footer.Render(a.width)
	footerStr := footerContent

	bodyHeight := a.height - headerH - footerH - 2
	if bodyHeight < 0 {
		bodyHeight = 0
	}

	sidebarWidth := 25
	sidebarStr := a.ui.Sidebar.Render(sidebarWidth, bodyHeight)

	contentWidth := a.width - sidebarWidth
	contentStyle := lipgloss.NewStyle().
		Width(contentWidth - 2).
		Height(bodyHeight).
		Border(lipgloss.RoundedBorder())
	contentStr := contentStyle.Render(bodyContent)

	fullStr := a.ui.Layout.Render(headerStr, sidebarStr, contentStr, footerStr, a.focus, a.width, a.height, headerH, footerH)

	if a.state.Drawer != nil {
		if d, ok := a.state.Drawer.Dialog.(interface{ View() string }); ok {
			dialogStr := d.View()
			fullStr = overlay.Composite(dialogStr, fullStr, overlay.Center, overlay.Center, 0, 2)
		}
	}

	return fullStr
}

func (a *App) changePage(page string) {
	if p, ok := a.pageRouter.GetPages()[page]; ok {
		a.state.Page = p
	}
}
