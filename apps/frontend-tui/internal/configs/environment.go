package configs

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Environment struct {
	BaseAPIURL    string
	AdminUsername string
	AdminPassword string
}

func LoadEnvironment() Environment {
	godotenv.Load()

	env := Environment{
		BaseAPIURL:    os.Getenv("BASE_API_URL"),
		AdminUsername: os.Getenv("ADMIN_USERNAME"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
	}

	fmt.Printf("Loaded Environment: %+v\n", env)
	return env
}
