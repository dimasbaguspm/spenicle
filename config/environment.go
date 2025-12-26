package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Environment struct {
	AppEnv      string
	DatabaseURL string
}

func (env *Environment) Setup() {
	fmt.Println("Loading .env file")
	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
		panic(err)
	}

	appEnv, status := os.LookupEnv("APP_ENV")
	if !status {
		fmt.Println("APP_ENV not set, defaulting to 'development'")
		env.AppEnv = "development"
	} else {
		env.AppEnv = appEnv
	}

	databaseURL, status := os.LookupEnv("DATABASE_URL")
	if !status {
		fmt.Println("DATABASE_URL not set, defaulting to 'postgres://user:password@localhost:5432/dbname'")
		env.DatabaseURL = "postgres://user:password@localhost:5432/dbname"
	} else {
		env.DatabaseURL = databaseURL
	}

	fmt.Println(".env file loaded successfully")

	env.printEnv()

}
func (env *Environment) printEnv() {
	fmt.Println("------------------------------")
	fmt.Println("Current Environment Settings:")
	fmt.Println("------------------------------")
	fmt.Println("Environment Variables:")
	fmt.Println()
	fmt.Printf("AppEnv: %s\n", env.AppEnv)
	fmt.Printf("DatabaseURL: %s\n", env.DatabaseURL)
	fmt.Println()
	fmt.Println("------------------------------")
}

// all environment has been validated to be exist
// this function just return the value
func (env *Environment) GetEnv(name string) string {
	return os.Getenv(name)
}
