# JerseyStats — roadmap and monorepo contract

This file is the **single source of truth** for product direction and delivery order.

---

## 1. Product and scope

- [ ] **V1:** NBA only, **one regular season** at a time (start with **2025–26** unless product says otherwise).
- [ ] Core value: stats filtered by **jersey colorway** via **manual** `jersey_assignments` (LockerVision or equivalent), not inferred from video.
- [ ] **Non-goals v1:** playoffs, multi-season compare, auth, mobile-first polish, automated jersey detection.

---

## 2. Repository and monorepo layout

Target layout (current repo should converge here):

```text
jersey-stats/
├── README.md                 # Short intro + pointers into this file
├── docs/
│   └── ROADMAP.md            # This document
├── cmd/
│   └── api/                  # Go HTTP API binary
├── internal/                 # Private app code (not importable by other modules)
│   ├── config/
│   ├── httpapi/              # Chi router, middleware (name avoids clash with net/http)
│   └── db/                   # Pool helpers; sqlc-generated code under internal/db/gen/ when enabled
├── db/
│   ├── migrations/           # Ordered SQL (pick tool: goose, golang-migrate, Atlas)
│   ├── schema/               # Bootstrap / mirror DDL for sqlc until migrations are the single source
│   └── queries/              # sqlc query files
├── frontend/                 # Next.js (App Router + TS + Tailwind)
├── scripts/
│   └── nba/                  # Python: NBA.com batch ingestion (nba_api), not user-facing
├── data/                     # Gitignored generated CSVs; keep .gitkeep only in git
├── docker-compose.yml        # Local Postgres (+ optional Adminer)
├── Makefile                  # db-up, migrate-up, run-api, etc.
├── sqlc.yaml                 # When schema + queries exist: sqlc generate
└── go.mod
```

**Conventions**

- **User-facing API:** Go in `cmd/api` + `internal/*`.
- **Upstream NBA.com:** Python only under `scripts/nba/`, run on a schedule or manually; **never** call NBA.com from request handlers.
- **Truth store:** Postgres; API reads/writes DB only.

---

## 3. Data acquisition — games and teams

- [x] **Script:** `scripts/nba/fetch_regular_season_games.py` — all **1,230** regular-schedule games (`game_id` prefix `002`), columns: `game_id`, `game_date`, `home_team_id`, `away_team_id`, `season_phase=regular`.
- [ ] **Normalize** NBA `teamId` → canonical `teams.id` (mapping table or seed column `nba_team_id`).
- [ ] **Teams seed:** 30 rows: `id`, `abbreviation`, `full_name`, `conference`, `division`, optional `logo_url`.
- [ ] **Validate:** exactly 30 teams; game count **1,230** (or verified total for that season); no duplicate `game_id`; every game references two valid teams.

---

## 4. Data acquisition — players and `player_game_stats`

- [ ] Roster snapshots per team for the season **or** distinct `player_id` from box scores.
- [ ] **`players`:** `id`, name, team rule for trades (document “last team” vs roster snapshot).
- [ ] Per-game box: minutes, pts, reb, ast, stl, blk, tov, fgm, fga, tpm, tpa, ftm, fta, plus-minus (align with v1 stat list in product).
- [ ] **`player_game_stats`:** one row per `(player_id, game_id)`; **unique** constraint in schema.
- [ ] **DNP:** document absent row vs zeros; implement consistently.
- [ ] **Validate:** row counts vs expected; spot-check vs NBA.com.

---

## 5. Colorways and jersey assignments (LockerVision)

- [ ] **`colorways`:** one row per team per edition type you track; official names.
- [ ] **Manual workflow:** ~**2,460** `(team, game)` pairs → spreadsheet `game_id`, `team_id`, `colorway_id`.
- [ ] **QC:** each `(team, game)` has exactly one assignment when that team played; no orphan ids; colorway belongs to team.
- [ ] **Import:** CSV → `jersey_assignments` (COPY or seed migration).
- [ ] **Audit:** source URL + capture date.

---

## 6. Postgres schema design

- [ ] **`games`:** PK, date, `home_team_id`, `away_team_id`, season, optional scores.
- [ ] **`teams`:** PK, abbrev, name, metadata (+ `nba_team_id` if internal PK differs).
- [ ] **`players`:** PK, display fields, optional `current_team_id` or derive from stats.
- [ ] **`player_game_stats`:** FK `players`, `games`; numerics + indexes on `(game_id)`, `(player_id)`.
- [ ] **`colorways`:** PK, `team_id`, edition (enum or text), **unique** `(team_id, edition)`.
- [ ] **`jersey_assignments`:** **unique** `(team_id, game_id)`; FKs to teams, games, colorways.
- [ ] **Indexes** for hot joins: `jersey_assignments(colorway_id)`, `(game_id, team_id)`, match aggregate query order.
- [ ] Optional: `created_at` / `updated_at` on mutable tables.

---

## 7. Migrations

- [ ] Pick tool (**goose**, **golang-migrate**, **Atlas**, or ordered plain SQL).
- [ ] **001:** extensions if needed (`uuid-ossp` / `pgcrypto`) — confirm Supabase permissions.
- [ ] **002–N:** FK-safe order: `teams` → `games` → `players` → `colorways` → `jersey_assignments` → `player_game_stats`.
- [ ] Document **ON DELETE RESTRICT vs CASCADE** per FK.
- [ ] Decide **seed migrations** vs runtime seed scripts.

---

## 8. sqlc setup

