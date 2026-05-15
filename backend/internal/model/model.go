// Package model defines the domain types for JerseyStats.
//
// These mirror the Postgres schema from docs/prd.md REQ-001 and are
// used in handler responses and business logic. sqlc will generate its
// own row types in internal/db/gen; these exist for API serialization.
package model

import "time"

// Team represents an NBA team.
type Team struct {
	ID   string `json:"id"`   // e.g. "NYK"
	Name string `json:"name"` // e.g. "New York Knicks"
	City string `json:"city"`
}

// JerseyEdition represents one jersey colorway for a team in a season.
type JerseyEdition struct {
	ID          int      `json:"id"`
	TeamID      string   `json:"team_id"`
	EditionName string   `json:"edition_name"` // Icon, Association, Statement, City, Classic
	ColorTags   []string `json:"color_tags"`   // e.g. ["blue", "orange"]
	Description string   `json:"description,omitempty"`
	Season      string   `json:"season"`
}

// Game represents a single NBA game.
type Game struct {
	GameID   string    `json:"game_id"`
	GameDate time.Time `json:"game_date"`
	HomeTeam string    `json:"home_team"`
	AwayTeam string    `json:"away_team"`
	Season   string    `json:"season"`
}

// GameJerseyAssignment maps a team to the jersey they wore in a specific game.
type GameJerseyAssignment struct {
	ID       int    `json:"id"`
	GameID   string `json:"game_id"`
	TeamID   string `json:"team_id"`
	JerseyID int    `json:"jersey_id"`
	Verified bool   `json:"verified"`
	Notes    string `json:"notes,omitempty"`
}

// JerseyStatLine holds aggregated stats for one jersey edition.
type JerseyStatLine struct {
	EditionName string   `json:"edition_name"`
	ColorTags   []string `json:"color_tags"`
	GP          int      `json:"gp"`
	Wins        int      `json:"wins"`
	Losses      int      `json:"losses"`
	WinPct      float64  `json:"win_pct"`
	PPG         float64  `json:"ppg"`
	OppPPG      float64  `json:"opp_ppg"`
	NetRating   float64  `json:"net_rating"`
}
