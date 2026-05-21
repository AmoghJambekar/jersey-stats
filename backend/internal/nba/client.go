// Package nba provides a Go client for the NBA Stats API (stats.nba.com).
//
// The client handles:
//   - Browser-like headers (User-Agent, Referer) to avoid 403s
//   - Rate limiting at ≤1 req/sec
//   - Exponential backoff on 429 responses
//
// See docs/prd.md REQ-002 for requirements.
package nba

import (
	"net/http"

	"golang.org/x/time/rate"
)

// Client fetches game and player data from stats.nba.com.
type Client struct {
	http    *http.Client
	limiter *rate.Limiter
}

// NewClient creates an NBA Stats API client with rate limiting (1 req/sec).
func NewClient() *Client {
	return &Client{
		http:    &http.Client{},
		limiter: rate.NewLimiter(rate.Limit(1), 1), // 1 request per second, burst of 1
	}
}

// GameLogEntry holds one row from a team's game log.
type GameLogEntry struct {
	GameID   string
	GameDate string
	Matchup  string
	WL       string // "W" or "L"
	PTS      int
	OppPTS   int
}

// PlayerGameLogEntry holds one row from a player's game log.
type PlayerGameLogEntry struct {
	GameID    string
	PTS       int
	REB       int
	AST       int
	FGM       int
	FGA       int
	FG3M      int
	FG3A      int
	FTM       int
	FTA       int
	MIN       float64
	PlusMinus float64
}

// GetTeamGameLog fetches all games for a team in a season.
func (c *Client) GetTeamGameLog(teamID, season string) ([]GameLogEntry, error) {
	// TODO: GET https://stats.nba.com/stats/teamgamelog?TeamID=...&Season=...
	return nil, nil
}

// GetPlayerGameLog fetches per-game stats for a player in a season.
func (c *Client) GetPlayerGameLog(playerID, season string) ([]PlayerGameLogEntry, error) {
	// TODO: GET https://stats.nba.com/stats/playergamelog?PlayerID=...&Season=...
	return nil, nil
}
