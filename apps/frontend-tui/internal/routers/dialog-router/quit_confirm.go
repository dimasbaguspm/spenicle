package dialogrouter

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type QuitConfirm struct {
	width  int
	height int
}

func NewQuitConfirm() QuitConfirm {
	return QuitConfirm{
		width:  50,
		height: 10,
	}
}

func (qc QuitConfirm) HandleUpdate(msg tea.Msg) (string, interface{}, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		if msg.Width-4 < 50 {
			qc.width = msg.Width - 4
		} else {
			qc.width = 50
		}
		if msg.Height-4 < 10 {
			qc.height = msg.Height - 4
		} else {
			qc.height = 10
		}
		return "quit-confirm", qc, nil
	case tea.KeyMsg:
		switch msg.String() {
		case "y", "Y":
			return "", nil, tea.Quit
		case "n", "N", "esc":
			return "", nil, nil
		}
	}
	return "quit-confirm", qc, nil
}

func (qc QuitConfirm) View() string {
	content := "Are you sure you want to quit?\n\n[y] Yes  [n] No"

	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		Padding(1).
		Align(lipgloss.Center).
		Width(qc.width).
		Height(qc.height)

	return style.Render(content)
}
