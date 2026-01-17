package routers

import (
	"net/http"

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

type InitRoute struct {
	state      string
	Spinner    spinner.Model
	authClient clients.AuthClient
	env        configs.Environment
	client     http.Client
	// OnSuccess is called when authentication succeeds.
	OnSuccess func(models.LoginResponseModel)
}

func NewInitRoute(env configs.Environment, client http.Client) InitRoute {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))

	authClient := clients.NewAuthClient(env.BaseAPIURL, client)

	return InitRoute{
		state:      stateAuthenticating,
		Spinner:    s,
		authClient: authClient,
		env:        env,
		client:     client,
	}
}

func (ir InitRoute) Init() tea.Cmd {
	return tea.Batch(
		ir.Spinner.Tick,
		tea.Cmd(func() tea.Msg {
			resp, err := ir.authClient.Login(models.LoginRequestModel{
				Username: ir.env.AdminUsername,
				Password: ir.env.AdminPassword,
			})

			if err != nil {
				return authFailedMsg{}
			}
			return authSuccessMsg{LoginResponseModel: resp}
		}),
	)
}

func (ir InitRoute) HandleUpdate(msg tea.Msg) (InitRoute, tea.Cmd) {
	switch msg := msg.(type) {
	case spinner.TickMsg:
		updatedSpinner, cmd := ir.Spinner.Update(msg)
		ir.Spinner = updatedSpinner
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

func (ir InitRoute) View() string {
	switch ir.state {
	case stateUnauthenticated:
		return "❌ Initialization failed. Please check your credentials or server status.\n"
	case stateAuthenticated:
		return "✅ Initialization successful! Redirecting...\n"
	case stateAuthenticating:
		return ir.Spinner.View() + " Authenticating..."
	default:
		return "❓ Unknown state.\n"
	}
}
