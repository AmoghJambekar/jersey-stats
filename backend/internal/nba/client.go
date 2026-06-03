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
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"golang.org/x/time/rate"
)

const baseURL = "https://stats.nba.com/stats/"

// Client fetches game and player data from stats.nba.com.
type Client struct {
	http    *http.Client
	limiter *rate.Limiter
	log     *slog.Logger
}

// NewClient creates an NBA Stats API client with rate limiting (1 req/sec).
func NewClient(logger *slog.Logger) *Client {
	return &Client{
		http:    &http.Client{Timeout: 30 * time.Second},
		limiter: rate.NewLimiter(rate.Limit(1), 1),
		log:     logger,
	}
}

// --- API response types ---

// nbaResponse is the envelope for all NBA Stats API responses.
type nbaResponse struct {
	ResultSets []resultSet `json:"resultSets"`
}

type resultSet struct {
	Headers []string        `json:"headers"`
	RowSet  [][]interface{} `json:"rowSet"`
}

// --- Domain types ---

// GameLogEntry holds one row from a team's game log.
type GameLogEntry struct {
	GameID   string
	GameDate string // raw from API, e.g. "APR 13, 2026"
	Matchup  string // "NYK vs. BOS" (home) or "NYK @ BOS" (away)
	WL       string // "W" or "L"
	PTS      int    // team's points scored
}

