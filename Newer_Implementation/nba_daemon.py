#!/usr/bin/env python3
"""
nba_daemon.py - continuous, rate-limited importer for NBA & WNBA player game logs.

Pulls new games for your tracked players from the official NBA stats backend
(nba_api, which serves both leagues), appends them to per-player CSVs in the
canonical schema, checkpoints progress, and loops at a deliberately gentle
request rate so it never gets throttled or blocked.

Each league is managed separately: its own folder (nba_csv_exports/ vs
wnba_csv_exports/) and its own checkpoint (daemon_state_nba.json vs
daemon_state_wnba.json). Tracked players come from the filenames already in that
league's folder; override with --players.

    NBA, runs forever:     python nba_daemon.py
    WNBA, runs forever:    python nba_daemon.py --league wnba
    One pass then exit:    python nba_daemon.py --once
    Seed a new league:     python nba_daemon.py --league wnba --rebuild --players "A'ja Wilson"

Stop anytime with Ctrl+C - it checkpoints after every player, so nothing is lost.
"""

import os
import csv
import sys
import json
import time
import random
import argparse
import unicodedata
from datetime import datetime

from nba_api.stats.static import players as nba_players
from nba_api.stats.endpoints import playergamelog, commonplayerinfo, commonallplayers

# --------------------------------------------------------------------------
# SAFETY / RATE-LIMIT SETTINGS  (this is the "don't get blocked" knob)
# --------------------------------------------------------------------------
REQUEST_INTERVAL = 2.0     # hard minimum seconds between ANY two API calls
REQUEST_JITTER   = 1.0     # + random 0..this, so calls aren't perfectly regular
TIMEOUT          = 30      # per-request timeout (never hang forever)
MAX_RETRIES      = 3       # retries per player on a failed call
RETRY_BACKOFF    = 5       # seconds, multiplied by attempt number

# If many players fail in a row we may be getting throttled -> long cooldown.
CONSECUTIVE_FAIL_LIMIT = 5
THROTTLE_COOLDOWN      = 300   # seconds (5 min) to back off if that happens

# How long to wait between full passes over the whole watchlist (continuous mode).
CYCLE_PAUSE_MINUTES = 180      # 3 hours; new games only land a few times a week

# Paths are relative to this file, so it works no matter where you launch it.
HERE = os.path.dirname(os.path.abspath(__file__))

# --------------------------------------------------------------------------
# LEAGUE CONFIG - each league writes to its own folder + checkpoint, and uses
# its own stats league_id and season format. NBA seasons span two calendar
# years ("2025-26"); WNBA seasons are a single year ("2025").
# --------------------------------------------------------------------------
LEAGUES = {
    "nba":  {"league_id": "00", "folder": "nba_csv_exports",  "single_year": False},
    "wnba": {"league_id": "10", "folder": "wnba_csv_exports", "single_year": True},
}

# Active league config; main() overrides these from --league (defaults to NBA).
LEAGUE      = "nba"
LEAGUE_ID   = LEAGUES["nba"]["league_id"]
SINGLE_YEAR = LEAGUES["nba"]["single_year"]
CSV_DIR     = os.path.join(HERE, LEAGUES["nba"]["folder"])
STATE_FILE  = os.path.join(HERE, "daemon_state_nba.json")

# Canonical column order for ALL player CSVs (clean, superset of the old schemas).
COLUMNS = ["date", "opponent", "home", "b2b", "result", "MIN",
           "PTS", "REB", "AST", "STL", "BLK", "TOV",
           "FG", "FGA", "FG%", "3P", "3PA", "3P%", "FT", "FTA", "FT%",
           "GmSc", "+/-"]

# --------------------------------------------------------------------------
# Rate limiter: a single global gate every API call must pass through.
# --------------------------------------------------------------------------
_last_call = [0.0]   # list so the nested function can mutate it

def throttle():
    """Block until at least REQUEST_INTERVAL (+jitter) has passed since the
    previous call. This is what keeps us safely under any throttle threshold."""
    wait = REQUEST_INTERVAL + random.uniform(0, REQUEST_JITTER)
    elapsed = time.monotonic() - _last_call[0]
    if elapsed < wait:
        time.sleep(wait - elapsed)
    _last_call[0] = time.monotonic()


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


# --------------------------------------------------------------------------
# Checkpoint state (so a restart resumes instead of redoing everything)
# --------------------------------------------------------------------------
def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


