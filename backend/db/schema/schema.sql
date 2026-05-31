-- JerseyStats schema — docs/prd.md REQ-001
--
-- Tables for tracking NBA jersey colorway performance.
-- This file is read by sqlc to generate Go types.

CREATE TABLE teams (
  id    TEXT PRIMARY KEY,  -- team abbreviation, e.g. "NYK"
  name  TEXT NOT NULL,     -- e.g. "New York Knicks"
  city  TEXT NOT NULL      -- e.g. "New York"
);

CREATE TABLE jersey_editions (
  id            SERIAL PRIMARY KEY,
  team_id       TEXT NOT NULL REFERENCES teams(id),
  edition_name  TEXT NOT NULL,          -- Icon, Association, Statement, City, Classic
  color_tags    TEXT[] NOT NULL,        -- e.g. {"blue","orange"}
  description   TEXT,                   -- e.g. "2025-26 Statement Edition - dark blue"
  season        TEXT NOT NULL DEFAULT '2025-26',
  UNIQUE(team_id, edition_name, season)
);

CREATE TABLE games (
  game_id    TEXT PRIMARY KEY,          -- NBA Stats API game_id, e.g. "0022500123"
  game_date  DATE NOT NULL,
  home_team  TEXT NOT NULL REFERENCES teams(id),
  away_team  TEXT NOT NULL REFERENCES teams(id),
  season     TEXT NOT NULL DEFAULT '2025-26'
);

CREATE TABLE game_jersey_assignments (
  id          SERIAL PRIMARY KEY,
  game_id     TEXT NOT NULL REFERENCES games(game_id),
  team_id     TEXT NOT NULL REFERENCES teams(id),
  jersey_id   INT  NOT NULL REFERENCES jersey_editions(id),
  verified    BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  UNIQUE(game_id, team_id)
);

CREATE TABLE player_game_logs (
  id          SERIAL PRIMARY KEY,
  game_id     TEXT NOT NULL REFERENCES games(game_id),
  player_id   TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team_id     TEXT NOT NULL REFERENCES teams(id),
  pts         INT,
  reb         INT,
  ast         INT,
  fgm         INT,
  fga         INT,
  fg3m        INT,
  fg3a        INT,
  ftm         INT,
  fta         INT,
  min         NUMERIC(5,1),
  plus_minus  NUMERIC(5,1),
  UNIQUE(game_id, player_id)
);
