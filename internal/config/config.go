// Package config loads process env for the API (docs/ROADMAP.md §9).
package config

// Env holds runtime configuration. Fields are wired in §9.
type Env struct {
	DatabaseURL string
	Port        string
	CORSOrigins string
	LogLevel    string
}

// Load reads configuration from the environment. Stub until §9.
func Load() Env {
	return Env{
		DatabaseURL: "",
		Port:        "8080",
		CORSOrigins: "",
		LogLevel:    "info",
	}
}
