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
SELECT game_id, game_date, home_team, away_team, season
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

-- TODO: team jersey stats aggregation query (REQ-003)
-- TODO: player jersey stats aggregation query (REQ-003)
-- TODO: player search query
