#!/usr/bin/env python3
"""
data.py - shared data-access layer for NBA Player Vault.

One source of truth for every warehouse query. Both the FastAPI service (api.py)
and the Streamlit UI import from here, so query logic never gets duplicated or
drifts between them. Functions return plain Python dicts/lists.
"""

import os
import json

import duckdb

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "player_vault.duckdb")
POSITIONS_PATH = os.path.join(HERE, "positions.json")
TEAMS_PATH = os.path.join(HERE, "teams.json")

# Stats safe to aggregate / sort by (whitelist guards any SQL that interpolates a name).
AVG_STATS = ["min", "pts", "reb", "ast", "stl", "blk", "tov",
             "fg_pct", "fg3_pct", "ft_pct", "gmsc"]

# Per-game counting stats are averaged; shooting % must be re-derived from totals
# (total makes / total attempts), NOT averaged across games.
_COUNTING = ["min", "pts", "reb", "ast", "stl", "blk", "tov", "gmsc"]
PCT_SQL = {
    "fg_pct":  "sum(fg)  * 1.0 / nullif(sum(fga),  0)",
    "fg3_pct": "sum(fg3) * 1.0 / nullif(sum(fg3a), 0)",
    "ft_pct":  "sum(ft)  * 1.0 / nullif(sum(fta),  0)",
}

_con = duckdb.connect(DB_PATH, read_only=True)


class PlayerNotFound(Exception):
    """Raised when a requested player name doesn't exist in the warehouse."""


def q(sql, params=None):
    """Run a query, return rows as a list of dicts (native Python types)."""
    cur = _con.cursor().execute(sql, params or [])
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def resolve_name(name):
    """Canonical player name from loose input (case/underscore tolerant)."""
    rows = q("SELECT player FROM players WHERE lower(player) = lower(?)",
             [name.replace("_", " ")])
    if not rows:
        raise PlayerNotFound(name)
    return rows[0]["player"]


def summary():
    return q("""SELECT count(*) AS games,
                       count(DISTINCT player) AS players,
                       count(DISTINCT league) AS leagues FROM games""")[0]


def list_players(league=None):
    if league:
        return q("SELECT * FROM players WHERE upper(league) = upper(?) ORDER BY player", [league])
    return q("SELECT * FROM players ORDER BY player")


def career_averages(player):
    counting = ", ".join(f"round(avg({s}), 3) AS {s}" for s in _COUNTING)
    pcts = ", ".join(f"round({sql}, 3) AS {name}" for name, sql in PCT_SQL.items())
    return q(f"""
        SELECT count(*) AS games, {counting}, {pcts}
        FROM games WHERE player = ?
    """, [player])[0]


def get_player(name):
    """Player metadata + career averages."""
    player = resolve_name(name)
    meta = q("SELECT * FROM players WHERE player = ?", [player])[0]
    meta["team"] = _team_of(meta.get("player_id"))   # from teams.json (read-only)
    return {**meta, "career": career_averages(player)}


def player_games(name, season=None, last=None):
    player = resolve_name(name)
    sql, params = "SELECT * FROM games WHERE player = ?", [player]
    if season:
        sql += " AND season = ?"; params.append(season)
    sql += " ORDER BY date DESC"
    if last:
        sql += f" LIMIT {int(last)}"
    return q(sql, params)


def player_seasons(name):
    player = resolve_name(name)
    return q("SELECT * FROM season_averages WHERE player = ? ORDER BY season", [player])


def player_season(name, season):
    player = resolve_name(name)
    avg = q("SELECT * FROM season_averages WHERE player = ? AND season = ?", [player, season])
    if not avg:
        return None
    games = q("SELECT * FROM games WHERE player = ? AND season = ? ORDER BY date", [player, season])
    return {"averages": avg[0], "games": games}


