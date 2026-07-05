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
	AdminAPIKey string // required to access /admin/* routes
	CORSOrigin  string // allowed CORS origin (default http://localhost:5173)
}

// Load reads configuration from environment variables.
func Load() Env {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}
	return Env{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        port,
		AdminAPIKey: os.Getenv("ADMIN_API_KEY"),
		CORSOrigin:  corsOrigin,
	}
}
