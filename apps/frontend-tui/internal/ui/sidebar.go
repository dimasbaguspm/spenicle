package ui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type OnChangePage func(page string)

type Sidebar struct {
	OnChangePage
	selected int
	menu     []string
}

func NewSidebar(onChangePage OnChangePage) Sidebar {
	return Sidebar{
		OnChangePage: onChangePage,
		selected:     0,
		menu:         []string{"Dashboard", "Transactions", "Summary", "Accounts", "Categories", "Budgets"},
	}
}

func (s *Sidebar) HandleKey(msg tea.KeyMsg) {
	switch msg.Type {
	case tea.KeyUp:
		if s.selected > 0 {
			s.selected--
		}
	case tea.KeyDown:
		if s.selected < len(s.menu)-1 {
			s.selected++
		}
	case tea.KeyEnter:
		if s.OnChangePage != nil {
			s.OnChangePage(s.menu[s.selected])
		}
	}
}

func (s Sidebar) Selected() int {
	return s.selected
}

func (s Sidebar) Render(width, height int) string {
	var content string
	for i, item := range s.menu {
		if i == s.selected {
			content += lipgloss.NewStyle().Background(lipgloss.Color("4")).Foreground(lipgloss.Color("15")).Render(" "+item+" ") + "\n"
		} else {
			content += " " + item + "\n"
		}
	}

	style := lipgloss.NewStyle().
		Width(width - 2).
		Height(height).
		Border(lipgloss.RoundedBorder())

	return style.Render(content)
}
