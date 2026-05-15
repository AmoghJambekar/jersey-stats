// Command ingest pulls NBA game and player stats into Postgres.
//
// Usage:
//   go run ./cmd/ingest --season 2025-26
//
// Fetches completed games from the NBA Stats API (stats.nba.com) and
// upserts them into the games / player_game_logs tables.
// See docs/prd.md REQ-002 for requirements.
package main

import (
	"fmt"
	"os"
)

func main() {
	// TODO: parse --season flag
	// TODO: load config, open DB pool
	// TODO: create nba.Client with rate limiting (≤1 req/sec)
	// TODO: fetch team game logs → upsert into games table
	// TODO: fetch player game logs → upsert into player_game_logs table

	fmt.Fprintln(os.Stderr, "ingest: not yet implemented")
}
