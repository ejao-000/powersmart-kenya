package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// LoadEnv reads .env in development; in production env vars are set externally.
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found — using system environment variables")
	}
}

func Getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
