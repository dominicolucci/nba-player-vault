#!/usr/bin/env python3
"""
api.py - NBA Player Vault read API (FastAPI over the shared data layer).

A thin HTTP wrapper around data.py; every route maps to a page in the app.
Interactive docs are auto-generated at /docs.

    Run:   uvicorn api:app --reload
    Docs:  http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import data
import game82

app = FastAPI(
    title="NBA Player Vault API",
    description="Read API over career-long NBA & WNBA game logs.",
    version="0.1.0",
)
# Allow the (future) browser frontend to call this from anywhere.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _player_or_404(fn, name, *args):
    try:
        return fn(name, *args)
    except data.PlayerNotFound:
        raise HTTPException(status_code=404, detail=f"Player not found: {name}")


@app.get("/", tags=["meta"])
def root():
    """Warehouse summary."""
    return {"app": "NBA Player Vault", "version": app.version, **data.summary()}


@app.get("/players", tags=["players"])
def list_players(league: str | None = Query(None, description="NBA or WNBA")):
    """Roster: every tracked player with headshot + season range (home grid)."""
    return data.list_players(league)


@app.get("/players/{name}", tags=["players"])
def player_profile(name: str):
    """Profile: metadata + career averages (the hero card)."""
    return _player_or_404(data.get_player, name)


@app.get("/players/{name}/games", tags=["players"])
def player_games(name: str,
                 season: str | None = Query(None, description="e.g. 2024-25 or 2025"),
                 last: int | None = Query(None, ge=1, description="only the most recent N games")):
    """Game log, optionally filtered to one season or the last N games."""
    return _player_or_404(data.player_games, name, season, last)


@app.get("/players/{name}/seasons", tags=["players"])
def player_seasons(name: str):
    """Per-season averages (drives the season picker + trajectory)."""
    return _player_or_404(data.player_seasons, name)


@app.get("/players/{name}/seasons/{season}", tags=["players"])
def player_season(name: str, season: str):
    """One season: that season's averages plus the game log."""
    result = _player_or_404(data.player_season, name, season)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No {season} season for {name}")
    return result


@app.get("/compare", tags=["compare"])
def compare(players: str = Query(..., description="comma-separated names")):
    """Career averages side by side for 2+ players."""
    names = [p.strip() for p in players.split(",") if p.strip()]
    try:
        return data.compare(names)
    except data.PlayerNotFound as e:
        raise HTTPException(status_code=404, detail=f"Player not found: {e}")


@app.get("/leaderboards", tags=["leaderboards"])
def leaderboards(stat: str = Query("pts", description=f"one of: {', '.join(data.AVG_STATS)}"),
                 season: str | None = Query(None),
                 league: str | None = Query(None),
                 limit: int = Query(20, ge=1, le=100)):
    """Ranked averages across all tracked players, optionally by season/league."""
    try:
        return data.leaderboards(stat, season, league, limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/teams", tags=["teams"])
def list_teams(league: str = Query(..., description="NBA or WNBA")):
    """Distinct teams in a league with player counts (Free Agents last)."""
    return data.team_list(league)


@app.get("/teams/{team}/players", tags=["teams"])
def team_roster(team: str, league: str = Query(..., description="NBA or WNBA")):
    """Players on a team for the league, sorted by career PPG (highest first)."""
    return data.team_players(league, team)


# ----------------------------- 82-0 game ---------------------------------
class SimSlot(BaseModel):
    """One drafted lineup line: the player + the (spun) season's averages."""
    player: str
    season: str | None = None
    pts: float = 0
    reb: float = 0
    ast: float = 0


# LeBron + Bronny in the same lineup -> +67 PRA ("23 and Me"). Kept beside the
# engine so the win-loss mapping stays a single source of truth on the backend.
_EASTER_EGG_DUO = {"lebron james", "bronny james"}
_EASTER_EGG_BONUS = 67


@app.get("/game/pool", tags=["game"])
def game_pool(league: str = Query(..., description="NBA or WNBA")):
    """82-0 draft pool: each player's peak-season line, position, and eligible court slots."""
    pool = data.game_pool(league)
    for p in pool:
        p["slots"] = sorted(game82.eligibility(p.get("position", "")))
    return pool


@app.post("/game/simulate", tags=["game"])
def game_simulate(lineup: list[SimSlot]):
    """Project an 82-game record from a (partial or full) lineup via game82.simulate.
    Works with 1-5 lines so the frontend can show a running record as players are drafted."""
    lines = [s.model_dump() for s in lineup]
    names = {ln["player"].lower() for ln in lines}
    bonus = _EASTER_EGG_BONUS if _EASTER_EGG_DUO <= names else 0
    return game82.simulate(lines, bonus=bonus)
