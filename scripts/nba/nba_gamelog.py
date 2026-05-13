#!/usr/bin/env python3
"""One-off fetch: regular-season game logs from NBA.com via nba_api.

Batch-only probe (docs/ROADMAP.md §2, Appendix). The Go API should read Postgres,
not NBA.com, per request.

Examples:
  python scripts/nba/nba_gamelog.py
  python scripts/nba/nba_gamelog.py --player "Jalen Brunson" --season 2024-25

Client: https://github.com/swar/nba_api — respect https://www.nba.com/ terms of use.
"""
from __future__ import annotations

import argparse
import sys
from typing import Any

from nba_api.stats.endpoints import playergamelog
from nba_api.stats.static import players as static_players


def find_player_id(full_name: str) -> int:
    hits = static_players.find_players_by_full_name(full_name)
    if not hits:
        raise SystemExit(f"No player found for {full_name!r}")
    for h in hits:
        if h.get("full_name", "").lower() == full_name.strip().lower():
            return int(h["id"])
    return int(hits[0]["id"])


def gamelog_rows(player_id: int, season: str) -> tuple[list[str], list[list[Any]]]:
    gl = playergamelog.PlayerGameLog(
        player_id=str(player_id),
        season=season,
        season_type_all_star="Regular Season",
    )
    d = gl.get_dict()
    rs = d["resultSets"][0]
    return rs["headers"], rs["rowSet"]


def main() -> None:
    ap = argparse.ArgumentParser(description="NBA.com game log via nba_api")
    ap.add_argument("--player", default="Jalen Brunson", help="Full player name")
    ap.add_argument(
        "--season",
        default="2025-26",
        help='Season string e.g. "2025-26" (NBA.com format)',
    )
    args = ap.parse_args()

    pid = find_player_id(args.player)
    headers, rows = gamelog_rows(pid, args.season)

    idx = {h: i for i, h in enumerate(headers)}
    need = ["GAME_DATE", "MATCHUP", "MIN", "PTS", "REB", "AST", "FGM", "FGA", "FG3M", "FG3A", "FTM", "FTA", "TOV", "PF"]
    for n in need:
        if n not in idx:
            print(f"warning: missing column {n}", file=sys.stderr)

    print(f"Player ID: {pid}  Season: {args.season}  Games: {len(rows)}\n")
    print(f"{'DATE':<14} {'MATCHUP':<14} {'MIN':>4} {'PTS':>4} {'REB':>4} {'AST':>4} {'FG':>6} {'3P':>6} {'FT':>6} {'TO':>3} {'PF':>3}")

    pts_i, reb_i, ast_i = idx.get("PTS"), idx.get("REB"), idx.get("AST")
    tot_pts = tot_reb = tot_ast = 0
    for r in rows:
        gd = r[idx["GAME_DATE"]]
        mu = r[idx["MATCHUP"]]
        mn = r[idx["MIN"]]
        pts = int(r[pts_i]) if pts_i is not None else 0
        reb = int(r[reb_i]) if reb_i is not None else 0
        ast = int(r[ast_i]) if ast_i is not None else 0
        if pts_i is not None:
            tot_pts += pts
        if reb_i is not None:
            tot_reb += reb
        if ast_i is not None:
            tot_ast += ast

        fgm, fga = int(r[idx["FGM"]]), int(r[idx["FGA"]])
        g3m, g3a = int(r[idx["FG3M"]]), int(r[idx["FG3A"]])
        ftm, fta = int(r[idx["FTM"]]), int(r[idx["FTA"]])
        tov = int(r[idx["TOV"]])
        pf = int(r[idx["PF"]])
        print(
            f"{gd:<14} {str(mu):<14} {mn:>4} {pts:>4} {reb:>4} {ast:>4} "
            f"{fgm}-{fga:>2} {g3m}-{g3a:>2} {ftm}-{fta:>2} {tov:>3} {pf:>3}"
        )

    n = len(rows)
    if n:
        print()
        print(f"Per game — PTS {tot_pts / n:.1f}  REB {tot_reb / n:.1f}  AST {tot_ast / n:.1f}")


if __name__ == "__main__":
    main()
