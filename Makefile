# JerseyStats — local tasks (see docs/prd.md)
.PHONY: help db-up db-down run-api sqlc ingest-games

help:
	@echo "Targets: db-up db-down run-api sqlc ingest-games"

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

run-api:
	cd backend && go run ./cmd/api

sqlc:
	cd backend && sqlc generate

ingest-games:
	python backend/scripts/fetch_regular_season_games.py --season 2024-25
