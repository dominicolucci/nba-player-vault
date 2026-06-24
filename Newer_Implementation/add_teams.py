#!/usr/bin/env python3
"""
add_teams.py - end-to-end: add NBA teams' current-season rosters to the vault.

For each team nickname given, this pulls the 2025-26 roster from nba_api, dedupes
against players already on disk, rebuilds full career history for the new ones, then
rebuilds the DuckDB warehouse and enriches positions - one self-contained run that
needs no Claude/AI, just the network.

    python add_teams.py Celtics 76ers Heat
    python add_teams.py --dry Celtics          # discover + dedupe only (no changes)

Note: the warehouse-rebuild step needs the Streamlit app closed (DuckDB write-lock).
"""

import os
import sys
import subprocess
import unicodedata

from nba_api.stats.endpoints import commonallplayers

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(HERE, "nba_csv_exports")
LIST_FILE = os.path.join(HERE, "_add_players.txt")
PY = sys.executable


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().replace("-", " ")
    return " ".join("".join(c for c in s.lower() if c.isalnum() or c.isspace()).split())


def has_games(name):
    """True if this player's CSV exists with at least one game row (header + data)."""
    path = os.path.join(CSV_DIR, name.replace(" ", "_") + ".csv")
    if not os.path.exists(path):
        return False
    with open(path, encoding="utf-8") as f:
        return sum(1 for _ in f) > 1


def run(*args):
    print(">>", *args, flush=True)
    subprocess.run([PY, *args], check=False, env={**os.environ, "PYTHONIOENCODING": "utf-8"})


def main():
    argv = sys.argv[1:]
    dry = "--dry" in argv
    teams = [a for a in argv if a != "--dry"]
    if not teams:
        print("usage: python add_teams.py [--dry] Team1 Team2 ..."); sys.exit(1)

    # Existing players = every CSV already on disk (warehoused or not) -> dedupe source.
    existing = {norm(f[:-4].replace("_", " ")) for f in os.listdir(CSV_DIR) if f.endswith(".csv")}
    df = commonallplayers.CommonAllPlayers(
        league_id="00", season="2025-26", is_only_current_season=1, timeout=30
    ).get_data_frames()[0]

    new = []
    for team in teams:
        for name in df[df["TEAM_NAME"] == team]["DISPLAY_FIRST_LAST"].tolist():
            if norm(name) not in existing:
                new.append(name)
                existing.add(norm(name))
    print(f"[add_teams] {teams} -> {len(new)} new players")
    print(", ".join(new))
    if dry or not new:
        return

    with open(LIST_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(new))
    run("nba_daemon.py", "--league", "nba", "--rebuild", "--players-file", LIST_FILE)

    # One retry for anyone who failed mid-run (e.g. a transient network blip).
    missing = [n for n in new if not has_games(n)]
    if missing:
        print(f"[add_teams] retrying {len(missing)} that didn't land: {missing}")
        with open(LIST_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(missing))
        run("nba_daemon.py", "--league", "nba", "--rebuild", "--players-file", LIST_FILE)

    run("warehouse.py")        # rebuilds from ALL csvs (captures every prior batch too)
    run("enrich_positions.py")
    run("enrich_teams.py")     # map every player (incl. the new ones) to their current team
    print("[add_teams] DONE")


if __name__ == "__main__":
    main()
