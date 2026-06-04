// Package ingest orchestrates fetching NBA data and upserting it into Postgres.
package ingest

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"jerseystats/internal/db/gen"
	"jerseystats/internal/nba"
)

// Ingester coordinates NBA API calls and database writes.
type Ingester struct {
	nba     *nba.Client
	queries *gen.Queries
	log     *slog.Logger
}

// New creates an Ingester.
func New(nbaClient *nba.Client, queries *gen.Queries, logger *slog.Logger) *Ingester {
	return &Ingester{nba: nbaClient, queries: queries, log: logger}
}

// gamePair collects both sides of a game from two teams' game logs
// so we can populate home_score and away_score.
type gamePair struct {
	gameID   string
	gameDate time.Time
	homeTeam string
	awayTeam string
	homePTS  int
	awayPTS  int
	hasHome  bool
	hasAway  bool
}

// IngestGames fetches team game logs and upserts into the games table.
// If teamFilter is non-empty, only that team's games are fetched.
func (ing *Ingester) IngestGames(ctx context.Context, season, teamFilter string) error {
	teamIDs := nba.AllNBATeamIDs()
	if teamFilter != "" {
		id, ok := nba.AbbrToNBAID[teamFilter]
		if !ok {
			return fmt.Errorf("unknown team abbreviation: %s", teamFilter)
		}
		teamIDs = []int{id}
	}

	games := make(map[string]*gamePair)
	var failed []string

	for _, nbaID := range teamIDs {
		abbr := nba.NBAIDToAbbr[nbaID]
		ing.log.Info("fetching team game log", "team", abbr)

		entries, err := ing.nba.GetTeamGameLog(ctx, nbaID, season)
		if err != nil {
			ing.log.Error("failed to fetch team game log", "team", abbr, "err", err)
			failed = append(failed, abbr)
			continue
		}

		for _, e := range entries {
			team, opponent, isHome := nba.ParseMatchup(e.Matchup)
			if team == "" {
				team = abbr
			}

			gp, exists := games[e.GameID]
			if !exists {
				dateStr := nba.ParseGameDate(e.GameDate)
				t, _ := time.Parse("2006-01-02", dateStr)
				gp = &gamePair{gameID: e.GameID, gameDate: t}
				games[e.GameID] = gp
			}

			if isHome {
				gp.homeTeam = team
				gp.awayTeam = opponent
				gp.homePTS = e.PTS
				gp.hasHome = true
			} else {
				gp.awayTeam = team
				gp.homeTeam = opponent
				gp.awayPTS = e.PTS
				gp.hasAway = true
			}
		}

		ing.log.Info("fetched team game log", "team", abbr, "games", len(entries))
	}

	// Upsert all paired games into Postgres.
	upserted := 0
	for _, gp := range games {
		homeScore := pgtype.Int4{Valid: false}
		awayScore := pgtype.Int4{Valid: false}
		if gp.hasHome {
			homeScore = pgtype.Int4{Int32: int32(gp.homePTS), Valid: true}
		}
		if gp.hasAway {
			awayScore = pgtype.Int4{Int32: int32(gp.awayPTS), Valid: true}
		}

		err := ing.queries.UpsertGame(ctx, gen.UpsertGameParams{
			GameID:    gp.gameID,
			GameDate:  pgtype.Date{Time: gp.gameDate, Valid: !gp.gameDate.IsZero()},
			HomeTeam:  gp.homeTeam,
			AwayTeam:  gp.awayTeam,
			HomeScore: homeScore,
			AwayScore: awayScore,
			Season:    season,
		})
		if err != nil {
			ing.log.Error("failed to upsert game", "game_id", gp.gameID, "err", err)
			continue
		}
		upserted++
	}

	ing.log.Info("games ingestion complete",
		"total", len(games),
		"upserted", upserted,
		"teams_failed", len(failed),
	)
	if len(failed) > 0 {
		ing.log.Warn("teams that failed", "teams", failed)
	}
	return nil
}

// IngestPlayerLogs fetches player game logs and upserts into player_game_logs.
// If teamFilter is non-empty, only players on that team are fetched.
func (ing *Ingester) IngestPlayerLogs(ctx context.Context, season, teamFilter string) error {
	ing.log.Info("fetching active player list")
	players, err := ing.nba.GetAllPlayers(ctx, season)
	if err != nil {
		return fmt.Errorf("get all players: %w", err)
	}
	ing.log.Info("got player list", "total", len(players))

	if teamFilter != "" {
		var filtered []nba.PlayerInfo
		for _, p := range players {
			if p.TeamAbbr == teamFilter {
				filtered = append(filtered, p)
			}
		}
		players = filtered
		ing.log.Info("filtered to team", "team", teamFilter, "players", len(players))
	}

	upserted := 0
	failed := 0
	for i, p := range players {
		entries, err := ing.nba.GetPlayerGameLog(ctx, p.PlayerID, season)
		if err != nil {
			ing.log.Error("failed to fetch player game log",
				"player", p.Name, "player_id", p.PlayerID, "err", err)
			failed++
			continue
		}

		for _, e := range entries {
			teamAbbr := e.TeamAbbr
			if teamAbbr == "" {
				teamAbbr = p.TeamAbbr
			}

			err := ing.queries.UpsertPlayerGameLog(ctx, gen.UpsertPlayerGameLogParams{
				GameID:     e.GameID,
				PlayerID:   strconv.Itoa(p.PlayerID),
				PlayerName: p.Name,
				TeamID:     teamAbbr,
				Pts:        pgInt4(e.PTS),
				Reb:        pgInt4(e.REB),
				Ast:        pgInt4(e.AST),
				Fgm:        pgInt4(e.FGM),
				Fga:        pgInt4(e.FGA),
				Fg3m:       pgInt4(e.FG3M),
				Fg3a:       pgInt4(e.FG3A),
				Ftm:        pgInt4(e.FTM),
				Fta:        pgInt4(e.FTA),
				Min:        pgNumeric(e.MIN),
				PlusMinus:  pgNumeric(e.PlusMinus),
			})
			if err != nil {
				ing.log.Error("failed to upsert player game log",
					"player", p.Name, "game_id", e.GameID, "err", err)
				continue
			}
			upserted++
		}

		if (i+1)%50 == 0 || i+1 == len(players) {
			ing.log.Info("player log progress",
				"completed", i+1,
				"total", len(players),
				"rows_upserted", upserted,
			)
		}
	}

	ing.log.Info("player log ingestion complete",
		"players", len(players),
		"rows_upserted", upserted,
		"players_failed", failed,
	)
	return nil
}

func pgInt4(v int) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

func pgNumeric(v float64) pgtype.Numeric {
	// Convert float to pgtype.Numeric via text representation.
	var n pgtype.Numeric
	n.Scan(fmt.Sprintf("%.1f", v))
	return n
}
