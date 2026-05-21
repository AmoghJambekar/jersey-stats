// Package httpapi defines the HTTP router and middleware.
//
// Routes (from docs/prd.md REQ-003, REQ-005, REQ-006):
//
//	GET  /health                              — liveness check
//	GET  /ready                               — readiness (DB ping)
//	GET  /api/v1/teams                        — list all teams
//	GET  /api/v1/teams/{teamID}               — team detail
//	GET  /api/v1/teams/{teamID}/jersey-stats  — team stats by jersey edition
//	GET  /api/v1/players/{playerID}/jersey-stats — player stats by jersey edition
//	GET  /api/v1/players/search?q=            — player name search
//	GET  /admin/missing-assignments           — games missing jersey data
//	POST /admin/import                        — CSV bulk import
package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewRouter builds the chi router with all routes and middleware.
func NewRouter(pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "OPTIONS"},
	}))

	// Health
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "db not ready", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	// TODO: mount /api/v1 group (teams, players)
	// TODO: mount /admin group (missing-assignments, import)

	return r
}
