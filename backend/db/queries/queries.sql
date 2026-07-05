-- JerseyStats queries — used by sqlc to generate Go code.
-- See docs/prd.md REQ-003 for the aggregation requirements.

-- name: ListTeams :many
SELECT id, name, city, nba_id, conference, division FROM teams ORDER BY conference, division, name;

-- name: GetTeam :one
SELECT id, name, city, nba_id, conference, division FROM teams WHERE id = $1;

-- name: ListJerseyEditions :many
SELECT id, team_id, edition_name, color_tags, description, season
FROM jersey_editions
WHERE team_id = $1 AND season = $2
ORDER BY edition_name;

-- name: GetGamesByTeamAndSeason :many
SELECT game_id, game_date, home_team, away_team, home_score, away_score, season, season_type
FROM games
WHERE (home_team = $1 OR away_team = $1) AND season = $2
ORDER BY game_date;

-- name: GetAssignmentsForTeam :many
SELECT gja.game_id, gja.team_id, gja.jersey_id, gja.verified, gja.notes,
       je.edition_name, je.color_tags
FROM game_jersey_assignments gja
JOIN jersey_editions je ON je.id = gja.jersey_id
WHERE gja.team_id = $1
ORDER BY gja.game_id;

-- name: UpsertAssignment :exec
INSERT INTO game_jersey_assignments (game_id, team_id, jersey_id, verified, notes)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (game_id, team_id) DO UPDATE
SET jersey_id = EXCLUDED.jersey_id,
    verified  = EXCLUDED.verified,
    notes     = EXCLUDED.notes;

-- name: MissingAssignments :many
-- Games where at least one team has no jersey assignment.
SELECT g.game_id, g.game_date, g.home_team, g.away_team, g.season_type
FROM games g
WHERE g.season = $1
  AND (
    NOT EXISTS (SELECT 1 FROM game_jersey_assignments gja WHERE gja.game_id = g.game_id AND gja.team_id = g.home_team)
    OR
    NOT EXISTS (SELECT 1 FROM game_jersey_assignments gja WHERE gja.game_id = g.game_id AND gja.team_id = g.away_team)
  )
ORDER BY g.game_date;

-- name: GetTeamJerseyStats :many
-- Team record and scoring aggregated by jersey edition for a given season.
SELECT
  je.edition_name,
  je.color_tags,
  COUNT(*)::INT AS games_played,
  COUNT(*) FILTER (WHERE
    (g.home_team = $1 AND g.home_score > g.away_score)
    OR (g.away_team = $1 AND g.away_score > g.home_score)
  )::INT AS wins,
  COUNT(*) FILTER (WHERE
    (g.home_team = $1 AND g.home_score < g.away_score)
    OR (g.away_team = $1 AND g.away_score < g.home_score)
  )::INT AS losses,
  ROUND(AVG(CASE
    WHEN g.home_team = $1 THEN g.home_score
    ELSE g.away_score
  END), 1) AS ppg,
  ROUND(AVG(CASE
    WHEN g.home_team = $1 THEN g.away_score
    ELSE g.home_score
  END), 1) AS opp_ppg,
  ROUND(AVG(team_reb), 1) AS rpg,
  ROUND(AVG(team_ast), 1) AS apg
FROM game_jersey_assignments gja
JOIN jersey_editions je ON je.id = gja.jersey_id
JOIN games g ON g.game_id = gja.game_id
LEFT JOIN (
  SELECT game_id, team_id, SUM(reb)::NUMERIC AS team_reb, SUM(ast)::NUMERIC AS team_ast
  FROM player_game_logs
  GROUP BY game_id, team_id
) pgl ON pgl.game_id = g.game_id AND pgl.team_id = gja.team_id
WHERE gja.team_id = $1 AND g.season = $2
  AND g.home_score IS NOT NULL
GROUP BY je.edition_name, je.color_tags
ORDER BY games_played DESC;

-- name: GetPlayerJerseyStats :many
-- Player stats aggregated by jersey edition for a given season.
SELECT
  pgl.team_id,
  t.name AS team_name,
  je.edition_name,
  je.color_tags,
  COUNT(*)::INT AS games_played,
  ROUND(AVG(pgl.pts), 1) AS ppg,
  ROUND(AVG(pgl.reb), 1) AS rpg,
  ROUND(AVG(pgl.ast), 1) AS apg,
  CASE WHEN SUM(pgl.fg3a) > 0
    THEN ROUND(SUM(pgl.fg3m)::NUMERIC / SUM(pgl.fg3a) * 100, 1)
    ELSE 0::NUMERIC
  END AS fg3_pct,
  CASE WHEN SUM(pgl.fga) > 0
    THEN ROUND(SUM(pgl.fgm)::NUMERIC / SUM(pgl.fga) * 100, 1)
    ELSE 0::NUMERIC
  END AS fg_pct,
  CASE WHEN SUM(pgl.fta) > 0
    THEN ROUND(SUM(pgl.ftm)::NUMERIC / SUM(pgl.fta) * 100, 1)
    ELSE 0::NUMERIC
  END AS ft_pct,
  ROUND(AVG(pgl.plus_minus), 1) AS plus_minus
