// Command ingest pulls NBA game and player stats into Postgres.
//
// Usage:
//
//	go run ./cmd/ingest --season 2025-26
//	go run ./cmd/ingest --season 2025-26 --season-type Playoffs
//	go run ./cmd/ingest --season 2025-26 --team NYK --games-only
//	go run ./cmd/ingest --season 2025-26 --players-only
//
// See docs/prd.md REQ-002 for requirements.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"jerseystats/internal/config"
	"jerseystats/internal/db"
	dbgen "jerseystats/internal/db/gen"
	"jerseystats/internal/ingest"
	"jerseystats/internal/nba"
)

func main() {
	season := flag.String("season", "2025-26", "NBA season (e.g. 2025-26)")
	team := flag.String("team", "", "single team abbreviation (e.g. NYK); empty = all 30")
	seasonType := flag.String("season-type", "", `season type: "Regular Season", "Playoffs", or empty for both`)
	gamesOnly := flag.Bool("games-only", false, "only ingest games, skip player logs")
	playersOnly := flag.Bool("players-only", false, "only ingest player logs, skip games")
	biosOnly := flag.Bool("bios-only", false, "only ingest player bios, skip games and player logs")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	// Resolve season types to ingest.
	var seasonTypes []string
	switch *seasonType {
	case "":
		seasonTypes = ingest.DefaultSeasonTypes
	case "Regular Season", "Playoffs":
		seasonTypes = []string{*seasonType}
	default:
		logger.Error("invalid --season-type; must be \"Regular Season\" or \"Playoffs\"")
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	queries := dbgen.New(pool)
	client := nba.NewClient(logger)
	ing := ingest.New(client, queries, logger)

	if *biosOnly {
		logger.Info("starting player bio ingestion")
		if err := ing.IngestPlayerBios(ctx); err != nil {
			logger.Error("player bio ingestion failed", "err", err)
			os.Exit(1)
		}
		logger.Info("ingest complete")
		return
	}

	if !*playersOnly {
		logger.Info("starting game ingestion", "season", *season, "team", *team, "season_types", seasonTypes)
		if err := ing.IngestGames(ctx, *season, *team, seasonTypes); err != nil {
			logger.Error("game ingestion failed", "err", err)
			os.Exit(1)
		}
	}

	if !*gamesOnly {
		logger.Info("starting player log ingestion", "season", *season, "team", *team, "season_types", seasonTypes)
		if err := ing.IngestPlayerLogs(ctx, *season, *team, seasonTypes); err != nil {
			logger.Error("player log ingestion failed", "err", err)
			os.Exit(1)
		}
	}

	logger.Info("ingest complete")
}
