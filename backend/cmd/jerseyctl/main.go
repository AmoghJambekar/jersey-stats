// Command jerseyctl is the admin CLI for managing jersey assignments.
//
// Usage:
//   go run ./cmd/jerseyctl assign --game 0022500123 --team NYK --edition Statement
//   go run ./cmd/jerseyctl import --file assignments.csv
//   go run ./cmd/jerseyctl missing --team NYK
//
// See docs/prd.md REQ-005 for requirements.
package main

import (
	"fmt"
	"os"
)

func main() {
	// TODO: parse subcommands (assign, import, missing)
	// TODO: load config, open DB pool
	// TODO: assign — insert/update game_jersey_assignments row
	// TODO: import — read CSV (game_id, team_abbr, edition_name), bulk upsert
	// TODO: missing — query games without assignments, print report

	fmt.Fprintln(os.Stderr, "jerseyctl: not yet implemented")
}
