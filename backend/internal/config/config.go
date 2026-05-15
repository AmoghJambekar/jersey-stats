// Package config reads runtime settings from environment variables.
//
// Required env vars (see .env.example):
//   DATABASE_URL — Postgres connection string
//   PORT         — HTTP listen port (default 8080)
package config

import "os"

// Env holds runtime configuration read from the process environment.
type Env struct {
	DatabaseURL string // postgres://user:pass@host:5432/jerseystats
	Port        string // HTTP listen port
}

// Load reads configuration from environment variables.
func Load() Env {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Env{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        port,
	}
}
