package ui

import (
	"github.com/charmbracelet/lipgloss"
)

type Footer struct{}

func NewFooter() Footer {
	return Footer{}
}

func (f Footer) Render(width int) (string, int) {
	style := lipgloss.NewStyle().
		Width(width).
		Align(lipgloss.Center).
		Foreground(lipgloss.Color("62")).
		Bold(true)

	return style.Render("[1] Dashboard  [2] Transactions  [q] Quit  [Ctrl+C] Force Quit  |  © 2024 Spenicle TUI Client"), 1
}
