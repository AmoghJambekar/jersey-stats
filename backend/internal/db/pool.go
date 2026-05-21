// Package db manages the PostgreSQL connection pool.
//
// Uses pgx v5 via pgxpool. The pool is created once at startup and
// shared across all handlers.
package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pgxpool connection to Postgres and verifies connectivity.
//
// Usage:
//
//	pool, err := db.Connect(ctx, cfg.DatabaseURL)
//	defer pool.Close()
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is empty")
	}
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("creating pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pinging database: %w", err)
	}
	return pool, nil
}
