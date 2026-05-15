// Package db manages the PostgreSQL connection pool.
//
// Uses pgx v5 via pgxpool. The pool is created once at startup and
// shared across all handlers.
package db

import (
	"context"
	"fmt"
)

// Connect opens a pgxpool connection to Postgres.
//
// Usage:
//
//	pool, err := db.Connect(ctx, cfg.DatabaseURL)
//	defer pool.Close()
func Connect(ctx context.Context, databaseURL string) error {
	// TODO: pgxpool.New(ctx, databaseURL)
	// TODO: pool.Ping(ctx) to verify connectivity
	_ = ctx
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is empty")
	}
	return fmt.Errorf("db.Connect not yet implemented")
}
