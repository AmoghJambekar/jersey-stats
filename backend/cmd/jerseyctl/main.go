// Command jerseyctl is the admin CLI for managing jersey assignments.
//
// Usage:
//
//	go run ./cmd/jerseyctl assign --game 0022500123 --team NYK --edition Statement
//	go run ./cmd/jerseyctl import --file assignments.csv
//	go run ./cmd/jerseyctl missing
//	go run ./cmd/jerseyctl missing --team NYK
//
// See docs/prd.md REQ-005 for requirements.
package main

import (
	"context"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"jerseystats/internal/config"
	"jerseystats/internal/db"
	dbgen "jerseystats/internal/db/gen"
)

const defaultSeason = "2025-26"

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: jerseyctl <assign|import|missing> [flags]")
		os.Exit(1)
	}

	ctx := context.Background()
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

	q := dbgen.New(pool)

	switch os.Args[1] {
	case "assign":
		runAssign(ctx, q, logger, os.Args[2:])
	case "import":
		runImport(ctx, q, logger, os.Args[2:])
	case "missing":
		runMissing(ctx, q, logger, os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand: %s\n", os.Args[1])
		os.Exit(1)
	}
}

func runAssign(ctx context.Context, q *dbgen.Queries, logger *slog.Logger, args []string) {
	fs := flag.NewFlagSet("assign", flag.ExitOnError)
	gameID := fs.String("game", "", "game ID (e.g. 0022500123)")
	team := fs.String("team", "", "team abbreviation (e.g. NYK)")
	edition := fs.String("edition", "", "edition name (e.g. Statement)")
	season := fs.String("season", defaultSeason, "season")
	fs.Parse(args)

	if *gameID == "" || *team == "" || *edition == "" {
		fmt.Fprintln(os.Stderr, "usage: jerseyctl assign --game ID --team ABBR --edition NAME")
		os.Exit(1)
	}

	jerseyID, err := q.GetJerseyEditionID(ctx, dbgen.GetJerseyEditionIDParams{
		TeamID:      *team,
		EditionName: *edition,
		Season:      *season,
	})
	if err != nil {
		logger.Error("jersey edition not found", "team", *team, "edition", *edition, "err", err)
		os.Exit(1)
	}

	err = q.UpsertAssignment(ctx, dbgen.UpsertAssignmentParams{
		GameID:   *gameID,
		TeamID:   *team,
		JerseyID: jerseyID,
		Verified: true,
		Notes:    pgtype.Text{},
	})
	if err != nil {
		logger.Error("failed to assign", "err", err)
		os.Exit(1)
	}

	fmt.Printf("assigned %s %s to game %s\n", *team, *edition, *gameID)
}

func runImport(ctx context.Context, q *dbgen.Queries, logger *slog.Logger, args []string) {
	fs := flag.NewFlagSet("import", flag.ExitOnError)
	filePath := fs.String("file", "", "CSV file path")
	season := fs.String("season", defaultSeason, "season")
	fs.Parse(args)

	if *filePath == "" {
		fmt.Fprintln(os.Stderr, "usage: jerseyctl import --file PATH")
		os.Exit(1)
	}

	f, err := os.Open(*filePath)
	if err != nil {
		logger.Error("open file failed", "path", *filePath, "err", err)
		os.Exit(1)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1 // allow variable column count

	// Skip first 2 junk rows + header row.
	for i := 0; i < 3; i++ {
		if _, err := reader.Read(); err != nil {
			logger.Error("failed reading CSV header rows", "err", err)
			os.Exit(1)
		}
	}

	var assigned, skipped, errored int
	lineNum := 3

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			logger.Error("csv read error", "line", lineNum, "err", err)
			errored++
			lineNum++
			continue
		}
		lineNum++

		if len(row) < 5 {
			continue
		}

		dateStr := strings.TrimSpace(row[0])
		awayTeam := strings.TrimSpace(row[1])
		homeTeam := strings.TrimSpace(row[2])
		awayEdition := strings.TrimSpace(row[3])
		homeEdition := strings.TrimSpace(row[4])

		if dateStr == "" || awayTeam == "" || homeTeam == "" {
			continue
		}

		// Parse MM/DD/YYYY to YYYY-MM-DD.
		t, err := time.Parse("1/2/2006", dateStr)
		if err != nil {
			logger.Warn("bad date", "line", lineNum, "date", dateStr)
			errored++
			continue
		}

		// Look up game_id.
		gameID, err := q.GetGameByDateAndTeams(ctx, dbgen.GetGameByDateAndTeamsParams{
			GameDate: pgtype.Date{Time: t, Valid: true},
			HomeTeam: homeTeam,
			AwayTeam: awayTeam,
		})
		if err != nil {
			logger.Warn("game not found", "date", dateStr, "away", awayTeam, "home", homeTeam)
			skipped++
			continue
		}

		// Assign away team jersey.
		if awayEdition != "" {
			if err := assignOne(ctx, q, gameID, awayTeam, awayEdition, *season); err != nil {
				logger.Warn("assign failed", "game", gameID, "team", awayTeam, "edition", awayEdition, "err", err)
				errored++
			} else {
				assigned++
			}
		}

		// Assign home team jersey.
		if homeEdition != "" {
			if err := assignOne(ctx, q, gameID, homeTeam, homeEdition, *season); err != nil {
				logger.Warn("assign failed", "game", gameID, "team", homeTeam, "edition", homeEdition, "err", err)
				errored++
			} else {
				assigned++
			}
		}
	}

	fmt.Printf("import complete: %d assigned, %d skipped (game not found), %d errors\n", assigned, skipped, errored)
}

func assignOne(ctx context.Context, q *dbgen.Queries, gameID, team, edition, season string) error {
	jerseyID, err := q.GetJerseyEditionID(ctx, dbgen.GetJerseyEditionIDParams{
		TeamID:      team,
		EditionName: edition,
		Season:      season,
	})
	if err != nil {
		return fmt.Errorf("edition %q not found for %s: %w", edition, team, err)
	}

	return q.UpsertAssignment(ctx, dbgen.UpsertAssignmentParams{
		GameID:   gameID,
		TeamID:   team,
		JerseyID: jerseyID,
		Verified: true,
		Notes:    pgtype.Text{},
	})
}

func runMissing(ctx context.Context, q *dbgen.Queries, logger *slog.Logger, args []string) {
	fs := flag.NewFlagSet("missing", flag.ExitOnError)
	team := fs.String("team", "", "filter by team abbreviation")
	season := fs.String("season", defaultSeason, "season")
	fs.Parse(args)

	rows, err := q.MissingAssignments(ctx, *season)
	if err != nil {
		logger.Error("query failed", "err", err)
		os.Exit(1)
	}

	fmt.Printf("%-12s %-6s %-6s\n", "DATE", "HOME", "AWAY")
	fmt.Println(strings.Repeat("-", 26))

	count := 0
	for _, r := range rows {
		if *team != "" && r.HomeTeam != *team && r.AwayTeam != *team {
			continue
		}
		date := r.GameDate.Time.Format("2006-01-02")
		fmt.Printf("%-12s %-6s %-6s\n", date, r.HomeTeam, r.AwayTeam)
		count++
	}

	fmt.Printf("\n%d games missing assignments\n", count)
}
