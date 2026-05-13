// Command brunson-stats fetches Jalen Brunson's per-game box scores for the
// 2025–26 NBA season from the Ball Don't Lie API (season year 2025).
//
// Requires BALLDONTLIE_API_KEY (env or first `.env` in cwd / parents) and an
// account tier that includes game player stats.
// See https://docs.balldontlie.io/
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	baseURL    = "https://api.balldontlie.io"
	seasonYear = 2025 // calendar start year of 2025–26
)

type listEnvelope struct {
	Data json.RawMessage `json:"data"`
	Meta *meta           `json:"meta"`
}

type meta struct {
	NextCursor *int64 `json:"next_cursor"`
	PerPage    int    `json:"per_page"`
}

type player struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Team      *struct {
		Abbreviation string `json:"abbreviation"`
	} `json:"team"`
}

type team struct {
	Abbreviation string `json:"abbreviation"`
}

type game struct {
	Date         string `json:"date"`
	Season       int    `json:"season"`
	Postseason   bool   `json:"postseason"`
	HomeTeam     team   `json:"home_team"`
	VisitorTeam  team   `json:"visitor_team"`
	HomeScore    int    `json:"home_team_score"`
	VisitorScore int    `json:"visitor_team_score"`
}

type statLine struct {
	Min  string `json:"min"`
	FGM  int    `json:"fgm"`
	FGA  int    `json:"fga"`
	FG3M int    `json:"fg3m"`
	FG3A int    `json:"fg3a"`
	FTM  int    `json:"ftm"`
	FTA  int    `json:"fta"`
	OReb int    `json:"oreb"`
	DReb int    `json:"dreb"`
	Reb  int    `json:"reb"`
	Ast  int    `json:"ast"`
	Stl  int    `json:"stl"`
	Blk  int    `json:"blk"`
	Tov  int    `json:"turnover"`
	PF   int    `json:"pf"`
	Pts  int    `json:"pts"`
	Team team   `json:"team"`
	Game game   `json:"game"`
}

func main() {
	tryLoadDotEnv()
	apiKey := strings.TrimSpace(os.Getenv("BALLDONTLIE_API_KEY"))
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "Set BALLDONTLIE_API_KEY (see https://app.balldontlie.io/)")
		os.Exit(1)
	}

	client := &http.Client{Timeout: 45 * time.Second}

	p, err := findBrunson(client, apiKey)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	abbr := ""
	if p.Team != nil {
		abbr = p.Team.Abbreviation
	}
	fmt.Printf("Player: %s %s (id=%d, team=%s)\n", p.FirstName, p.LastName, p.ID, abbr)
	fmt.Printf("Season: %d–%d (API season=%d, regular season only)\n\n", seasonYear, seasonYear+1, seasonYear)

	lines, err := fetchAllStats(client, apiKey, p.ID)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if len(lines) == 0 {
		fmt.Println("No game logs returned. The season may not have started yet, or your API tier may not include /nba/v1/stats.")
		return
	}

	printTable(lines)
	printTotals(lines)
}

func findBrunson(client *http.Client, apiKey string) (*player, error) {
	u, _ := url.Parse(baseURL + "/nba/v1/players")
	q := u.Query()
	q.Set("first_name", "Jalen")
	q.Set("last_name", "Brunson")
	q.Set("per_page", "100")
	u.RawQuery = q.Encode()

	var env listEnvelope
	if err := getJSON(client, apiKey, u.String(), &env); err != nil {
		return nil, err
	}

	var list []player
	if err := json.Unmarshal(env.Data, &list); err != nil {
		return nil, fmt.Errorf("decode players: %w", err)
	}
	for i := range list {
		if strings.EqualFold(list[i].FirstName, "Jalen") && strings.EqualFold(list[i].LastName, "Brunson") {
			return &list[i], nil
		}
	}
	return nil, fmt.Errorf("no player matched Jalen Brunson in API results")
}

