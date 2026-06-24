#!/usr/bin/env python3
"""
game82.py - the "82-0: Vault Edition" simulation engine (pure logic, no DB/UI).

Build a 5-man lineup (one per position) from the Vault's players and project an
82-game record. The record is driven by the lineup's combined PRA
(Points + Rebounds + Assists) at each player's peak season: the higher the total
PRA, the better the record. The projected record is then matched to a comparable
real NBA team for flavor.

Kept free of Streamlit/DuckDB so it can be unit-tested on plain dicts.
"""

SLOTS = ["PG", "SG", "SF", "PF", "C"]

# Total lineup PRA (summed across all 5 players' peak seasons) is mapped to a
# record on this scale. Tunable game knobs:
PRA_FLOOR = 80      # total PRA at/below this -> ~0 wins
PRA_PERFECT = 240   # total PRA needed for a perfect 82-0


def eligibility(position):
    """Map a coarse position string (e.g. 'Guard-Forward') to eligible court slots."""
    pos = (position or "").lower()
    slots = set()
    if "guard" in pos:
        slots |= {"PG", "SG"}
    if "forward" in pos:
        slots |= {"SF", "PF"}
    if "center" in pos:
        slots |= {"C"}
    return slots or set(SLOTS)   # unknown position -> eligible anywhere


def pra(line):
    """Points + Rebounds + Assists for one player's stat line."""
    return (line.get("pts", 0) or 0) + (line.get("reb", 0) or 0) + (line.get("ast", 0) or 0)


def wins_from_pra(total_pra):
    """Map total lineup PRA to a win total (0-82), linear between the two knobs."""
    frac = (total_pra - PRA_FLOOR) / (PRA_PERFECT - PRA_FLOOR)
    return max(0, min(82, round(frac * 82)))


def compare_record(wins):
    """Match a win total to a comparable real NBA team (tier, blurb)."""
    if wins >= 82:
        return ("Perfect season", "never achieved in NBA history")
    if wins >= 73:
        return ("All-time great", "2015-16 Warriors went 73-9")
    if wins >= 72:
        return ("Historic", "1995-96 Bulls went 72-10")
    if wins >= 69:
        return ("Juggernaut", "1971-72 Lakers went 69-13")
    if wins >= 65:
        return ("Title favorite", "2016-17 Warriors went 67-15")
    if wins >= 58:
        return ("Championship contender", "top-2 seed territory")
    if wins >= 50:
        return ("Strong playoff team", "comfortable home-court seed")
    if wins >= 41:
        return ("Playoff / play-in team", "right around .500")
    if wins >= 30:
        return ("Lottery-bound", "outside the picture")
    if wins >= 15:
        return ("Rebuilding", "long season ahead")
    return ("Tank mode", "2015-16 76ers went 10-72")


def simulate(lineup, bonus=0):
    """
    lineup: list of dicts, each with player/pts/reb/ast (a player's peak averages).
    bonus: extra PRA added to the team total (e.g. Easter-egg combos).
    Returns the projected record, total PRA, per-player PRA, and a team comparison.
    """
    contributions = [{"player": p.get("player", "?"), "pra": round(pra(p), 1)} for p in lineup]
    total = round(sum(c["pra"] for c in contributions) + bonus, 1)
    wins = wins_from_pra(total)
    tier, comparison = compare_record(wins)
    return {
        "wins": wins,
        "losses": 82 - wins,
        "team_pra": total,
        "contributions": contributions,
        "tier": tier,
        "comparison": comparison,
        "bonus": bonus,
    }
