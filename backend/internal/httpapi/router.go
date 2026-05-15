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

// NewRouter builds the chi router with all routes and middleware.
//
// TODO: accept *pgxpool.Pool (or a Queries interface) and return http.Handler.
func NewRouter() {
	// TODO: chi.NewRouter()
	// TODO: middleware — RequestID, RealIP, Logger, Recoverer, CORS
	// TODO: mount /health, /ready
	// TODO: mount /api/v1 group
	// TODO: mount /admin group (API-key protected)
}
