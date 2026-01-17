package routers

import (
	"fmt"
	"net/http"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/dimasbaguspm/spenicle-tui/internal/clients"
	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type LoginRoute struct {
	username   textinput.Model
	password   textinput.Model
	focused    int
	errorMsg   string
	authClient clients.AuthClient
}

func NewLoginRoute(baseURL string, client http.Client) LoginRoute {
	username := textinput.New()
	username.Placeholder = "Enter your username"
	username.Focus()

	password := textinput.New()
	password.Placeholder = "Enter your password"
	password.EchoMode = textinput.EchoPassword
	password.EchoCharacter = '*'

	authClient := clients.NewAuthClient(baseURL, client)

	return LoginRoute{
		username:   username,
		password:   password,
		focused:    0,
		errorMsg:   "",
		authClient: authClient,
	}
}

func (lr LoginRoute) Init() tea.Cmd {
	return textinput.Blink
}

func (lr LoginRoute) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case tea.KeyEnter.String():
			if lr.focused == 1 {
				req := models.LoginRequestModel{
					Username: lr.username.Value(),
					Password: lr.password.Value(),
				}
				resp, err := lr.authClient.Login(req)
				if err != nil {
					lr.errorMsg = common.ParseErrorDetail(err.Error())
				} else {
					fmt.Println("Login successful! Token:", resp.AccessToken)
					// TODO: handle success, perhaps transition to next view
				}
				return lr, nil
			}
		case tea.KeyTab.String(), tea.KeyShiftTab.String():
			lr.focused = (lr.focused + 1) % 2
			if lr.focused == 0 {
				lr.username.Focus()
				lr.password.Blur()
			} else {
				lr.username.Blur()
				lr.password.Focus()
			}
			return lr, nil
		case tea.KeyCtrlC.String():
			return lr, tea.Quit
		}

	}

	if lr.focused == 0 {
		lr.username, cmd = lr.username.Update(msg)
	} else {
		lr.password, cmd = lr.password.Update(msg)
	}

	return lr, cmd
}

func (lr LoginRoute) View() string {
	content := "Please enter your login credentials.\n\n"

	content += "Username:\n"
	content += lr.username.View() + "\n\n"

	content += "Password:\n"
	content += lr.password.View() + "\n\n"

	if lr.errorMsg != "" {
		content += "\nError: " + lr.errorMsg + "\n"
	} else {
		content += "\n\n"
	}

	content += "[Tab] Switch fields  [Enter] Login  [Ctrl+C] Quit"

	return content
}