# --------------------------------------------------------------------------
# Player resolution
# --------------------------------------------------------------------------
def watchlist_from_csvs():
    """Every player we already track = every <name>.csv in the league's folder."""
    if not os.path.isdir(CSV_DIR):
        return []
    names = []
    for fn in sorted(os.listdir(CSV_DIR)):
        if fn.endswith(".csv"):
            names.append(fn[:-4].replace("_", " "))
    return names

def _norm(s):
    """Fold accents, treat hyphens as spaces, drop other punctuation, collapse spaces -
    so 'tj mcconnell'=='T.J. McConnell', 'luka doncic'=='Luka Dončić', and
    'shai gilgeous alexander'=='Shai Gilgeous-Alexander'."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().replace("-", " ")
    return "".join(c for c in s.lower() if c.isalnum() or c.isspace()).split()

_cap_index = {}   # league_id -> {normalized name: id}, built once per run

def _cap_resolve(name, league_id):
    """Resolve via one cached commonallplayers call — covers brand-new players that
    aren't yet in nba_api's bundled static list."""
    idx = _cap_index.setdefault(league_id, {})
    if not idx:
        throttle()
        df = commonallplayers.CommonAllPlayers(
            league_id=league_id, season=current_season(),
            is_only_current_season=0, timeout=TIMEOUT
        ).get_data_frames()[0]
        for _, r in df.iterrows():
            idx[" ".join(_norm(r["DISPLAY_FIRST_LAST"]))] = int(r["PERSON_ID"])
    return idx.get(" ".join(_norm(name)))

def resolve_player_id(name):
    """Look up a player id from a full name. NBA tries the offline static list first,
    then the live current-season API; WNBA uses the API directly."""
    if LEAGUE == "wnba":
        return _cap_resolve(name, "10")
    hits = nba_players.find_players_by_full_name(name)
    if not hits:
        # Punctuation/accent-insensitive fallback (T.J., D'Angelo, Dončić, ...)
        target = _norm(name)
        hits = [p for p in nba_players.get_players() if _norm(p["full_name"]) == target]
    if hits:
        for h in hits:                       # prefer an active player on multi-match
            if h.get("is_active"):
                return h["id"]
        return hits[0]["id"]
    return _cap_resolve(name, "00")          # not in static -> try the current-season API


# --------------------------------------------------------------------------
# Fetch + transform one player's season into your CSV schema
# --------------------------------------------------------------------------
def game_score(r):
    """Hollinger Game Score - NBA API doesn't supply it, but every input is present."""
    return round(
        r["PTS"] + 0.4 * r["FGM"] - 0.7 * r["FGA"]
        - 0.4 * (r["FTA"] - r["FTM"]) + 0.7 * r["OREB"] + 0.3 * r["DREB"]
        + r["STL"] + 0.7 * r["AST"] + 0.7 * r["BLK"] - 0.4 * r["PF"] - r["TOV"], 1)

def fetch_season_games(player_id, season):
    """Return this player's games for `season` as a list of CSV-schema dicts,
    sorted oldest-first. Retries with backoff; raises on final failure."""
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        throttle()
        try:
            df = playergamelog.PlayerGameLog(
                player_id=player_id, season=season,
                league_id_nullable=LEAGUE_ID, timeout=TIMEOUT
            ).get_data_frames()[0]
            break
        except Exception as e:
            last_err = e
            time.sleep(RETRY_BACKOFF * attempt)
    else:
        raise last_err

    games = []
    for _, r in df.iterrows():
        matchup = r["MATCHUP"]
        games.append({
            "date":     datetime.strptime(r["GAME_DATE"], "%b %d, %Y").strftime("%Y-%m-%d"),
            "opponent": matchup.split()[-1],
            "home":     "vs." in matchup,
            "b2b":      False,  # filled in below once sorted
            "result":   r["WL"],
            "MIN":      r["MIN"],
            "PTS": float(r["PTS"]), "REB": float(r["REB"]), "AST": float(r["AST"]),
            "STL": float(r["STL"]), "BLK": float(r["BLK"]), "TOV": float(r["TOV"]),
            "FG": float(r["FGM"]), "FGA": float(r["FGA"]), "FG%": r["FG_PCT"],
            "3P": float(r["FG3M"]), "3PA": float(r["FG3A"]), "3P%": r["FG3_PCT"],
            "FT": float(r["FTM"]), "FTA": float(r["FTA"]), "FT%": r["FT_PCT"],
            "GmSc": game_score(r), "+/-": float(r["PLUS_MINUS"]),
        })
    games.sort(key=lambda g: g["date"])
    return games