FROM player_game_logs pgl
JOIN teams t ON t.id = pgl.team_id
JOIN games g ON g.game_id = pgl.game_id
JOIN game_jersey_assignments gja ON gja.game_id = g.game_id AND gja.team_id = pgl.team_id
JOIN jersey_editions je ON je.id = gja.jersey_id
WHERE pgl.player_id = $1 AND g.season = $2
GROUP BY pgl.team_id, t.name, je.edition_name, je.color_tags
ORDER BY games_played DESC;

-- name: GetTeamRoster :many
SELECT player_id, player_name, team_id
FROM (SELECT DISTINCT player_id, player_name, team_id FROM player_game_logs WHERE team_id = $1) sub
ORDER BY regexp_replace(regexp_replace(player_name, '\s+(Jr\.|Sr\.|II|III|IV)$', ''), '.* ', ''), player_name;

-- name: SearchPlayers :many
-- Search players by name (case-insensitive). Returns one row per player.
-- Caller must wrap the search term with '%'.
SELECT player_id, player_name, team_id
FROM (
  SELECT player_id, player_name, team_id,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY MAX(game_id) DESC) AS rn
  FROM player_game_logs
  WHERE player_name ILIKE $1
  GROUP BY player_id, player_name, team_id
) sub
WHERE rn = 1
ORDER BY player_name
LIMIT 20;

-- name: UpsertGame :exec
-- Insert a game or update scores on re-ingestion.
INSERT INTO games (game_id, game_date, home_team, away_team, home_score, away_score, season, season_type)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (game_id) DO UPDATE
SET home_score   = EXCLUDED.home_score,
    away_score   = EXCLUDED.away_score,
    season_type  = EXCLUDED.season_type;

-- name: UpsertPlayerGameLog :exec
-- Insert or update a player's per-game stats.
INSERT INTO player_game_logs (game_id, player_id, player_name, team_id, pts, reb, ast, fgm, fga, fg3m, fg3a, ftm, fta, min, plus_minus)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (game_id, player_id) DO UPDATE
SET player_name = EXCLUDED.player_name,
    team_id     = EXCLUDED.team_id,
    pts         = EXCLUDED.pts,
    reb         = EXCLUDED.reb,
    ast         = EXCLUDED.ast,
    fgm         = EXCLUDED.fgm,
    fga         = EXCLUDED.fga,
    fg3m        = EXCLUDED.fg3m,
    fg3a        = EXCLUDED.fg3a,
    ftm         = EXCLUDED.ftm,
    fta         = EXCLUDED.fta,
    min         = EXCLUDED.min,
    plus_minus  = EXCLUDED.plus_minus;

-- name: GetGameByDateAndTeams :one
-- Look up a game_id by date and team matchup (used by CSV import).
SELECT game_id FROM games
WHERE game_date = $1 AND home_team = $2 AND away_team = $3;

-- name: GetJerseyEditionID :one
-- Look up a jersey edition's ID by team, name, and season.
SELECT id FROM jersey_editions
WHERE team_id = $1 AND edition_name = $2 AND season = $3;

-- name: GetTeamGameLog :many
SELECT g.game_id, g.game_date, g.home_team, g.away_team, g.home_score, g.away_score, g.season_type,
       hje.edition_name AS home_jersey, aje.edition_name AS away_jersey
FROM games g
LEFT JOIN game_jersey_assignments hgja ON hgja.game_id = g.game_id AND hgja.team_id = g.home_team
LEFT JOIN jersey_editions hje ON hje.id = hgja.jersey_id
LEFT JOIN game_jersey_assignments agja ON agja.game_id = g.game_id AND agja.team_id = g.away_team
LEFT JOIN jersey_editions aje ON aje.id = agja.jersey_id
WHERE (g.home_team = $1 OR g.away_team = $1) AND g.season = $2
  AND g.home_score IS NOT NULL
ORDER BY g.game_date DESC;

-- name: GetPlayerGameLogsForTeam :many
SELECT pgl.game_id, pgl.player_name, pgl.team_id, pgl.pts, pgl.reb, pgl.ast
FROM player_game_logs pgl
JOIN games g ON g.game_id = pgl.game_id
WHERE (g.home_team = $1 OR g.away_team = $1) AND g.season = $2
  AND g.home_score IS NOT NULL
ORDER BY pgl.game_id;

-- name: GetPlayerTeams :many
-- All teams a player has played for, ordered by first game date.
SELECT sub.team_id, t.name AS team_name, sub.player_name::TEXT AS player_name
FROM (
  SELECT pgl.team_id, MAX(pgl.player_name) AS player_name, MIN(g.game_date) AS first_game
  FROM player_game_logs pgl
  JOIN games g ON g.game_id = pgl.game_id
  WHERE pgl.player_id = $1
  GROUP BY pgl.team_id
) sub
JOIN teams t ON t.id = sub.team_id
ORDER BY sub.first_game;