def compare(names):
    out = []
    for raw in names:
        player = resolve_name(raw)
        meta = q("SELECT player, league, headshot_url FROM players WHERE player = ?", [player])[0]
        out.append({**meta, "career": career_averages(player)})
    return out


_positions_cache = None

def _positions():
    """Player positions from positions.json (read-only, no DB write needed)."""
    global _positions_cache
    if _positions_cache is None:
        try:
            with open(POSITIONS_PATH, encoding="utf-8") as f:
                _positions_cache = json.load(f)
        except FileNotFoundError:
            _positions_cache = {}
    return _positions_cache


_teams_cache = None

def _teams():
    """Player team affiliations from teams.json (read-only)."""
    global _teams_cache
    if _teams_cache is None:
        try:
            with open(TEAMS_PATH, encoding="utf-8") as f:
                _teams_cache = json.load(f)
        except FileNotFoundError:
            _teams_cache = {}
    return _teams_cache


def _team_of(player_id):
    return _teams().get(str(player_id), {}).get("team") or "Free Agents"


def team_list(league):
    """Distinct teams for a league's players, with player counts (Free Agents last)."""
    rows = q("SELECT player_id FROM players WHERE upper(league) = upper(?)", [league])
    counts = {}
    for r in rows:
        t = _team_of(r["player_id"])
        counts[t] = counts.get(t, 0) + 1
    teams = sorted(t for t in counts if t != "Free Agents")
    if "Free Agents" in counts:
        teams.append("Free Agents")
    return [{"team": t, "count": counts[t]} for t in teams]


def team_players(league, team):
    """Players on a given team for the league, sorted by career PPG (highest first)."""
    rows = q("""
        SELECT pl.player, pl.player_id, pl.headshot_url, round(avg(g.pts), 1) AS ppg
        FROM players pl JOIN games g ON pl.player = g.player
        WHERE upper(pl.league) = upper(?)
        GROUP BY pl.player, pl.player_id, pl.headshot_url
    """, [league])
    out = [r for r in rows if _team_of(r["player_id"]) == team]
    out.sort(key=lambda r: r["ppg"] or 0, reverse=True)
    return out


def game_pool(league):
    """Players for the 82-0 game: each with position + their PEAK season's 5 categories
    (peak = the season with the highest Game Score). Positions come from positions.json,
    so this stays a pure read and never needs a warehouse rebuild."""
    rows = q("""
        WITH peak AS (
            SELECT * FROM (
                SELECT *, row_number() OVER (PARTITION BY player ORDER BY gmsc DESC) AS rn
                FROM season_averages
            ) WHERE rn = 1
        )
        SELECT pl.player_id, pl.player, pl.headshot_url, peak.season AS peak_season,
               peak.pts, peak.reb, peak.ast, peak.stl, peak.blk, peak.gmsc
        FROM players pl JOIN peak ON pl.player = peak.player
        WHERE upper(pl.league) = upper(?)
        ORDER BY peak.gmsc DESC
    """, [league])
    positions = _positions()
    for r in rows:
        r["position"] = positions.get(str(r["player_id"]), "")
    return rows


def leaderboards(stat="pts", season=None, league=None, limit=20):
    if stat not in AVG_STATS:
        raise ValueError(f"stat must be one of {AVG_STATS}")
    where, params = [], []
    if season:
        where.append("season = ?"); params.append(season)
    if league:
        where.append("upper(league) = upper(?)"); params.append(league)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    if season:
        sql = (f"SELECT player, league, games, {stat} FROM season_averages"
               f"{clause} ORDER BY {stat} DESC LIMIT {int(limit)}")
    else:
        agg = PCT_SQL.get(stat, f"avg({stat})")   # % from totals; everything else averaged
        sql = (f"SELECT player, any_value(league) AS league, count(*) AS games, "
               f"round({agg}, 3) AS {stat} FROM games{clause} "
               f"GROUP BY player ORDER BY {stat} DESC LIMIT {int(limit)}")
    return q(sql, params)
