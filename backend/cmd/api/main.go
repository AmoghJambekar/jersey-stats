// Command api starts the JerseyStats HTTP server.
//
// Flow: load config → open DB pool → build router → listen.
// See docs/prd.md § Technical Considerations for the target architecture.
package main

import (
	"context"
	"log"
	"net/http"

	"jerseystats/internal/config"
	"jerseystats/internal/db"
	"jerseystats/internal/httpapi"
)

func main() {
	cfg := config.Load()

	log.Printf("PORT=%s DATABASE_URL set=%v", cfg.Port, cfg.DatabaseURL != "")

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	router := httpapi.NewRouter(pool, cfg)

	addr := "0.0.0.0:" + cfg.Port
	log.Printf("starting JerseyStats API on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
