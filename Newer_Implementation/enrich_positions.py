#!/usr/bin/env python3
"""
enrich_positions.py - one-time(ish) fetch of player positions for the 82-0 game.

The game needs each player's court position (Guard/Forward/Center), which the box
scores don't contain. This reads the player ids already in the warehouse, fetches
each player's position from nba_api, and caches the result to positions.json so the
warehouse build stays fast and offline. Re-run only when the roster changes.

    python enrich_positions.py
"""

import os
import json
import time

import duckdb
from nba_api.stats.endpoints import commonplayerinfo

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "player_vault.duckdb")
OUT = os.path.join(HERE, "positions.json")
LEAGUE_ID = {"NBA": "00", "WNBA": "10"}

con = duckdb.connect(DB_PATH, read_only=True)
roster = con.execute("SELECT player, player_id, league FROM players WHERE player_id IS NOT NULL").fetchall()
con.close()

positions = {}
if os.path.exists(OUT):
    with open(OUT) as f:
        positions = json.load(f)

for i, (player, pid, league) in enumerate(roster, 1):
    key = str(pid)
    if key in positions:
        continue
    try:
        time.sleep(2.0)  # polite, well under any rate limit
        info = commonplayerinfo.CommonPlayerInfo(
            player_id=pid, league_id_nullable=LEAGUE_ID.get(league, "00"), timeout=30
        ).get_data_frames()[0]
        pos = str(info["POSITION"][0]).strip() or "Guard"
        positions[key] = pos
        print(f"[{i}/{len(roster)}] {player}: {pos}", flush=True)
        with open(OUT, "w") as f:   # checkpoint after each so it's resumable
            json.dump(positions, f, indent=2)
    except Exception as e:
        print(f"[{i}/{len(roster)}] {player}: ERROR {type(e).__name__} - leaving unset", flush=True)

print(f"[done] {len(positions)} positions -> {OUT}")