# --------------------------------------------------------------------------
# CSV merge (only append genuinely new dates)
# --------------------------------------------------------------------------
def existing_dates(path):
    if not os.path.exists(path):
        return set(), None
    dates = set()
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            dates.add(row["date"])
    last = max(dates) if dates else None
    return dates, last

def append_new_games(name, games):
    """Write only games whose date isn't already in the CSV. Returns count added."""
    os.makedirs(CSV_DIR, exist_ok=True)
    path = os.path.join(CSV_DIR, name.replace(" ", "_") + ".csv")
    have, last_date = existing_dates(path)

    new = [g for g in games if g["date"] not in have]
    if not new:
        return 0

    # back-to-back flag, threading through the last existing game date
    prev = datetime.strptime(last_date, "%Y-%m-%d") if last_date else None
    for g in new:
        d = datetime.strptime(g["date"], "%Y-%m-%d")
        g["b2b"] = bool(prev and (d - prev).days == 1)
        prev = d

    write_header = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        if write_header:
            w.writeheader()
        for g in new:
            w.writerow(g)
    return len(new)


# --------------------------------------------------------------------------
# Season strings: NBA spans two years ("2025-26"), WNBA is one ("2025").
# --------------------------------------------------------------------------
def current_season():
    now = datetime.now()
    if SINGLE_YEAR:
        return str(now.year)
    start = now.year if now.month >= 10 else now.year - 1
    return f"{start}-{str(start + 1)[-2:]}"

def season_str(start_year):
    return str(start_year) if SINGLE_YEAR else f"{start_year}-{str(start_year + 1)[-2:]}"

def player_season_range(player_id):
    """Every season the player has played, formatted for the active league."""
    throttle()
    df = commonplayerinfo.CommonPlayerInfo(
        player_id=player_id, league_id_nullable=LEAGUE_ID, timeout=TIMEOUT
    ).get_data_frames()[0]
    frm, to = int(df["FROM_YEAR"][0]), int(df["TO_YEAR"][0])
    return [season_str(y) for y in range(frm, to + 1)]

def set_b2b(games):
    """Set the back-to-back flag on a chronologically sorted list of games."""
    prev = None
    for g in games:
        d = datetime.strptime(g["date"], "%Y-%m-%d")
        g["b2b"] = bool(prev and (d - prev).days == 1)
        prev = d


