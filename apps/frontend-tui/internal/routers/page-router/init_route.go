package pagerouter

import (
	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/dimasbaguspm/spenicle-tui/internal/clients"
	"github.com/dimasbaguspm/spenicle-tui/internal/configs"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

const (
	stateAuthenticating  = "authenticating"
	stateAuthenticated   = "authenticated"
	stateUnauthenticated = "unauthenticated"
)

type authFailedMsg struct{}
type authSuccessMsg struct {
	models.LoginResponseModel
}

type InitPageRoute struct {
	state     string
	spinner   spinner.Model
	clients   clients.Clients
	OnSuccess func(models.LoginResponseModel)
}

func NewInitPageRoute(clients clients.Clients) InitPageRoute {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))

	return InitPageRoute{
		state:   stateAuthenticating,
		spinner: s,
		clients: clients,
	}
}

func (ir InitPageRoute) Init() tea.Cmd {
	env := configs.LoadEnvironment()

	return tea.Batch(
		ir.spinner.Tick,
		tea.Cmd(func() tea.Msg {
			resp, err := ir.clients.Auth.Login(models.LoginRequestModel{
				Username: env.AdminUsername,
				Password: env.AdminPassword,
			})

			if err != nil {
				return authFailedMsg{}
			}
			return authSuccessMsg{LoginResponseModel: resp}
		}),
	)
}

func (ir InitPageRoute) HandleUpdate(msg tea.Msg) (InitPageRoute, tea.Cmd) {
	switch msg := msg.(type) {
	case spinner.TickMsg:
		updatedSpinner, cmd := ir.spinner.Update(msg)
		ir.spinner = updatedSpinner
		return ir, cmd
	case authSuccessMsg:
		ir.state = stateAuthenticated
		if ir.OnSuccess != nil {
			ir.OnSuccess(msg.LoginResponseModel)
		}
		return ir, nil
	case authFailedMsg:
		ir.state = stateUnauthenticated
		return ir, nil
	}
	return ir, nil
}

func (ir InitPageRoute) View() string {
	switch ir.state {
	case stateUnauthenticated:
		return "❌ Initialization failed. Please check your credentials or server status.\n"
	case stateAuthenticated:
		return "✅ Initialization successful! Redirecting...\n"
	case stateAuthenticating:
		return ir.spinner.View() + " Authenticating..."
	default:
		return "❓ Unknown state.\n"
	}
}
