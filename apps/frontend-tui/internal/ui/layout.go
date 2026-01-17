package ui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type Layout struct {
}

func NewLayout() *Layout {
	return &Layout{}
}

func (l *Layout) HandleKey(msg tea.KeyMsg, currentFocus string) string {
	if msg.Type == tea.KeyTab || msg.Type == tea.KeyShiftTab {
		if currentFocus == "content" {
			return "sidebar"
		} else {
			return "content"
		}
	}
	return currentFocus
}

func (l *Layout) Render(header, sidebar, content, footer string, focus string, width, height, headerH, footerH int) string {
	bodyHeight := height - headerH - footerH - 1 // -1 for tabs
	if bodyHeight < 0 {
		bodyHeight = 0
	}

	var sidebarStr, contentStr string
	if focus == "sidebar" {
		sidebarStr = sidebar
		contentStr = lipgloss.NewStyle().Faint(true).Render(content)
	} else {
		sidebarStr = lipgloss.NewStyle().Faint(true).Render(sidebar)
		contentStr = content
	}

	bodyStr := lipgloss.JoinHorizontal(lipgloss.Left, sidebarStr, contentStr)

	fullStr := lipgloss.JoinVertical(lipgloss.Top, header, bodyStr, footer)

	return fullStr
}
