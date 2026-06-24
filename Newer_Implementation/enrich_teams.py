#!/usr/bin/env python3
"""
enrich_teams.py - cache each player's CURRENT team to teams.json (player_id -> team).

The box-score endpoints don't carry team affiliation, so this pulls the current-season
roster lists (one call per league) and maps every player we track to their team. Cached
like positions.json so the app stays offline/fast. Re-run after adding players.

    python enrich_teams.py
"""

import os
import json
from datetime import datetime

import duckdb
from nba_api.stats.endpoints import commonallplayers

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "player_vault.duckdb")
OUT = os.path.join(HERE, "teams.json")

now = datetime.now()
nba_start = now.year if now.month >= 10 else now.year - 1
SEASONS = {"00": f"{nba_start}-{str(nba_start + 1)[-2:]}", "10": str(now.year)}

con = duckdb.connect(DB_PATH, read_only=True)
ours = {str(r[0]) for r in con.execute(
    "SELECT player_id FROM players WHERE player_id IS NOT NULL").fetchall()}
con.close()

teams = {}
for lid, season in SEASONS.items():
    try:
        df = commonallplayers.CommonAllPlayers(
            league_id=lid, season=season, is_only_current_season=1, timeout=30
        ).get_data_frames()[0]
    except Exception as e:
        print(f"[!] league {lid} fetch failed ({type(e).__name__}); skipped")
        continue
    for _, r in df.iterrows():
        pid = str(int(r["PERSON_ID"]))
        if pid not in ours:
            continue
        full = f"{str(r['TEAM_CITY']).strip()} {str(r['TEAM_NAME']).strip()}".strip()
        abbr = str(r["TEAM_ABBREVIATION"]).strip()
        if full and abbr:
            teams[pid] = {"team": full, "abbr": abbr}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(teams, f, indent=2)
print(f"[done] {len(teams)} player-team mappings -> {OUT}")