func fetchAllStats(client *http.Client, apiKey string, playerID int) ([]statLine, error) {
	var out []statLine
	var cursor *int64

	for page := 1; ; page++ {
		u, _ := url.Parse(baseURL + "/nba/v1/stats")
		q := u.Query()
		q.Add("player_ids[]", fmt.Sprintf("%d", playerID))
		q.Add("seasons[]", fmt.Sprintf("%d", seasonYear))
		q.Set("postseason", "false")
		q.Set("per_page", "100")
		if cursor != nil {
			q.Set("cursor", fmt.Sprintf("%d", *cursor))
		}
		u.RawQuery = q.Encode()

		var env listEnvelope
		if err := getJSON(client, apiKey, u.String(), &env); err != nil {
			if page == 1 && strings.Contains(err.Error(), "401") {
				return nil, fmt.Errorf("stats page 1: %w\n(hint: game player stats need an ALL-STAR+ NBA plan — see https://docs.balldontlie.io/)", err)
			}
			return nil, fmt.Errorf("stats page %d: %w", page, err)
		}

		var batch []statLine
		if err := json.Unmarshal(env.Data, &batch); err != nil {
			return nil, fmt.Errorf("decode stats: %w", err)
		}
		if len(batch) == 0 {
			break
		}
		out = append(out, batch...)

		if env.Meta == nil || env.Meta.NextCursor == nil {
			break
		}
		cursor = env.Meta.NextCursor
	}
	return out, nil
}

func getJSON(client *http.Client, apiKey, rawURL string, dst any) error {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", apiKey)

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("%s: %s", res.Status, strings.TrimSpace(string(body)))
	}
	if err := json.Unmarshal(body, dst); err != nil {
		return fmt.Errorf("json: %w", err)
	}
	return nil
}

func opponentAbbr(s statLine) string {
	if s.Team.Abbreviation == s.Game.HomeTeam.Abbreviation {
		return s.Game.VisitorTeam.Abbreviation
	}
	return s.Game.HomeTeam.Abbreviation
}

func oppColumn(s statLine) string {
	prefix := "vs "
	if s.Team.Abbreviation == s.Game.VisitorTeam.Abbreviation {
		prefix = "@"
	}
	return prefix + opponentAbbr(s)
}

func printTable(lines []statLine) {
	fmt.Printf("%-12s %-6s %5s %3s %3s %3s %7s %7s %7s %3s %3s\n",
		"DATE", "OPP", "MIN", "PTS", "REB", "AST", "FG", "3P", "FT", "TO", "PF")
	for _, s := range lines {
		fmt.Printf("%-12s %-6s %5s %3d %3d %3d %d-%d %d-%d %d-%d %3d %3d\n",
			s.Game.Date,
			oppColumn(s),
			s.Min,
			s.Pts,
			s.Reb,
			s.Ast,
			s.FGM, s.FGA,
			s.FG3M, s.FG3A,
			s.FTM, s.FTA,
			s.Tov,
			s.PF,
		)
	}
}

func printTotals(lines []statLine) {
	n := len(lines)
	var pts, reb, ast, fgm, fga, fg3m, fg3a, ftm, fta, tov, pf int
	for _, s := range lines {
		pts += s.Pts
		reb += s.Reb
		ast += s.Ast
		fgm += s.FGM
		fga += s.FGA
		fg3m += s.FG3M
		fg3a += s.FG3A
		ftm += s.FTM
		fta += s.FTA
		tov += s.Tov
		pf += s.PF
	}
	fmt.Println()
	fmt.Printf("Games: %d\n", n)
	fmt.Printf("Totals — PTS %d REB %d AST %d TOV %d PF %d\n", pts, reb, ast, tov, pf)
	fmt.Printf("Shooting — FG %d-%d (%.3f) 3P %d-%d FT %d-%d\n",
		fgm, fga, safePct(fgm, fga), fg3m, fg3a, ftm, fta)
	fmt.Printf("Per game — PTS %.1f REB %.1f AST %.1f\n",
		float64(pts)/float64(n), float64(reb)/float64(n), float64(ast)/float64(n))
}

func safePct(made, att int) float64 {
	if att == 0 {
		return 0
	}
	return float64(made) / float64(att)
}

// tryLoadDotEnv reads the first `.env` found in the working directory or a few
// parent directories. Only sets variables that are not already in the process
// environment (so exported vars win).
func tryLoadDotEnv() {
	for _, dir := range []string{".", "..", "../..", "../../.."} {
		path := filepath.Join(dir, ".env")
		if applyDotEnvFile(path) {
			return
		}
	}
}

func applyDotEnvFile(path string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		i := strings.IndexByte(line, '=')
		if i <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:i])
		val := strings.TrimSpace(line[i+1:])
		if key == "" {
			continue
		}
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
	return true
}
