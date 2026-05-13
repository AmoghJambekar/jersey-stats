-- Bootstrap DDL so sqlc can parse a schema before real migrations (ROADMAP §6–8).
-- Replace with canonical tables from db/migrations when they land.
CREATE TABLE IF NOT EXISTS schema_bootstrap (
    note TEXT NOT NULL PRIMARY KEY
);
