import os
import csv
import time
import random
from datetime import datetime
from bs4 import BeautifulSoup
import requests
from NBA_Player_Map import player_name_to_id

# Configurable stat fields to extract (percentages directly from gamelog)
target_stats = [
    "PTS", "REB", "AST", "STL", "BLK",
    "FG%", "3P%", "FT%", 
    "FG", "FGA",
    "3P", "3PA", 
    "FT", "FTA", "GmSc", "+/-"
]

user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
]

def get_random_headers():
    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache"
    }

def parse_seasons(season_input):
    seasons = []
    for part in season_input.split(','):
        part = part.strip()
        if '-' in part:
            start, end = map(int, part.split('-'))
            seasons.extend(str(year) for year in range(start, end + 1))
        else:
            seasons.append(part)
    return seasons

def get_game_logs(player_id, season, season_type="reg", delay=3):
    """
    Scrape NBA game logs for a given player_id and season.
    season_type: 'reg' for regular season, 'playoffs' for playoffs
    """
    url = f"https://www.basketball-reference.com/players/{player_id[0]}/{player_id}/gamelog/{season}/"

    max_retries = 5
    retry_delay = delay
    for attempt in range(max_retries):
        headers = get_random_headers()
        time.sleep(random.uniform(2, 4) * (delay / 3))
        resp = requests.get(url, headers=headers)

        if resp.status_code == 429:
            time.sleep(retry_delay)
            retry_delay *= 1.8
            continue
        if resp.status_code != 200:
            if attempt == max_retries - 1:
                raise Exception(f"Failed to retrieve logs for {season}: HTTP {resp.status_code}")
            time.sleep(retry_delay)
            retry_delay *= 1.5
            continue
        break

    soup = BeautifulSoup(resp.text, "html.parser")
    table_id = "player_game_log_playoffs" if season_type == "playoffs" else "player_game_log_reg"
    table = soup.find("table", {"id": table_id})
    if not table:
        raise ValueError(f"Game log table not found for season {season} ({season_type})")

    tbody = table.find("tbody")
    if not tbody:
        raise ValueError(f"No table body found for season {season} ({season_type})")

    stat_map = {
        "PTS": 31, "REB": 25, "AST": 26, "STL": 27, "BLK": 28,
        "FG": 10, "FGA": 11, "FG%": 12,
        "3P": 13, "3PA": 14, "3P%": 15,
        "FT": 20, "FTA": 21, "FT%": 22, "GmSc": 32, "+/-": 33
    }

    games = []
    last_date = None

    for row in tbody.find_all("tr"):
        if "thead" in row.get("class", []) or "partial_table" in row.get("class", []):
            continue
        cells = row.find_all(["th", "td"])
        if len(cells) <= max(stat_map.values()):
            continue

        date_str = cells[3].get_text(strip=True)
        try:
            game_date = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue

        location = cells[5].get_text(strip=True)
        opponent = cells[6].get_text(strip=True)
        result = cells[7].get_text(strip=True)
        minutes = cells[9].get_text(strip=True)

        game = {
            "date": date_str,
            "opponent": opponent,
            "home": location != "@",
            "b2b": (last_date and (game_date - last_date).days == 1),
            "result": result,
            "MIN": minutes
        }
        last_date = game_date

        for stat in target_stats:
            idx = stat_map.get(stat)
            if idx is None:
                continue
            text = cells[idx].get_text(strip=True)
            try:
                game[stat] = float(text)
            except ValueError:
                game[stat] = None

        games.append(game)

    return games

def save_games_to_csv(player_name, games, season_type):
    import pandas as pd

    folder = "csv_exports_playoffs" if season_type == "playoffs" else "csv_exports"
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, f"{player_name.replace(' ', '_')}.csv")

    if os.path.exists(filepath):
        df_existing = pd.read_csv(filepath)
    else:
        df_existing = pd.DataFrame()

    df_new = pd.DataFrame(games)
    if not df_existing.empty:
        df = pd.merge(df_existing, df_new, on="date", how="outer", suffixes=("", "_new"))
        for col in df_new.columns:
            if col != "date" and f"{col}_new" in df.columns:
                df[col] = df[col].combine_first(df[f"{col}_new"])
                df.drop(columns=[f"{col}_new"], inplace=True)
    else:
        df = df_new

    df.sort_values("date", inplace=True)
    df.to_csv(filepath, index=False)

if __name__ == "__main__":
    player_input = input("Enter NBA player name (e.g., LeBron James): ").strip().lower()
    if player_input not in player_name_to_id:
        print("Player not found.")
        exit(1)

    season_input = input("Enter seasons to scrape (e.g., 2020,2021-2023 or 'all'): ").strip().lower()
    if season_input == "all":
        first_year = input("Enter first season year (e.g., 2012): ").strip()
        seasons = [str(y) for y in range(int(first_year), datetime.now().year + 1)]
    else:
        seasons = parse_seasons(season_input)

    type_input = input("Choose type (reg | playoffs | both): ").strip().lower()
    types = ["reg", "playoffs"] if type_input == "both" else [type_input]

    player_id = player_name_to_id[player_input]

    for season_type in types:
        all_games = []
        existing_dates = set()
        folder = "csv_exports_playoffs" if season_type == "playoffs" else "csv_exports"
        csv_path = os.path.join(folder, f"{player_input.replace(' ', '_')}.csv")
        if os.path.exists(csv_path):
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                existing_dates = {row["date"] for row in reader}

        for season in seasons:
            try:
                logs = get_game_logs(player_id, season, season_type=season_type)
                new = [g for g in logs if g["date"] not in existing_dates]
                if new:
                    all_games.extend(new)
                    existing_dates.update(g["date"] for g in new)
                    print(f"[✓] {len(new)} {season_type} games added for {season}")
                else:
                    print(f"[✓] No new {season_type} games for {season}")
            except Exception as err:
                print(f"[!] Error for {season} ({season_type}): {err}")

        if all_games:
            save_games_to_csv(player_input, all_games, season_type)
            print(f"[✓] All new {season_type} game logs saved.")
        else:
            print(f"[!] No new {season_type} games to save.")
