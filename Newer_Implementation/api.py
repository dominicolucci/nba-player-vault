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

import data

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
