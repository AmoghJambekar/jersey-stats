# JerseyStats — local tasks (docs/ROADMAP.md §19)
.PHONY: help db-up db-down run-api sqlc ingest-games

help:
	@echo "Targets: db-up db-down run-api sqlc ingest-games (see docs/ROADMAP.md)"

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

run-api:
	go run ./cmd/api

sqlc:
	sqlc generate

ingest-games:
	python scripts/nba/fetch_regular_season_games.py --season 2024-25 -o data/games_regular_2024_25.csv
