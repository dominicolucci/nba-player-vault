#!/usr/bin/env python3
"""
warehouse.py - build the NBA Player Vault data warehouse from the league CSVs.

Reads every per-player CSV in nba_csv_exports/ and wnba_csv_exports/, normalizes
the columns to SQL-friendly names, derives season + player metadata, and loads it
all into a single DuckDB file (player_vault.duckdb) with three objects:

    games             one row per player-game (the fact table)
    players           one row per player (id, headshot, season range, games)
    season_averages   a view: per-player, per-season averages (for the by-season UI)

This replaces "load a whole CSV in pandas every time" with real SQL queries, which
the FastAPI layer will sit on top of.

    Build / rebuild:   python warehouse.py
    Custom db path:    python warehouse.py --db path/to/file.duckdb
"""

import os
import argparse
import unicodedata

import duckdb
import pandas as pd

from nba_api.stats.static import players as nba_players
from nba_api.stats.endpoints import commonallplayers

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB = os.path.join(HERE, "player_vault.duckdb")

# Each league: its CSV folder, the season format, and the headshot CDN base.
LEAGUES = {
    "NBA":  {"folder": "nba_csv_exports",
             "single_year": False,
             "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/{id}.png"},
    "WNBA": {"folder": "wnba_csv_exports",
             "single_year": True,
             "headshot": "https://cdn.wnba.com/headshots/wnba/latest/1040x760/{id}.png"},
}

# CSV header -> SQL-friendly column name (the rest are already clean).
COLUMN_RENAME = {
    "MIN": "min", "PTS": "pts", "REB": "reb", "AST": "ast", "STL": "stl",
    "BLK": "blk", "TOV": "tov", "FG": "fg", "FGA": "fga", "FG%": "fg_pct",
    "3P": "fg3", "3PA": "fg3a", "3P%": "fg3_pct", "FT": "ft", "FTA": "fta",
    "FT%": "ft_pct", "GmSc": "gmsc", "+/-": "plus_minus",
}


