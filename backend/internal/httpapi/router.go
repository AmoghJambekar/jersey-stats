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
//	GET  /admin/missing-assignments           — games missing jersey data (auth required)
package httpapi

import (
	"crypto/subtle"
	"net/http"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"jerseystats/internal/config"
	"jerseystats/internal/db/gen"
	"jerseystats/internal/handler"
)

// NewRouter builds the chi router with all routes and middleware.
func NewRouter(pool *pgxpool.Pool, cfg config.Env) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.CORSOrigin},
		AllowedMethods: []string{"GET", "OPTIONS"},
	}))
	r.Use(rateLimiter(60, time.Minute)) // 60 requests per minute per IP

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

	// Data queries
	q := gen.New(pool)

	// Public API
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/teams", handler.ListTeams(q))
		r.Get("/teams/{teamID}", handler.GetTeam(q))
		r.Get("/teams/{teamID}/jersey-stats", handler.GetTeamJerseyStats(q))
		r.Get("/teams/{teamID}/roster", handler.GetTeamRoster(q))
		r.Get("/teams/{teamID}/game-log", handler.GetTeamGameLog(q))
		r.Get("/players/{playerID}/teams", handler.GetPlayerTeams(q))
		r.Get("/players/{playerID}/bio", handler.GetPlayerBio(q))
		r.Get("/players/{playerID}/jersey-stats", handler.GetPlayerJerseyStats(q))
		r.Get("/players/{playerID}/game-log", handler.GetPlayerGameLog(q))
		r.Get("/players/search", handler.SearchPlayers(q))
	})

	// Admin (requires API key)
	r.Route("/admin", func(r chi.Router) {
		r.Use(requireAPIKey(cfg.AdminAPIKey))
		r.Get("/missing-assignments", handler.MissingAssignments(q))
	})

	return r
}

// requireAPIKey returns middleware that checks the Authorization header
// for a valid Bearer token matching the configured admin API key.
func requireAPIKey(key string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if key == "" {
				http.Error(w, "admin access disabled", http.StatusForbidden)
				return
			}
			auth := r.Header.Get("Authorization")
			token := strings.TrimPrefix(auth, "Bearer ")
			if token == auth || subtle.ConstantTimeCompare([]byte(token), []byte(key)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// rateLimiter returns middleware that limits requests per IP using a
// simple sliding-window token bucket.
func rateLimiter(maxRequests int, window time.Duration) func(http.Handler) http.Handler {
	type visitor struct {
		tokens    int
		lastReset time.Time
	}
	var mu sync.Mutex
	visitors := make(map[string]*visitor)

	// Clean up stale entries periodically.
	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastReset) > window*2 {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip rate limiting for health checks.
			if r.URL.Path == "/health" || r.URL.Path == "/ready" {
				next.ServeHTTP(w, r)
				return
			}

			ip := r.RemoteAddr
			if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
				ip = strings.TrimSpace(strings.Split(fwd, ",")[0])
			} else if host, _, err := net.SplitHostPort(ip); err == nil {
				ip = host
			}

			mu.Lock()
			v, ok := visitors[ip]
			if !ok || time.Since(v.lastReset) > window {
				visitors[ip] = &visitor{tokens: maxRequests - 1, lastReset: time.Now()}
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}
			if v.tokens <= 0 {
				mu.Unlock()
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			v.tokens--
			mu.Unlock()
			next.ServeHTTP(w, r)
		})
	}
}
