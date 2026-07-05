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

// DefaultSeasonTypes are the season types ingested by default.
var DefaultSeasonTypes = []string{"Regular Season", "Playoffs"}

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
	gameID     string
	gameDate   time.Time
	homeTeam   string
	awayTeam   string
	homePTS    int
	awayPTS    int
	hasHome    bool
	hasAway    bool
	seasonType string
}

// IngestGames fetches team game logs and upserts into the games table.
// If teamFilter is non-empty, only that team's games are fetched.
// seasonTypes controls which NBA season types to fetch (e.g. "Regular Season", "Playoffs").
func (ing *Ingester) IngestGames(ctx context.Context, season, teamFilter string, seasonTypes []string) error {
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

	for _, seasonType := range seasonTypes {
		ing.log.Info("fetching games", "season_type", seasonType)

		for _, nbaID := range teamIDs {
			abbr := nba.NBAIDToAbbr[nbaID]
			ing.log.Info("fetching team game log", "team", abbr, "season_type", seasonType)

			entries, err := ing.nba.GetTeamGameLog(ctx, nbaID, season, seasonType)
			if err != nil {
				ing.log.Error("failed to fetch team game log", "team", abbr, "season_type", seasonType, "err", err)
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
					gp = &gamePair{gameID: e.GameID, gameDate: t, seasonType: seasonType}
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

			ing.log.Info("fetched team game log", "team", abbr, "season_type", seasonType, "games", len(entries))
		}
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
			GameID:     gp.gameID,
			GameDate:   pgtype.Date{Time: gp.gameDate, Valid: !gp.gameDate.IsZero()},
			HomeTeam:   gp.homeTeam,
			AwayTeam:   gp.awayTeam,
			HomeScore:  homeScore,
			AwayScore:  awayScore,
			Season:     season,
			SeasonType: gp.seasonType,
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
// seasonTypes controls which NBA season types to fetch (e.g. "Regular Season", "Playoffs").
func (ing *Ingester) IngestPlayerLogs(ctx context.Context, season, teamFilter string, seasonTypes []string) error {
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
		for _, seasonType := range seasonTypes {
			entries, err := ing.nba.GetPlayerGameLog(ctx, p.PlayerID, season, seasonType)
			if err != nil {
				ing.log.Error("failed to fetch player game log",
					"player", p.Name, "player_id", p.PlayerID,
					"season_type", seasonType, "err", err)
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

// IngestPlayerBios fetches biographical data for all players in the database
// and upserts into the player_bios table.
func (ing *Ingester) IngestPlayerBios(ctx context.Context) error {
	ing.log.Info("fetching distinct player IDs from database")

	playerIDs, err := ing.queries.GetDistinctPlayerIDs(ctx)
	if err != nil {
		return fmt.Errorf("get distinct player IDs: %w", err)
	}
	ing.log.Info("found players to fetch bios for", "count", len(playerIDs))

	upserted := 0
	failed := 0
	for i, pidStr := range playerIDs {
		pid, err := strconv.Atoi(pidStr)
		if err != nil {
			ing.log.Error("invalid player_id", "player_id", pidStr, "err", err)
			failed++
			continue
		}

		bio, err := ing.nba.GetCommonPlayerInfo(ctx, pid)
		if err != nil {
			ing.log.Error("failed to fetch player bio", "player_id", pid, "err", err)
			failed++
			continue
		}

		var birthDate pgtype.Date
		if bio.BirthDate != "" {
			t, parseErr := time.Parse("2006-01-02", bio.BirthDate)
			if parseErr == nil {
				birthDate = pgtype.Date{Time: t, Valid: true}
			}
		}

		err = ing.queries.UpsertPlayerBio(ctx, gen.UpsertPlayerBioParams{
			PlayerID:     pidStr,
			JerseyNumber: pgText(bio.JerseyNumber),
			Position:     pgText(bio.Position),
			Height:       pgText(bio.Height),
			Weight:       pgInt4OrNull(bio.Weight),
			BirthDate:    birthDate,
			Country:      pgText(bio.Country),
			LastAttended: pgText(bio.School),
			DraftYear:    pgInt4OrNull(bio.DraftYear),
			DraftRound:   pgInt4OrNull(bio.DraftRound),
			DraftNumber:  pgInt4OrNull(bio.DraftNumber),
			YearsExp:     pgInt4OrNull(bio.SeasonExp),
		})
		if err != nil {
			ing.log.Error("failed to upsert player bio", "player_id", pid, "err", err)
			failed++
			continue
		}
		upserted++

		if (i+1)%50 == 0 || i+1 == len(playerIDs) {
			ing.log.Info("bio progress", "completed", i+1, "total", len(playerIDs), "upserted", upserted)
		}
	}

	ing.log.Info("player bio ingestion complete", "upserted", upserted, "failed", failed)
	return nil
}

func pgText(v string) pgtype.Text {
	if v == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: v, Valid: true}
}

func pgInt4OrNull(v int) pgtype.Int4 {
	if v == 0 {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: int32(v), Valid: true}
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
