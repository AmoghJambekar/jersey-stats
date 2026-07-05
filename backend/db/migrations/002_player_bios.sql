-- Migration: Add player_bios table for storing player biographical data.

CREATE TABLE IF NOT EXISTS player_bios (
  player_id     TEXT PRIMARY KEY,
  jersey_number TEXT,
  position      TEXT,
  height        TEXT,
  weight        INT,
  birth_date    DATE,
  country       TEXT,
  last_attended TEXT,
  draft_year    INT,
  draft_round   INT,
  draft_number  INT,
  years_exp     INT
);
