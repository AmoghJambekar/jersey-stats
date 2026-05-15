// Command api starts the JerseyStats HTTP server.
//
// Flow: load config → open DB pool → build router → listen.
// See docs/prd.md § Technical Considerations for the target architecture.
package main

import (
	"fmt"
	"log"
	"os"

	"jerseystats/internal/config"
)

func main() {
	cfg := config.Load()

	// TODO: open pgxpool using cfg.DatabaseURL
	// TODO: build chi router via httpapi.NewRouter(pool)
	// TODO: start http.ListenAndServe on cfg.Port

	log.Printf("starting JerseyStats API on :%s", cfg.Port)
	fmt.Fprintln(os.Stderr, "not yet implemented — wire DB pool and router")
}
