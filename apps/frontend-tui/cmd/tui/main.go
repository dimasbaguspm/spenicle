package main

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/dimasbaguspm/spenicle-tui/internal"
	"github.com/dimasbaguspm/spenicle-tui/internal/configs"
)

func main() {
	env := configs.LoadEnvironment()
	cl := configs.NewHttpClient(env.BaseAPIURL)

	p := tea.NewProgram(internal.NewApp(&cl, env))

	if err := p.Start(); err != nil {
		panic(err)
	}
}
