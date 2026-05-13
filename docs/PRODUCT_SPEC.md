# JerseyStats — product spec (v1)

**JerseyStats** is a web app for NBA team and player stats filtered by **jersey colorway** (City, Icon, Statement, etc.), so fans can see performance tied to what the team wore—sourced via `jersey_assignments` (LockerVision), not inferred from video.

**Primary users:** NBA fans who notice uniform patterns and want numbers behind claims like “we always lose in the City Edition.” Secondary: uniform culture people (LockerVision, colorways) who still care about on-court results.

**Core flows**

1. **Team view** — Land on a team; see each colorway worn this season with a **game record** (W–L or games count). Pick a colorway (or several for compare) to see **aggregated team stats** for games in that jersey: team PPG, opponent PPG, W/L, pace, offensive/defensive rating (team-level), with sensible defaults (e.g. sort teams by winning % where listing applies).
2. **Player view** — Land on a player; same **colorway filter** pattern. Stats **broken down by jersey worn by their team that game**: PPG, RPG, APG, FG%, 3P%, FT%, FGA, FTA, 3PA, BLK, STL, PF, TO, ORB, DRB (and games played per bucket).
3. **Colorway filter** — Shared filter bar on team and player views: **one or multiple colorways** to compare; query path stays **jersey_assignments → games → player_game_stats** (and team rollups), with filters applied on assignments/games only.
4. **Search** — Homepage search: type team or player name → navigate to the right page.

**Non-goals (v1)**

- No live/in-season refresh cadence; treat the season as **finalized** for v1.
- No **playoffs** data.
- No user accounts, saved filters, or personalization.
- **No mobile-first UI** — **desktop first**; mobile may work but is not the v1 design target.
- No automated jersey detection; **manual** assignments only (~2,460 team-game rows).
- No **multi-season** compare.
- No social, embeds, or share cards as a product requirement.
- No player-vs-player comparison view.
- No WNBA/NCAA/international.

---

## V1 scope

| Area | Decision |
|------|----------|
| **Season** | **2024–25 NBA regular season only** (1,230 games). *Note: an internal draft PDF mentioned 2025–26; v1 implementation targets 2024–25 unless you explicitly change season metadata.* |
| **Stats shown — team (per colorway selection)** | Wins/losses (or W%), games played, **pace**, **team offensive rating / team defensive rating** (or net), **team PPG**, **opponent PPG**. |
| **Stats shown — player (per colorway)** | **Per-game averages:** PTS, REB, AST, **FG%, 3P%, FT%**; volume: **FGA, FTA, 3PA**; **BLK, STL, PF, TO**; **ORB, DRB**. Include **games played** (and optionally **totals** for PTS/REB/AST where the UI benefits). |
| **Shooting splits** | **In v1** as **FG%, 3P%, FT%** (and attempts/makes if you want transparency in a secondary column or tooltip). |
| **Advanced (e.g. player ORtg, on-off, lineup ORtg)** | **Out of v1.** Team **pace + team ORtg/DRtg-style** metrics stay in scope **if** the pipeline can support them from game/box data; do not block launch on player-level advanced metrics. |
| **Desktop vs mobile** | **Desktop priority**; responsive polish is backlog unless critical breakage. |

---

## Jersey editions and naming

**Supported edition types (conceptual):** **City**, **Icon**, **Statement**, **Association**, **Classic** (plus any team-specific variants you store as rows under the same edition enum if needed later).

| Layer | Rule |
|-------|------|
| **DB / API stable id** | `"{team_slug}_{editionKey}"` in **lower camelCase for edition**, e.g. `knicks_cityEdition`, `lakers_iconEdition`. `team_slug` is ASCII, stable across renames (e.g. `ny`, `lal`—pick one convention and document it in `teams`). |
| **UI** | NBA-style labels: **“City Edition,” “Icon Edition,” …** with team context on the page (e.g. “Knicks — City Edition”). |

---

## Minimum viable filters (v1)

| Filter | v1 |
|--------|-----|
| **Colorway** | Yes (single + multi-select compare). |
| **Team** | Yes (team page + team context in assignments). |
| **Player** | Yes (player page + search). |
| **Date range** | **Yes** — narrow games within the regular season (optional but listed as MVP). |

---

## Performance aggregates (v1 summary)

- **Totals:** games played, W/L counts; optional **season totals** for counting stats where useful.
- **Per-game averages:** primary presentation for player (and team where not already implied by “per game” ratings).
- **Shooting splits:** **%** in v1; makes/attempts as supporting columns or detail as needed.
- **Advanced:** **no** player ORtg / on-off / lineup-level advanced in v1; **team** pace and **team** off/def (or net) ratings **in** if data supports them.

All player–colorway stats are **derived** from **jersey_assignments → games → player_game_stats** (never hand-entered per player per jersey).
