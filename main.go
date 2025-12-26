package main

import (
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/config"
)

func main() {
	env := &config.Environment{}
	env.Setup()

	routes := &RoutesConfig{
		Environment: env,
	}
	routes.Setup()

	routes.Run(":3000", func() {
		fmt.Println("Server is running on port 3000")
	})

}