// PlayerGameLogEntry holds one row from a player's game log.
type PlayerGameLogEntry struct {
	GameID    string
	TeamAbbr  string // normalized DB abbreviation, parsed from matchup
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

// PlayerInfo holds a player from the commonallplayers endpoint.
type PlayerInfo struct {
	PlayerID int
	Name     string
	TeamID   int    // NBA numeric team ID
	TeamAbbr string // DB abbreviation
}

// --- HTTP transport ---

// do executes a rate-limited GET with browser headers and retry on 429.
func (c *Client) do(ctx context.Context, endpoint string, params url.Values) (*nbaResponse, error) {
	fullURL := baseURL + endpoint + "?" + params.Encode()

	const maxRetries = 5
	backoff := 2 * time.Second

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if err := c.limiter.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limiter: %w", err)
		}

		req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
		if err != nil {
			return nil, fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Referer", "https://www.nba.com/")
		req.Header.Set("Origin", "https://www.nba.com")
		req.Header.Set("Accept", "application/json, text/plain, */*")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9")

		resp, err := c.http.Do(req)
		if err != nil {
			return nil, fmt.Errorf("http %s: %w", endpoint, err)
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("read body %s: %w", endpoint, err)
		}

		if resp.StatusCode == http.StatusOK {
			var result nbaResponse
			if err := json.Unmarshal(body, &result); err != nil {
				return nil, fmt.Errorf("parse json %s: %w", endpoint, err)
			}
			return &result, nil
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			c.log.Warn("429 from NBA API, backing off",
				"endpoint", endpoint,
				"attempt", attempt+1,
				"backoff", backoff,
			)
			select {
			case <-time.After(backoff):
				backoff = time.Duration(math.Min(float64(backoff*2), float64(60*time.Second)))
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		return nil, fmt.Errorf("NBA API %s returned %d", endpoint, resp.StatusCode)
	}
	return nil, fmt.Errorf("NBA API %s: max retries exceeded on 429", endpoint)
}

// --- Column index helpers ---
// The NBA API returns rows as arrays of interface{}, with a separate
// headers array mapping column names to positions. These helpers avoid
// hardcoding column indices.

func colIndex(headers []string) map[string]int {
	m := make(map[string]int, len(headers))
	for i, h := range headers {
		m[h] = i
	}
	return m
}

func getStr(row []interface{}, idx map[string]int, col string) string {
	i, ok := idx[col]
	if !ok || i >= len(row) || row[i] == nil {
		return ""
	}
	switch v := row[i].(type) {
	case string:
		return v
	case float64:
		if v == float64(int64(v)) {
			return strconv.FormatInt(int64(v), 10)
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		return fmt.Sprint(v)
	}
}

func getInt(row []interface{}, idx map[string]int, col string) int {
	i, ok := idx[col]
	if !ok || i >= len(row) || row[i] == nil {
		return 0
	}
	switch v := row[i].(type) {
	case float64:
		return int(v)
	case string:
		n, _ := strconv.Atoi(v)
		return n
	default:
		return 0
	}
}

func getFloat(row []interface{}, idx map[string]int, col string) float64 {
	i, ok := idx[col]
	if !ok || i >= len(row) || row[i] == nil {
		return 0
	}
	switch v := row[i].(type) {
	case float64:
		return v
	case string:
		// Handle "34:20" (min:sec) format used for MIN in some responses.
		if parts := strings.SplitN(v, ":", 2); len(parts) == 2 {
			mins, _ := strconv.ParseFloat(parts[0], 64)
			secs, _ := strconv.ParseFloat(parts[1], 64)
			return math.Round((mins+secs/60)*10) / 10
		}
		f, _ := strconv.ParseFloat(v, 64)
		return f
	default:
		return 0
	}
}

// ParseGameDate converts NBA API date formats to "2006-01-02".
// Handles "APR 13, 2026" and "2026-04-13T..." formats.
func ParseGameDate(raw string) string {
	// ISO prefix: "2026-04-13T00:00:00" or "2026-04-13"
	if len(raw) >= 10 && raw[4] == '-' {
		return raw[:10]
	}
	// Month-name format: "APR 13, 2026"
	t, err := time.Parse("Jan 02, 2006", strings.TrimSpace(raw))
	if err == nil {
		return t.Format("2006-01-02")
	}
	return raw
}

// --- API methods ---

// GetTeamGameLog fetches all games for a team in a season.
func (c *Client) GetTeamGameLog(ctx context.Context, nbaTeamID int, season string) ([]GameLogEntry, error) {
	resp, err := c.do(ctx, "teamgamelog", url.Values{
		"TeamID":     {strconv.Itoa(nbaTeamID)},
		"Season":     {season},
		"SeasonType": {"Regular Season"},
	})
	if err != nil {
		return nil, err
	}
	if len(resp.ResultSets) == 0 {
		return nil, fmt.Errorf("teamgamelog: empty resultSets for team %d", nbaTeamID)
	}

	rs := resp.ResultSets[0]
	idx := colIndex(rs.Headers)
	entries := make([]GameLogEntry, 0, len(rs.RowSet))
	for _, row := range rs.RowSet {
		entries = append(entries, GameLogEntry{
			GameID:   getStr(row, idx, "Game_ID"),
			GameDate: getStr(row, idx, "GAME_DATE"),
			Matchup:  getStr(row, idx, "MATCHUP"),
			WL:       getStr(row, idx, "WL"),
			PTS:      getInt(row, idx, "PTS"),
		})
	}
	return entries, nil
}

// GetPlayerGameLog fetches per-game stats for a player in a season.
func (c *Client) GetPlayerGameLog(ctx context.Context, playerID int, season string) ([]PlayerGameLogEntry, error) {
	resp, err := c.do(ctx, "playergamelog", url.Values{
		"PlayerID":   {strconv.Itoa(playerID)},
		"Season":     {season},
		"SeasonType": {"Regular Season"},
	})
	if err != nil {
		return nil, err
	}
	if len(resp.ResultSets) == 0 {
		return nil, fmt.Errorf("playergamelog: empty resultSets for player %d", playerID)
	}

	rs := resp.ResultSets[0]
	idx := colIndex(rs.Headers)
	entries := make([]PlayerGameLogEntry, 0, len(rs.RowSet))
	for _, row := range rs.RowSet {
		matchup := getStr(row, idx, "MATCHUP")
		team, _, _ := ParseMatchup(matchup)

		entries = append(entries, PlayerGameLogEntry{
			GameID:    getStr(row, idx, "Game_ID"),
			TeamAbbr:  team,
			PTS:       getInt(row, idx, "PTS"),
			REB:       getInt(row, idx, "REB"),
			AST:       getInt(row, idx, "AST"),
			FGM:       getInt(row, idx, "FGM"),
			FGA:       getInt(row, idx, "FGA"),
			FG3M:      getInt(row, idx, "FG3M"),
			FG3A:      getInt(row, idx, "FG3A"),
			FTM:       getInt(row, idx, "FTM"),
			FTA:       getInt(row, idx, "FTA"),
			MIN:       getFloat(row, idx, "MIN"),
			PlusMinus: getFloat(row, idx, "PLUS_MINUS"),
		})
	}
	return entries, nil
}

// GetAllPlayers fetches all active players for a season.
func (c *Client) GetAllPlayers(ctx context.Context, season string) ([]PlayerInfo, error) {
	resp, err := c.do(ctx, "commonallplayers", url.Values{
		"LeagueID":            {"00"},
		"Season":              {season},
		"IsOnlyCurrentSeason": {"1"},
	})
	if err != nil {
		return nil, err
	}
	if len(resp.ResultSets) == 0 {
		return nil, fmt.Errorf("commonallplayers: empty resultSets")
	}

	rs := resp.ResultSets[0]
	idx := colIndex(rs.Headers)
	var players []PlayerInfo
	for _, row := range rs.RowSet {
		teamID := getInt(row, idx, "TEAM_ID")
		if teamID == 0 {
			continue
		}
		players = append(players, PlayerInfo{
			PlayerID: getInt(row, idx, "PERSON_ID"),
			Name:     getStr(row, idx, "DISPLAY_FIRST_LAST"),
			TeamID:   teamID,
			TeamAbbr: NBAIDToAbbr[teamID],
		})
	}
	return players, nil
}
