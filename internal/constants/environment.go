package constants

import (
	"os"

	"github.com/joho/godotenv"
)

var _ = godotenv.Load()

var (
	APP_PORT     = os.Getenv("APP_PORT")
	DATABASE_URL = os.Getenv("DATABASE_URL")
)
