package ui

import (
	"github.com/charmbracelet/lipgloss"
)

type Header struct{}

func NewHeader() Header {
	return Header{}
}

func (h Header) Render() (string, int) {
	style := lipgloss.NewStyle().
		Align(lipgloss.Center).
		Background(lipgloss.Color("39")).
		Foreground(lipgloss.Color("230")).
		Bold(true).
		Padding(1, 0)

	return style.Render("Spenicle TUI"), 3
}