# --------------------------------------------------------------------------
# Full-history rebuild: overwrite one player's CSV in the canonical schema
# --------------------------------------------------------------------------
def rebuild_player(name, player_id):
    seasons = player_season_range(player_id)
    all_games = []
    for s in seasons:
        try:
            all_games.extend(fetch_season_games(player_id, s))
        except Exception as e:
            log(f"    {name} {s}: ERROR {type(e).__name__}: {e}")
    all_games.sort(key=lambda g: g["date"])
    set_b2b(all_games)

    os.makedirs(CSV_DIR, exist_ok=True)
    path = os.path.join(CSV_DIR, name.replace(" ", "_") + ".csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for g in all_games:
            w.writerow(g)
    return len(all_games), len(seasons)


def run_rebuild(names, state, limit=None):
    if limit:
        names = names[:limit]
    for i, name in enumerate(names, 1):
        pid = resolve_player_id(name)
        if pid is None:
            log(f"({i}/{len(names)}) {name}: could not resolve - SKIPPED")
            continue
        try:
            n_games, n_seasons = rebuild_player(name, pid)
            log(f"({i}/{len(names)}) {name}: rebuilt {n_games} games across {n_seasons} seasons")
            state[name] = {"last_checked": datetime.now().isoformat(timespec="seconds"),
                           "season": current_season(), "rebuilt": True}
            save_state(state)
        except Exception as e:
            log(f"({i}/{len(names)}) {name}: REBUILD FAILED {type(e).__name__}: {e}")


# --------------------------------------------------------------------------
# One full pass over the watchlist
# --------------------------------------------------------------------------
def run_pass(names, season, state, limit=None):
    if limit:
        names = names[:limit]
    fails = 0
    total_added = 0
    for i, name in enumerate(names, 1):
        pid = resolve_player_id(name)
        if pid is None:
            log(f"({i}/{len(names)}) {name}: could not resolve - skipped")
            continue
        try:
            games = fetch_season_games(pid, season)
            added = append_new_games(name, games)
            total_added += added
            note = f"+{added} new" if added else "up to date"
            log(f"({i}/{len(names)}) {name}: {note}")
            state[name] = {"last_checked": datetime.now().isoformat(timespec="seconds"),
                           "season": season}
            save_state(state)
            fails = 0
        except Exception as e:
            fails += 1
            log(f"({i}/{len(names)}) {name}: ERROR {type(e).__name__}: {e}")
            if fails >= CONSECUTIVE_FAIL_LIMIT:
                log(f"{fails} failures in a row - possible throttle, "
                    f"cooling down {THROTTLE_COOLDOWN}s")
                time.sleep(THROTTLE_COOLDOWN)
                fails = 0
    return total_added


def main():
    ap = argparse.ArgumentParser(description="Continuous rate-limited NBA/WNBA importer")
    ap.add_argument("--league", choices=sorted(LEAGUES), default="nba",
                    help="which league to import (default: nba)")
    ap.add_argument("--once", action="store_true", help="single pass then exit")
    ap.add_argument("--rebuild", action="store_true",
                    help="re-pull full history for every player into the canonical schema, then exit")
    ap.add_argument("--limit", type=int, help="only first N players (testing)")
    ap.add_argument("--players", help="comma-separated names to track instead of the league folder")
    ap.add_argument("--players-file", help="UTF-8 file of names (one per line or comma-separated)")
    ap.add_argument("--season", help='season, e.g. "2025-26" / "2025" (default: current)')
    ap.add_argument("--resolve-check", action="store_true",
                    help="just check every watchlist name resolves to a player id, then exit")
    args = ap.parse_args()

    # Activate the chosen league: folder, checkpoint, league_id and season format.
    global LEAGUE, LEAGUE_ID, SINGLE_YEAR, CSV_DIR, STATE_FILE
    LEAGUE = args.league
    cfg = LEAGUES[LEAGUE]
    LEAGUE_ID, SINGLE_YEAR = cfg["league_id"], cfg["single_year"]
    CSV_DIR = os.path.join(HERE, cfg["folder"])
    STATE_FILE = os.path.join(HERE, f"daemon_state_{LEAGUE}.json")

    season = args.season or current_season()
    if args.players_file:
        with open(args.players_file, encoding="utf-8") as f:
            raw = f.read().replace("\n", ",")
        names = [n.strip() for n in raw.split(",") if n.strip()]
    elif args.players:
        names = [n.strip() for n in args.players.split(",") if n.strip()]
    else:
        names = watchlist_from_csvs()

    if not names:
        log(f"No players to track. Add CSVs to {cfg['folder']}/ or pass --players.")
        sys.exit(1)

    # Resolution check: confirm every name maps to a real nba_api id, no network.
    if args.resolve_check:
        bad = [n for n in names if resolve_player_id(n) is None]
        log(f"{len(names) - len(bad)}/{len(names)} names resolved.")
        if bad:
            log("UNRESOLVED (fix spelling or use --players): " + ", ".join(bad))
        sys.exit(1 if bad else 0)

    state = load_state()
    log(f"[{LEAGUE.upper()}] season {season} | {len(names)} players -> {cfg['folder']}/ | "
        f"~{REQUEST_INTERVAL}-{REQUEST_INTERVAL + REQUEST_JITTER:.0f}s between calls")

    try:
        if args.rebuild:
            log("FULL REBUILD: re-pulling complete history into canonical schema.")
            run_rebuild(names, state, limit=args.limit)
            log("Rebuild complete. All CSVs now share the canonical schema.")
        elif args.once:
            added = run_pass(names, season, state, limit=args.limit)
            log(f"Pass complete. {added} new games added.")
        else:
            while True:
                added = run_pass(names, season, state, limit=args.limit)
                log(f"Pass complete ({added} new). Sleeping {CYCLE_PAUSE_MINUTES} min.")
                time.sleep(CYCLE_PAUSE_MINUTES * 60)
    except KeyboardInterrupt:
        save_state(state)
        log("Stopped by user. Progress checkpointed - safe to restart anytime.")


if __name__ == "__main__":
    main()
