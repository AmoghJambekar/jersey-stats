# PRD: JerseyStats

**Author:** Amogh Jambekar
**Date:** 2026-05-14
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Stories](#user-stories)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Considerations](#technical-considerations)
8. [Out of Scope](#out-of-scope)
9. [Open Questions & Risks](#open-questions--risks)
10. [Validation Checkpoints](#validation-checkpoints)

---

## Executive Summary

NBA fans often develop intuitions about their team's performance in specific jersey colorways — "we always win in the City Edition" — but there's no tool to verify or explore this. JerseyStats is a read-only NBA stats viewer for the 2025-26 season that lets fans browse team and player performance broken down by the jersey worn in each game (Icon, Association, Statement, City, Classic editions), each tagged with its dominant color. Built with Go + React + Docker, it's a learning project designed to surface the data behind the superstition.

---

## Problem Statement

### Current Situation
No public tool exists that correlates NBA game/player statistics with the specific jersey uniform worn during that game. The NBA tracks jersey editions internally but doesn't expose colorway-performance data through any public interface. Fans who believe jersey colorway affects performance have no way to validate or explore this hypothesis.

### User Impact
- **Who is affected:** NBA fans across all fandom levels — casual viewers, die-hards, hobbyist analysts
- **How they're affected:** Gut feelings about jersey performance ("we're 0-4 in the City Edition this year") are unverifiable and unshareable
- **Severity:** Low friction problem, but high engagement opportunity — sports superstition is deeply culturally embedded

### Business Impact
This is a non-monetized passion project. Success is measured by:
- Data accuracy and completeness for the 2025-26 season
- Technically clean, learning-forward implementation
- The ability to say: "here's the actual data behind the superstition"

### Why Now?
The 2025-26 NBA season provides a concrete, scoped dataset. Jersey assignments for prior seasons are largely undocumented online, making manual curation feasible only for the current season. Now is the ideal window to build and curate simultaneously.

---

## Goals & Success Metrics

### Goal 1: Prove the concept with real data
- **Description:** Show jersey colorway vs. performance data for all 30 teams across the 2025-26 season
- **Metric:** % of 2025-26 regular season games with a verified jersey assignment
- **Target:** 100% of completed games labeled before season end
- **Measurement:** Manual count of curated game records in the database

### Goal 2: Player-level drill-down
- **Description:** Users can look up any NBA player and see their stats split by jersey worn
- **Metric:** Player stat pages load correctly for any rostered player
- **Target:** All active 2025-26 players supported
- **Measurement:** Spot-check 10 players across teams, validate stat accuracy against NBA Stats API

### Goal 3: Learn Go + Docker through building
- **Description:** Backend written in idiomatic Go, containerized with Docker, deployed to Railway
- **Metric:** Working Go HTTP API, Dockerfile, docker-compose.yml for local dev
- **Target:** Full dev environment boots with `docker-compose up`, deploys cleanly to Railway
- **Measurement:** Functional local and production deployment

---

## User Stories

### Story 1: Browse a Team's Jersey Performance

**As a** Knicks fan,
**I want to** select the Knicks and see their win/loss record and key stats broken down by jersey edition,
**So that I can** see whether they actually perform better in Statement Edition games.

**Acceptance Criteria:**
- [ ] Team selector lists all 30 NBA teams
- [ ] Each team page shows a summary table: Jersey Edition | W | L | PPG | OPP PPG | Net Rating
- [ ] Each jersey edition row is labeled with both edition name (e.g. "Statement") and dominant color tag (e.g. "blue")
- [ ] Clicking a jersey edition row shows the list of games played in that uniform
- [ ] Each game in the list shows date, opponent, score, and win/loss

**Dependencies:** REQ-001 (data model), REQ-002 (NBA stats ingestion)

---

### Story 2: Browse a Player's Stats by Jersey

**As a** fan curious about Jalen Brunson,
**I want to** search for a player and see their per-game stats split by which jersey they wore,
**So that I can** see if their individual numbers change depending on the uniform.

**Acceptance Criteria:**
- [ ] Search bar on homepage supports player name lookup
- [ ] Player page shows: Jersey Edition | GP | PPG | RPG | APG | FG% | +/-
- [ ] Stats are pulled from NBA Stats API and joined with jersey assignment data
- [ ] Player page shows team context (which team they played for)
- [ ] If a player played for multiple teams in 2025-26, stats are grouped by team + jersey edition

**Dependencies:** REQ-001, REQ-002, REQ-003 (player-game join)

---

### Story 3: Jersey Colorway Admin Curation

**As a** curator (the developer),
**I want to** manually assign which jersey edition each team wore in each game,
**So that** the site reflects accurate real-world jersey choices.

**Acceptance Criteria:**
- [ ] A CLI tool or web endpoint allows entering: game_id, team_id, jersey_edition
- [ ] Assignments are stored in the database and referenced when serving stats
- [ ] The system flags games without a jersey assignment (so curators know what's missing)
- [ ] Bulk CSV import is supported for batch entry

**Dependencies:** REQ-001

---

### Story 4: Homepage / League Overview

**As a** new visitor,
**I want to** land on a page that gives me an overview of jersey performance trends across the league,
**So that I can** quickly find interesting angles without knowing what to search for.

**Acceptance Criteria:**
- [ ] Homepage shows top-performing jersey edition per team (by win %)
- [ ] A league-wide "which colorway has the best record" leaderboard
- [ ] Direct navigation links to all 30 team pages
- [ ] A "how does this work?" explanation of what jersey assignments mean and how data is sourced

**Dependencies:** REQ-001, REQ-002 (requires meaningful curated game data)

---

## Functional Requirements

### Must Have (P0)

#### REQ-001: Jersey-Game Assignment Data Model

**Description:** The system must store a mapping of which jersey edition a given team wore in each game, with both edition label and color metadata.

**Schema:**
```sql
CREATE TABLE teams (
  id    TEXT PRIMARY KEY,  -- e.g. "NYK"
  name  TEXT NOT NULL,     -- e.g. "New York Knicks"
  city  TEXT NOT NULL
);

CREATE TABLE jersey_editions (
  id            SERIAL PRIMARY KEY,
  team_id       TEXT REFERENCES teams(id),
  edition_name  TEXT NOT NULL,   -- "Icon", "Association", "Statement", "City", "Classic"
  color_tags    TEXT[] NOT NULL, -- ["blue", "orange"]
  description   TEXT,            -- e.g. "2025-26 Statement Edition - dark blue"
  season        TEXT NOT NULL DEFAULT '2025-26'
);

CREATE TABLE games (
  game_id    TEXT PRIMARY KEY,  -- NBA Stats API game_id
  game_date  DATE NOT NULL,
  home_team  TEXT REFERENCES teams(id),
  away_team  TEXT REFERENCES teams(id),
  season     TEXT NOT NULL DEFAULT '2025-26'
);

CREATE TABLE game_jersey_assignments (
  id          SERIAL PRIMARY KEY,
  game_id     TEXT REFERENCES games(game_id),
  team_id     TEXT REFERENCES teams(id),
  jersey_id   INT REFERENCES jersey_editions(id),
  verified    BOOLEAN DEFAULT false,
  notes       TEXT,
  UNIQUE(game_id, team_id)
);
```

**Acceptance Criteria:**
- [ ] All 30 teams are seeded at startup
- [ ] Each team has at least Icon, Association, and Statement editions seeded
- [ ] A game_jersey_assignment can be created, updated, and deleted via CLI or API
- [ ] Querying games without assignments returns the correct missing set

**Task Breakdown:**
- Write and apply migrations: Small (3h)
- Seed 30 team records: Small (1h)
- Seed jersey edition records for all 30 teams: Medium (4h)

**Dependencies:** None

---

#### REQ-002: NBA Stats API Ingestion

**Description:** The system must fetch and store game-level and player-level stats from the NBA Stats API for the 2025-26 season.

**Key Endpoints Used:**
- `scoreboardv2` — daily game scores and game IDs
- `leaguegamefinder` — game log per team for a season
- `playergamelog` — per-player game-by-game stats

**Acceptance Criteria:**
- [ ] Go service can fetch all completed 2025-26 regular season games
- [ ] Player game logs are fetched and stored per game_id
- [ ] Stats are stored locally in PostgreSQL to avoid hammering NBA API on every request
- [ ] Data refresh can be triggered manually (CLI command) or on a cron schedule
- [ ] Client handles rate limiting at ≤1 req/sec with exponential backoff on 429s

**Technical Note:**
```go
// NBAClient interface
type NBAClient interface {
    GetTeamGameLog(teamID, season string) ([]GameLogEntry, error)
    GetPlayerGameLog(playerID, season string) ([]PlayerGameLogEntry, error)
    GetDailyScoreboard(date string) ([]Game, error)
}
```

The NBA Stats API requires browser-like headers (`User-Agent`, `Referer`) to avoid 403 errors. The existing Go prototype in `scripts/` provides a working reference.

**Task Breakdown:**
- Go NBA Stats API client (rate-limited, with retries): Large (12h)
- Database models and repository layer (sqlc + pgx): Medium (8h)
- Ingestion CLI command (`go run cmd/ingest`): Medium (6h)
- Cron or manual refresh trigger: Small (3h)

**Dependencies:** REQ-001

---

#### REQ-003: Jersey-Filtered Stats Aggregation

**Description:** The API must join game stats with jersey assignments to produce per-jersey aggregates for both teams and players.

**Acceptance Criteria:**
- [ ] `GET /api/teams/:teamId/jersey-stats` returns stats grouped by jersey edition
- [ ] `GET /api/players/:playerId/jersey-stats` returns player stats grouped by jersey edition
- [ ] Aggregations include: GP, W, L, Win%, PPG, OPP PPG, Net Rating, FG%, 3P%, REB, AST
- [ ] Games without a jersey assignment are excluded from aggregations (not counted as a separate category)
- [ ] Response includes both `edition_name` and `color_tags` fields per row

**Task Breakdown:**
- SQL aggregation queries for team jersey stats: Medium (6h)
- SQL aggregation queries for player jersey stats: Medium (6h)
- Go handlers for both endpoints: Medium (5h)

**Dependencies:** REQ-001, REQ-002

---

#### REQ-004: React Frontend — Core Pages

**Description:** A React + TypeScript app with routing to: Homepage, Team Page, Player Page, with player search.

**Tech:** React 19 + TypeScript + React Router + TanStack Query + Tailwind CSS (via Vite)

**Pages:**
- `/` — Homepage: league jersey leaderboard + team grid
- `/teams/:teamId` — Team jersey breakdown table + game list
- `/players/:playerId` — Player jersey stat breakdown
- Search accessible from homepage navbar

**Acceptance Criteria:**
- [ ] All three pages render correctly with real API data
- [ ] Player search returns results within 500ms
- [ ] Jersey edition rows display a color swatch matching `color_tags`
- [ ] Clicking a jersey edition on the team page shows the filtered game list
- [ ] All pages are responsive (mobile + desktop)
- [ ] Loading and empty states are handled gracefully (no blank screens)

**Task Breakdown:**
- Project setup: Vite + React + TypeScript + React Router + TanStack Query: Small (3h)
- Homepage component + team grid: Medium (8h)
- Team Page component: Medium (6h)
- Player Page component: Medium (6h)
- Player search UI: Small (4h)
- Shared components (jersey badge, stat table, team logo): Medium (5h)
- Tailwind styling pass: Small (4h)

**Dependencies:** REQ-003 (API must exist)

---

### Should Have (P1)

#### REQ-005: Jersey Assignment Admin Tooling

**Description:** A lightweight CLI or API endpoint for entering/updating jersey assignments without touching the database directly.

**Options (in priority order):**
1. CLI: `jerseyctl assign --game <game_id> --team NYK --edition Statement`
2. CSV bulk import: `POST /admin/import`
3. Password-protected web admin UI (v1.5)

**Acceptance Criteria:**
- [ ] CLI tool accepts game_id, team abbreviation, and edition name
- [ ] Invalid edition names are rejected with a clear error message
- [ ] CSV import processes a file with columns: game_id, team_abbr, edition_name
- [ ] Import returns a summary: N assigned, M skipped (already assigned), K errors

**Task Breakdown:**
- `jerseyctl` CLI in Go: Small (4h)
- CSV import endpoint: Small (4h)

**Dependencies:** REQ-001

---

#### REQ-006: Missing Assignment Dashboard

**Description:** An endpoint or CLI output showing all games that are missing a jersey assignment for one or both teams, sorted by date.

**Acceptance Criteria:**
- [ ] `GET /admin/missing-assignments` returns games missing ≥1 jersey assignment
- [ ] Response includes: game_id, date, home_team, away_team, missing_for (array of team IDs)
- [ ] Can filter by team: `?teamId=NYK`

**Task Breakdown:**
- Query and Go handler: Small (3h)

**Dependencies:** REQ-001, REQ-002

---

### Nice to Have (P2)

#### REQ-007: Shareable Deep Links
URL params like `/teams/NYK?jersey=Statement` that pre-filter the jersey edition view. Zero backend work — React Router query params only.

#### REQ-008: Jersey Color Swatches
Display edition color tags as visual color chips (a filled circle in the dominant color) alongside edition name labels. Frontend only.

#### REQ-009: Stat Cards
Static "stat card" summary per jersey edition — e.g. "Knicks are 12-3 in Statement Edition jerseys (80% win rate)." Displayed on the team page as a highlight callout.

---

## Non-Functional Requirements

### Performance
- API p95 response time: < 300ms (data is pre-aggregated in Postgres, not computed on-request)
- Frontend first meaningful paint: < 3s on a standard broadband connection
- NBA Stats API calls rate-limited to ≤1 req/sec to avoid throttling

### Data Accuracy
- Jersey assignments must be manually verified; automated home/away inference is a fallback only
- Stats from NBA Stats API are authoritative; never modify or impute them
- Site must clearly surface data provenance: "Stats via NBA Stats API · Jersey assignments manually curated"

### Reliability
- Stateless Go API — trivial to restart/redeploy, no in-memory state
- PostgreSQL as single source of truth
- NBA Stats data cached locally in Postgres; the frontend never depends on live NBA API calls

### Security
- No user accounts or auth in v1 (fully public, read-only)
- Admin endpoints (jersey assignment CRUD) protected by an API key or HTTP basic auth header
- No PII collected or stored

### Compatibility
- Desktop-first, mobile-responsive
- Modern browsers: last 2 versions of Chrome, Firefox, Safari, Edge

---

## Technical Considerations

### Architecture

```
┌─────────────────────┐         ┌────────────────────────┐
│   React Frontend    │         │      Go HTTP API        │
│   (Vercel)          │────────▶│      (Railway)          │
│   Vite + TypeScript │         │      chi router         │
└─────────────────────┘         └────────────┬───────────┘
                                              │
                               ┌──────────────▼──────────────┐
                               │         PostgreSQL           │
                               │         (Railway)            │
                               │  - teams                     │
                               │  - jersey_editions           │
                               │  - games                     │
                               │  - game_jersey_assignments   │
                               │  - player_game_logs          │
                               └──────────────┬──────────────┘
                                              ▲
                               ┌──────────────┴──────────────┐
                               │   NBA Stats API Ingestor    │
                               │   (Go CLI, run on-demand)   │
                               │   stats.nba.com             │
                               └─────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Backend | Go 1.23 | Primary learning goal; performant, low-overhead HTTP services |
| HTTP Router | `chi` | Lightweight, idiomatic Go routing |
| Database | PostgreSQL | Relational joins are core to the stats aggregation logic |
| DB Access | `pgx` + `sqlc` | Type-safe SQL in Go; best fit for the learning goal |
| Frontend | React 19 + TypeScript | Modern React, rich component ecosystem for data tables |
| Data Fetching | TanStack Query | Server-state caching and loading state management |
| Styling | Tailwind CSS | Utility-first; well-suited to sports data UIs |
| Containerization | Docker + docker-compose | Primary learning goal; reproducible dev environment |
| Frontend Deploy | Vercel | Free tier, instant deploys from git |
| Backend Deploy | Railway | Docker-native, PostgreSQL add-on built-in |

### Docker Local Dev

```yaml
# docker-compose.yml
services:
  api:
    build: ./backend
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/jerseystats
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: jerseystats
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Go Project Structure

```
backend/
  cmd/
    api/        # HTTP server entrypoint
    ingest/     # NBA stats ingestion CLI
    jerseyctl/  # Jersey assignment admin CLI
  internal/
    db/         # sqlc-generated code
    nba/        # NBA Stats API client
    handler/    # HTTP handlers
    model/      # Domain types
  migrations/   # SQL migration files
  Dockerfile
```

### Jersey Assignment Curation

The NBA does not publish a public jersey schedule. Curation approach:
- **Primary:** Manual verification by the developer (watching/reviewing each game)
- **Inference rules (starting point):**
  - Home team → Icon or Statement
  - Away team → Association (white) or Icon
  - City / Classic editions announced via team press releases / social media
- **Tooling:** CSV import (`jerseyctl`) for batch entry
- **Quality flag:** Each assignment has a `verified: bool` column; unverified assignments are visually marked on the site

---

## Out of Scope

1. **Historical seasons (pre-2025-26):** Jersey assignment data doesn't exist in a curated form for prior seasons. Strictly limited to 2025-26.
2. **User accounts / authentication:** Read-only public site. No sign-in.
3. **Live / real-time scores:** Stats are pulled on-demand or nightly, not live.
4. **Betting integrations:** Purely informational — no odds, no sportsbook features.
5. **Jersey images / video:** Would require NBA licensing. Color tags and edition names only.
6. **Native mobile app:** Web only.
7. **Playoffs (v1):** Regular season first. Playoffs can be layered in after launch.
8. **Social features (v1):** No sharing, no saved views, no accounts.

---

## Open Questions & Risks

### Open Questions

**Q1: How to handle mid-season jersey assignment uncertainty?**
Teams occasionally wear unexpected jerseys (MLK Day games, special events). Proposed: mark those assignments as `verified: false` in the DB and surface a small "unverified" badge in the UI. Unverified assignments are excluded from win/loss aggregations by default.

**Q2: sqlc vs GORM vs raw pgx?**
- `sqlc` generates type-safe code from `.sql` files — best alignment with the learning goal
- `GORM` is faster to prototype but less idiomatic Go
- **Recommendation:** sqlc. Fallback to raw pgx if sqlc friction is too high in practice.

**Q3: How to handle players traded mid-season?**
A player may appear on two teams in 2025-26. Proposed: group jersey stats by `(player_id, team_id)` and display separately per team stint on the player page.

---

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| NBA Stats API changes or goes down | Medium | High | Cache all data locally in Postgres; site serves from DB, not live API |
| Manual jersey curation for 30 teams is too slow | High | Medium | Start with Knicks + 4-5 headline teams; expand incrementally; CSV tooling minimizes entry friction |
| NBA API rate limiting during bulk ingestion | Medium | Medium | Rate-limit Go client to ≤1 req/sec; exponential backoff on 429s |
| sqlc learning curve slows backend development | Medium | Low | Fallback to raw pgx queries if needed; both are supported by the same pgx driver |
| Stats accuracy errors (wrong player mapped to wrong game) | Low | High | Validate a sample of player stats against NBA.com manually before launch |

---

## Validation Checkpoints

### Checkpoint 1: Local dev baseline
- [ ] `docker-compose up` starts API + DB cleanly
- [ ] NBA Stats API client fetches Knicks 2025-26 games successfully
- [ ] All migrations applied, all seed data present

### Checkpoint 2: Jersey assignment pipeline
- [ ] Full Knicks 2025-26 season curated (all games assigned)
- [ ] `GET /api/teams/NYK/jersey-stats` returns non-empty, accurate data
- [ ] Missing assignments endpoint shows 0 for Knicks

### Checkpoint 3: API correctness
- [ ] Player stats via API match expected values from NBA.com for 3 spot-checked players
- [ ] All 4 core API endpoints return correct, well-structured data

### Checkpoint 4: Frontend usability
- [ ] Team browsing flow works end-to-end in the browser
- [ ] Player search and player stats page works
- [ ] No console errors, no broken routes

### Checkpoint 5: Production deployment
- [ ] Site is live on Railway (API) + Vercel (frontend)
- [ ] Production DB has full ingested season data
- [ ] Smoke test: find Jalen Brunson → see his stats by jersey edition