- [ ] Install `sqlc` locally; root **`sqlc.yaml`** points at **`db/schema/`** + **`db/queries/`** (bootstrap table until real DDL in §6–7 replaces it).
- [ ] When migrations become canonical, either **copy** approved DDL into `db/schema/` for sqlc or **generate** schema from a migrated DB (team choice).
- [ ] Named queries: colorways by team; games for colorway; player/team aggregates filtered by colorway; leaderboards.
- [ ] `sqlc generate` → e.g. `internal/db/gen`; CI check that generated code matches SQL.
- [ ] `Makefile` target `make sqlc`.

---

## 9. Go backend — bootstrap

- [ ] **Config:** `DATABASE_URL`, `PORT`, `CORS_ORIGINS`, optional `LOG_LEVEL`.
- [ ] **Main:** load config, **pgx** pool (max conns, idle timeout), graceful **SIGTERM**.
- [ ] **Routes:** `GET /health`, `GET /ready` (DB ping).

---

## 10. Go backend — API layer

- [ ] **Chi** router, `/api/v1` prefix.
- [ ] Middleware: request ID, **slog** (or zap), recover, per-request timeout.
- [ ] **CORS:** production origins + localhost dev.
- [ ] JSON helpers; errors `{ "error": { "code", "message" } }`.
- [ ] Pagination helpers (limit/offset or cursor).

---

## 11. Go backend — domain endpoints

- [ ] `GET /api/v1/teams`, `GET /api/v1/teams/:id`, `GET /api/v1/teams/:id/colorways`
- [ ] `GET /api/v1/colorways/:id`
- [ ] `GET /api/v1/teams/:id/stats?colorway_id=&from=&to=`
- [ ] `GET /api/v1/players/:id/stats` (same filter pattern)
- [ ] `GET /api/v1/players` (search/list if in scope)
- [ ] Optional: `GET /api/v1/games` for debugging.

---

## 12. Aggregation logic (SQL vs Go)

- [ ] SQL-first: filter `jersey_assignments` → join `games` → `player_game_stats`; `SUM` / `AVG` / `COUNT` games.
- [ ] Document **team games in jersey** vs **player games in jersey** (bench DNP edge case).
- [ ] Trades: stats only when player played for that team in that game (store `team_id` on `player_game_stats` or infer from roster).

---

## 13. Validation and edge cases

- [ ] Invalid `colorway_id` → **404**; colorway not on team → **400**.
- [ ] Empty aggregate → **200** + empty body, not error.
- [ ] **Parameterized SQL only** (sqlc).

---

## 14. Testing — backend

- [ ] Table-driven unit tests for pure helpers.
- [ ] **Integration:** docker-compose Postgres, migrations, tiny fixture, `httptest`.
- [ ] `EXPLAIN ANALYZE` on heaviest aggregate; add indexes if seq scans.

---

## 15. Frontend — Next.js bootstrap

- [ ] `create-next-app` TS, Tailwind, **App Router** (pick one router and keep it).
- [ ] `NEXT_PUBLIC_API_BASE_URL`.
- [ ] Layout: header / nav / footer; design tokens.

---

## 16. Frontend — pages and flows

- [ ] Home: value prop + entry to teams/search.
- [ ] Team page: `/teams/[slug]`; colorway picker; aggregate table + games count.
- [ ] Player page: same colorway filter.
- [ ] Loading skeletons; empty states; error boundary + toasts.

---

## 17. Frontend — data fetching

- [ ] Typed client (fetch or TanStack Query); optional **Zod** on JSON.

---

## 18. Auth

- [ ] **v1:** public read-only, no auth.
- [ ] Later: NextAuth / Clerk + JWT to Go (separate epic).

---

## 19. DevOps — local DX

- [ ] `docker-compose.yml`: Postgres (and optional Adminer/pgweb).
- [ ] **Makefile:** `db-up`, `migrate-up`, `seed`, `run-api`, `run-frontend`, `ingest-games` (wrappers).
- [ ] README “clone → running” (short; details stay here).

---

## 20. Deployment

- [ ] **Supabase** (or managed Postgres): run migrations; upload large seeds via `COPY` / split files.
- [ ] **API:** Railway or Render; Dockerfile or native build; health check; secrets in platform store.
- [ ] **Vercel:** env + preview PRs; **CORS** production-only origins.

---

## 21. Observability

- [ ] Structured logs; slow-query threshold.
- [ ] Optional Sentry (Go + Next).
- [ ] Uptime on `/health`.

---

## 22. Performance and cost

- [ ] Pool sizing vs Supabase limits.
- [ ] Optional materialized views for heavy aggregates (nightly refresh).

---

## 23. Legal and attribution

- [ ] Terms for NBA.com-derived data + LockerVision-sourced facts; “not affiliated with NBA” disclaimer.
- [ ] Footer attribution.

---

## 24. Launch checklist

- [ ] Smoke flows in prod; Lighthouse basics; OG tags; `robots.txt` / sitemap if SEO.

---

## 25. Post-v1 backlog

- [ ] Playoffs, prior seasons, shot charts, lineups, accounts, admin UI for assignments.

---

## Appendix — probe scripts (NBA.com)

| Script | Purpose |
|--------|---------|
| `scripts/nba/nba_gamelog.py` | Smoke test: one player’s game log via `nba_api`. |
| `scripts/nba/fetch_regular_season_games.py` | Export 1,230 `002*` games to `data/games_regular_*.csv`. |

Python deps: `scripts/nba/requirements.txt`. Prefer venv at `scripts/nba/.venv/`.
