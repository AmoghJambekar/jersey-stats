package nba

import "strings"

// NBAIDToAbbr maps NBA Stats API numeric team IDs to the abbreviations
// used in the jersey-stats database (matching backend/db/seed/teams.sql).
var NBAIDToAbbr = map[int]string{
	1610612737: "ATL",
	1610612738: "BOS",
	1610612751: "BKN",
	1610612766: "CHA",
	1610612741: "CHI",
	1610612739: "CLE",
	1610612742: "DAL",
	1610612743: "DEN",
	1610612765: "DET",
	1610612744: "GSW",
	1610612745: "HOU",
	1610612754: "IND",
	1610612746: "LAC",
	1610612747: "LAL",
	1610612763: "MEM",
	1610612748: "MIA",
	1610612749: "MIL",
	1610612750: "MIN",
	1610612740: "NOP",
	1610612752: "NYK",
	1610612760: "OKC",
	1610612753: "ORL",
	1610612755: "PHI",
	1610612756: "PHX",
	1610612757: "POR",
	1610612758: "SAC",
	1610612759: "SAS",
	1610612761: "TOR",
	1610612762: "UTA",
	1610612764: "WAS",
}

// AbbrToNBAID is the reverse of NBAIDToAbbr.
var AbbrToNBAID map[string]int

func init() {
	AbbrToNBAID = make(map[string]int, len(NBAIDToAbbr))
	for id, abbr := range NBAIDToAbbr {
		AbbrToNBAID[abbr] = id
	}
}

// AllNBATeamIDs returns all 30 numeric team IDs for iteration.
func AllNBATeamIDs() []int {
	ids := make([]int, 0, len(NBAIDToAbbr))
	for id := range NBAIDToAbbr {
		ids = append(ids, id)
	}
	return ids
}

// matchupAliases maps the short abbreviations the NBA API uses in matchup
// strings to the abbreviations in our database.
var matchupAliases = map[string]string{
	"GS":   "GSW",
	"SA":   "SAS",
	"NY":   "NYK",
	"NO":   "NOP",
	"PHO":  "PHX",
	"UTAH": "UTA",
	"BKN":  "BKN", // sometimes appears as BRK
	"BRK":  "BKN",
}

// NormalizeAbbr converts an NBA API abbreviation to the database abbreviation,
// handling known aliases.
func NormalizeAbbr(abbr string) string {
	abbr = strings.TrimSpace(abbr)
	if mapped, ok := matchupAliases[abbr]; ok {
		return mapped
	}
	return abbr
}

// ParseMatchup parses an NBA matchup string like "NYK vs. BOS" or "NYK @ BOS".
// Returns the team abbreviation, opponent abbreviation (both normalized to DB form),
// and whether the team was home.
func ParseMatchup(matchup string) (team, opponent string, isHome bool) {
	if parts := strings.SplitN(matchup, " vs. ", 2); len(parts) == 2 {
		return NormalizeAbbr(parts[0]), NormalizeAbbr(parts[1]), true
	}
	if parts := strings.SplitN(matchup, " @ ", 2); len(parts) == 2 {
		return NormalizeAbbr(parts[0]), NormalizeAbbr(parts[1]), false
	}
	return matchup, "", false
}
