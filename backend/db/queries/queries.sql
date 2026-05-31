-- JerseyStats queries — used by sqlc to generate Go code.
-- See docs/prd.md REQ-003 for the aggregation requirements.

-- name: ListTeams :many
SELECT id, name, city FROM teams ORDER BY name;

-- name: GetTeam :one
SELECT id, name, city FROM teams WHERE id = $1;

-- name: ListJerseyEditions :many
SELECT id, team_id, edition_name, color_tags, description, season
FROM jersey_editions
WHERE team_id = $1 AND season = $2
ORDER BY edition_name;

-- name: GetGamesByTeamAndSeason :many
SELECT game_id, game_date, home_team, away_team, home_score, away_score, season
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
SELECT g.game_id, g.game_date, g.home_team, g.away_team
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
  END), 1) AS opp_ppg
FROM game_jersey_assignments gja
JOIN jersey_editions je ON je.id = gja.jersey_id
JOIN games g ON g.game_id = gja.game_id
WHERE gja.team_id = $1 AND g.season = $2
  AND g.home_score IS NOT NULL
GROUP BY je.edition_name, je.color_tags
ORDER BY games_played DESC;

-- name: GetPlayerJerseyStats :many
-- Player stats aggregated by jersey edition for a given season.
SELECT
  je.edition_name,
  je.color_tags,
  COUNT(*)::INT AS games_played,
  ROUND(AVG(pgl.pts), 1) AS ppg,
  ROUND(AVG(pgl.reb), 1) AS rpg,
  ROUND(AVG(pgl.ast), 1) AS apg,
  ROUND(AVG(pgl.fg3m), 1) AS fg3_mpg,
  CASE WHEN SUM(pgl.fga) > 0
    THEN ROUND(SUM(pgl.fgm)::NUMERIC / SUM(pgl.fga) * 100, 1)
    ELSE 0
  END AS fg_pct,
  CASE WHEN SUM(pgl.fta) > 0
    THEN ROUND(SUM(pgl.ftm)::NUMERIC / SUM(pgl.fta) * 100, 1)
    ELSE 0
  END AS ft_pct,
  ROUND(AVG(pgl.plus_minus), 1) AS plus_minus
FROM player_game_logs pgl
JOIN games g ON g.game_id = pgl.game_id
JOIN game_jersey_assignments gja ON gja.game_id = g.game_id AND gja.team_id = pgl.team_id
JOIN jersey_editions je ON je.id = gja.jersey_id
WHERE pgl.player_id = $1 AND g.season = $2
GROUP BY je.edition_name, je.color_tags
ORDER BY games_played DESC;

-- name: SearchPlayers :many
-- Search players by name prefix (case-insensitive).
SELECT DISTINCT player_id, player_name, team_id
FROM player_game_logs
WHERE player_name ILIKE $1 || '%'
ORDER BY player_name
LIMIT 20;
