package ui

import (
	"github.com/charmbracelet/lipgloss"
)

type Header struct{}

func NewHeader() Header {
	return Header{}
}

func (h Header) Render(width int) (string, int) {
	style := lipgloss.NewStyle().
		Width(width).
		Align(lipgloss.Center).
		Background(lipgloss.Color("2")).
		Foreground(lipgloss.Color("15")).
		Bold(true)

	return style.Render("Spenicle TUI"), 1
}