def _norm(s):
    """Normalize a name for matching: fold accents (Jokić -> jokic), treat hyphens as
    spaces (Gilgeous-Alexander -> gilgeous alexander), drop other punctuation, lowercase."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().replace("-", " ")
    return " ".join("".join(c for c in s.lower() if c.isalnum() or c.isspace()).split())


def season_of(date, single_year):
    """Map a game date to its season string. NBA spans two years, WNBA is one."""
    if single_year:
        return str(date.year)
    start = date.year if date.month >= 10 else date.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def _cap_index(league_id):
    """{normalized name -> id} from commonallplayers (covers players missing from static)."""
    try:
        df = commonallplayers.CommonAllPlayers(
            league_id=league_id, is_only_current_season=0, timeout=30
        ).get_data_frames()[0]
        return {_norm(r["DISPLAY_FIRST_LAST"]): int(r["PERSON_ID"]) for _, r in df.iterrows()}
    except Exception as e:
        print(f"  [!] {league_id} id lookup failed ({type(e).__name__}); some ids left null")
        return {}

def resolve_ids(names, league):
    """Map {display name -> player id}. NBA uses the offline static list, then a live API
    fallback for any names not found there; WNBA uses the API directly."""
    ids = {}
    if league == "NBA":
        index = {_norm(p["full_name"]): p["id"] for p in nba_players.get_players()}
        for n in names:
            ids[n] = index.get(_norm(n))
        missing = [n for n in names if ids[n] is None]
        if missing:
            cap = _cap_index("00")            # new players not in the static list
            for n in missing:
                ids[n] = cap.get(_norm(n))
        return ids
    cap = _cap_index("10")                     # WNBA
    for n in names:
        ids[n] = cap.get(_norm(n))
    return ids


def load_league(league):
    """Read every CSV for a league into one tidy DataFrame, enriched with
    player / league / season / player_id / headshot_url columns."""
    cfg = LEAGUES[league]
    folder = os.path.join(HERE, cfg["folder"])
    if not os.path.isdir(folder):
        return pd.DataFrame()

    files = sorted(f for f in os.listdir(folder) if f.endswith(".csv"))
    names = [f[:-4].replace("_", " ").title() for f in files]
    id_map = resolve_ids(names, league)

    frames = []
    for fn, name in zip(files, names):
        df = pd.read_csv(os.path.join(folder, fn))
        if df.empty:
            continue
        df = df.rename(columns=COLUMN_RENAME)
        df["date"] = pd.to_datetime(df["date"]).dt.date
        df["home"] = df["home"].astype(str).str.lower().eq("true")
        df["b2b"] = df["b2b"].astype(str).str.lower().eq("true")
        df.insert(0, "player", name)
        df.insert(1, "league", league)
        df.insert(2, "player_id", id_map.get(name))
        df["season"] = [season_of(d, cfg["single_year"]) for d in df["date"]]
        pid = id_map.get(name)
        df["headshot_url"] = cfg["headshot"].format(id=pid) if pid else None
        frames.append(df)

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def build(db_path=DEFAULT_DB):
    all_games = pd.concat(
        [load_league(lg) for lg in LEAGUES], ignore_index=True
    )
    if all_games.empty:
        raise SystemExit("No CSVs found - nothing to load.")

    # Stable, readable column order for the games table.
    front = ["player", "player_id", "league", "season", "date", "opponent",
             "home", "b2b", "result", "min"]
    stats = ["pts", "reb", "ast", "stl", "blk", "tov", "fg", "fga", "fg_pct",
             "fg3", "fg3a", "fg3_pct", "ft", "fta", "ft_pct", "gmsc", "plus_minus"]
    all_games = all_games[front + stats + ["headshot_url"]]

    con = duckdb.connect(db_path)
    con.register("incoming", all_games)
    con.execute("DROP TABLE IF EXISTS games")
    con.execute("CREATE TABLE games AS SELECT * EXCLUDE (headshot_url) FROM incoming")

    con.execute("DROP TABLE IF EXISTS players")
    con.execute("""
        CREATE TABLE players AS
        SELECT player,
               any_value(player_id)    AS player_id,
               any_value(league)       AS league,
               any_value(headshot_url) AS headshot_url,
               min(season)             AS first_season,
               max(season)             AS last_season,
               count(*)                AS games_played
        FROM incoming
        GROUP BY player
        ORDER BY player
    """)

    con.execute("DROP VIEW IF EXISTS season_averages")
    con.execute("""
        CREATE VIEW season_averages AS
        SELECT player, league, season,
               count(*)                       AS games,
               round(avg(min), 1)             AS min,
               round(avg(pts), 1)             AS pts,
               round(avg(reb), 1)             AS reb,
               round(avg(ast), 1)             AS ast,
               round(avg(stl), 1)             AS stl,
               round(avg(blk), 1)             AS blk,
               round(avg(tov), 1)             AS tov,
               -- shooting %: total makes / total attempts (NOT avg of per-game %)
               round(sum(fg)  * 1.0 / nullif(sum(fga),  0), 3) AS fg_pct,
               round(sum(fg3) * 1.0 / nullif(sum(fg3a), 0), 3) AS fg3_pct,
               round(sum(ft)  * 1.0 / nullif(sum(fta),  0), 3) AS ft_pct,
               round(avg(gmsc), 1)            AS gmsc
        FROM games
        GROUP BY player, league, season
        ORDER BY player, season
    """)

    n_games = con.execute("SELECT count(*) FROM games").fetchone()[0]
    n_players = con.execute("SELECT count(*) FROM players").fetchone()[0]
    n_with_id = con.execute("SELECT count(*) FROM players WHERE player_id IS NOT NULL").fetchone()[0]
    con.close()

    print(f"[OK] {db_path}")
    print(f"     games={n_games}  players={n_players}  (with id/headshot={n_with_id})")
    return db_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Build the NBA Player Vault DuckDB warehouse")
    ap.add_argument("--db", default=DEFAULT_DB, help="output DuckDB path")
    args = ap.parse_args()
    build(args.db)
