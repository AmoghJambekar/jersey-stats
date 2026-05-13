#!/usr/bin/env python3
"""Fetch all regular-season schedule games from NBA.com (via nba_api).

Uses ``ScheduleLeagueV2``. NBA.com encodes league-schedule games with a
``gameId`` whose first three digits are ``002`` for the main regular-season
bucket (1230 games per full season in 2024-25 and 2025-26). That bucket can
include Emirates NBA Cup / neutral-site games that still use the ``002`` id
prefix; playoffs use ``004``, preseason ``001``, etc.

Output columns (CSV):
  game_id, game_date, home_team_id, away_team_id, season_phase

``season_phase`` is always ``regular`` for this export (non-playoff,
non-preseason bucket).

Examples:
  python scripts/nba/fetch_regular_season_games.py --season 2024-25 -o data/games_regular_2024_25.csv
  python scripts/nba/fetch_regular_season_games.py --season 2025-26 | head

See docs/ROADMAP.md §3.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from nba_api.stats.endpoints import scheduleleaguev2

SEASON_PHASE = "regular"
REGULAR_SEASON_GAME_ID_PREFIX = "002"


def iter_schedule_games(season: str):
    raw = scheduleleaguev2.ScheduleLeagueV2(league_id="00", season=season).get_dict()
    for block in raw["leagueSchedule"]["gameDates"]:
        for g in block.get("games") or []:
            yield g


def game_date_iso(game: dict) -> str:
    # Prefer UTC calendar date (YYYY-MM-DD)
    utc = game.get("gameDateUTC") or ""
    if isinstance(utc, str) and len(utc) >= 10:
        return utc[:10]
    est = game.get("gameDateEst") or ""
    if isinstance(est, str) and len(est) >= 10:
        return est[:10]
    return ""


def fetch_regular_games(season: str) -> list[dict]:
    rows: list[dict] = []
    for g in iter_schedule_games(season):
        gid = str(g.get("gameId") or "")
        if not gid.startswith(REGULAR_SEASON_GAME_ID_PREFIX):
            continue
        home = g.get("homeTeam") or {}
        away = g.get("awayTeam") or {}
        hid = home.get("teamId")
        aid = away.get("teamId")
        if hid is None or aid is None:
            continue
        rows.append(
            {
                "game_id": gid,
                "game_date": game_date_iso(g),
                "home_team_id": int(hid),
                "away_team_id": int(aid),
                "season_phase": SEASON_PHASE,
            }
        )
    rows.sort(key=lambda r: (r["game_date"], r["game_id"]))
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description="Export NBA regular-season schedule (002 games)")
    ap.add_argument("--season", default="2024-25", help='e.g. "2024-25"')
    ap.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Write CSV to this path (UTF-8). Default: stdout",
    )
    args = ap.parse_args()

    games = fetch_regular_games(args.season)
    fieldnames = ["game_id", "game_date", "home_team_id", "away_team_id", "season_phase"]

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)

    out = open(args.output, "w", newline="", encoding="utf-8") if args.output else sys.stdout
    try:
        w = csv.DictWriter(out, fieldnames=fieldnames)
        w.writeheader()
        for row in games:
            w.writerow(row)
    finally:
        if args.output:
            out.close()

    print(f"# fetched {len(games)} games (season={args.season!r}, prefix={REGULAR_SEASON_GAME_ID_PREFIX!r})", file=sys.stderr)


if __name__ == "__main__":
    main()
