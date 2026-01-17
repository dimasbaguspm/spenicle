package dialogrouter

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type DialogRouter struct{}

func NewDialogRouter() DialogRouter {
	return DialogRouter{}
}

func (dr *DialogRouter) HandleUpdate(msg tea.Msg, currentDrawer *models.Drawer) (*models.Drawer, tea.Cmd) {
	if currentDrawer == nil {
		return nil, nil
	}

	switch currentDrawer.ID {
	case "quit-confirm":
		if qc, ok := currentDrawer.Dialog.(QuitConfirm); ok {
			newID, updated, cmd := qc.HandleUpdate(msg)
			if newID == "" {
				return nil, cmd
			}
			if newID != currentDrawer.ID || updated != currentDrawer.Dialog {
				return &models.Drawer{ID: newID, Name: "Quit Confirmation", Dialog: updated}, cmd
			}
		}
	}

	return currentDrawer, nil
}

func (dr *DialogRouter) HandleKey(msg tea.Msg, currentDrawer *models.Drawer) (*models.Drawer, tea.Cmd) {
	if key, ok := msg.(tea.KeyMsg); ok {
		switch key.String() {
		case "q":
			if currentDrawer == nil {
				return &models.Drawer{ID: "quit-confirm", Name: "Quit Confirmation", Dialog: NewQuitConfirm()}, nil
			}
		}
	}
	return currentDrawer, nil
}

func (dr *DialogRouter) HandleView(drawer *models.Drawer) string {
	if drawer == nil {
		return ""
	}
	switch drawer.ID {
	case "quit-confirm":
		if qc, ok := drawer.Dialog.(QuitConfirm); ok {
			return qc.View()
		}
	}
	return ""
}