-- name: GetPlayerGameLog :many
SELECT g.game_date, g.home_team, g.away_team, g.home_score, g.away_score,
       hje.edition_name AS home_jersey, aje.edition_name AS away_jersey,
       pgl.team_id, pgl.pts, pgl.reb, pgl.ast, pgl.fgm, pgl.fga, pgl.fg3m, pgl.fg3a,
       pgl.ftm, pgl.fta, pgl.min, pgl.plus_minus
FROM player_game_logs pgl
JOIN games g ON g.game_id = pgl.game_id
LEFT JOIN game_jersey_assignments hgja ON hgja.game_id = g.game_id AND hgja.team_id = g.home_team
LEFT JOIN jersey_editions hje ON hje.id = hgja.jersey_id
LEFT JOIN game_jersey_assignments agja ON agja.game_id = g.game_id AND agja.team_id = g.away_team
LEFT JOIN jersey_editions aje ON aje.id = agja.jersey_id
WHERE pgl.player_id = $1 AND g.season = $2
  AND g.home_score IS NOT NULL
ORDER BY g.game_date DESC;

-- name: GetPlayerBio :one
SELECT player_id, jersey_number, position, height, weight, birth_date,
       country, last_attended, draft_year, draft_round, draft_number, draft_team, years_exp
FROM player_bios
WHERE player_id = $1;

-- name: UpsertPlayerBio :exec
INSERT INTO player_bios (player_id, jersey_number, position, height, weight, birth_date,
                          country, last_attended, draft_year, draft_round, draft_number, draft_team, years_exp)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (player_id) DO UPDATE
SET jersey_number = EXCLUDED.jersey_number,
    position      = EXCLUDED.position,
    height        = EXCLUDED.height,
    weight        = EXCLUDED.weight,
    birth_date    = EXCLUDED.birth_date,
    country       = EXCLUDED.country,
    last_attended = EXCLUDED.last_attended,
    draft_year    = EXCLUDED.draft_year,
    draft_round   = EXCLUDED.draft_round,
    draft_number  = EXCLUDED.draft_number,
    draft_team    = EXCLUDED.draft_team,
    years_exp     = EXCLUDED.years_exp;

-- name: UpdateDraftTeam :exec
UPDATE player_bios SET draft_team = $2 WHERE player_id = $1;

-- name: GetDistinctDraftYears :many
SELECT DISTINCT draft_year FROM player_bios WHERE draft_year IS NOT NULL ORDER BY draft_year;

-- name: GetDistinctPlayerIDs :many
SELECT DISTINCT player_id FROM player_game_logs ORDER BY player_id;

-- name: GetConferenceStandings :many
SELECT t.id AS team_id, t.name AS team_name,
  COUNT(*) FILTER (WHERE
    (g.home_team = t.id AND g.home_score > g.away_score)
    OR (g.away_team = t.id AND g.away_score > g.home_score)
  )::INT AS wins,
  COUNT(*) FILTER (WHERE
    (g.home_team = t.id AND g.home_score < g.away_score)
    OR (g.away_team = t.id AND g.away_score < g.home_score)
  )::INT AS losses,
  COALESCE(SUM(CASE
    WHEN g.home_team = t.id THEN g.home_score - g.away_score
    ELSE g.away_score - g.home_score
  END)::INT, 0) AS point_diff
FROM teams t
JOIN games g ON (g.home_team = t.id OR g.away_team = t.id)
WHERE t.conference = $1 AND g.season = $2 AND g.season_type = 'Regular Season'
  AND g.home_score IS NOT NULL
GROUP BY t.id, t.name
ORDER BY wins DESC, point_diff DESC;

-- name: GetConferenceRecentForm :many
WITH ranked_games AS (
  SELECT t.id AS team_id,
    CASE WHEN (g.home_team = t.id AND g.home_score > g.away_score)
         OR (g.away_team = t.id AND g.away_score > g.home_score)
    THEN 'W' ELSE 'L' END AS result,
    ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY g.game_date DESC) AS rn
  FROM teams t
  JOIN games g ON (g.home_team = t.id OR g.away_team = t.id)
  WHERE t.conference = $1 AND g.season = $2 AND g.season_type = 'Regular Season'
    AND g.home_score IS NOT NULL
)
SELECT team_id, STRING_AGG(result, '' ORDER BY rn) AS form
FROM ranked_games
WHERE rn <= 5
GROUP BY team_id;

-- name: GetTeamDepthChart :many
SELECT pgl.player_id, MAX(pgl.player_name) AS player_name,
  COALESCE(pb.position, '') AS position,
  COALESCE(pb.height, '') AS height,
  ROUND(AVG(pgl.min), 1) AS avg_min,
  COUNT(*)::INT AS games_played
FROM player_game_logs pgl
LEFT JOIN player_bios pb ON pb.player_id = pgl.player_id
JOIN games g ON g.game_id = pgl.game_id
WHERE pgl.team_id = $1 AND g.season = $2
  AND g.home_score IS NOT NULL
GROUP BY pgl.player_id, pb.position, pb.height
HAVING COUNT(*) >= 5
ORDER BY avg_min DESC NULLS LAST;
