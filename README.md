# 🏀 NBA Player Vault

**An end-to-end analytics data platform — built and shipped by one engineer.**

It ingests every game of an NBA/WNBA player's career from the league's official stats API,
warehouses it, and serves it through player profiles, head-to-head comparisons, leaderboards, and
a draft game. **540+ players across all 30 NBA teams + the WNBA · 163,000+ game-level records.**

🔗 **[Live app](REPLACE_LIVE_APP_URL)** · 🖥️ **[Project site](REPLACE_SITE_URL)** ·
📖 **[Technical deep-dive](REPLACE_SITE_URL/technical.html)**

> The product being demonstrated isn't basketball stats — it's a working ELT pipeline, a medallion
> data architecture, a shared query layer feeding two frontends, and the real data-quality and
> reliability problems solved along the way.

---

## Architecture

A one-directional, medallion-style pipeline. Each stage has one job; nothing reaches around the
layer below it.

```
stats.nba.com (nba_api)
   │   rate-limited, resumable pull
   ▼
nba_daemon.py ──► per-player canonical CSVs        ← RAW landing layer
   ▼
warehouse.py ───► player_vault.duckdb              ← CURATED warehouse
   ▼              (games · players · season_averages view)
data.py  ← single shared query layer (read-only)
   ├──► api.py        (FastAPI — REST + OpenAPI docs)
   │      └──► frontend/   (Next.js + Tailwind web app — typed REST client)
   └──► vault_app.py  (Streamlit + Plotly UI)
```

The **shared access layer** (`data.py`) is the keystone: the API and UI import the same query
functions, so SQL logic is never duplicated or allowed to drift.

## Features

- **Player profiles** — full career, per-season splits, game logs, and an *adaptive* trajectory
  chart (season line for veterans, rolling average for rookies).
- **Head-to-head** — any two players, category by category.
- **Leaderboards** — single-season and all-time, with correctly volume-weighted shooting %s.
- **The 82-0 game** — draft a starting five; each player's real production maps to a real NBA
  team's win-loss record as you chase a perfect, undefeated season.
- **NBA / WNBA** toggle throughout.
- **Web app (Next.js + Tailwind)** — a typed React frontend on the REST API: a rotating hero of
  20+ PPG career scorers, player browse + profiles (Recharts trajectory, game log, month splits),
  and the 82-0 draft — all driven by one tokenized design system with dark/light themes.

## Engineering highlights

- **A statistical-correctness bug, caught and fixed.** Shooting %s were computed as the *average of
  per-game percentages* (volume-blind) — a career FT% read 80.8% vs. the true 90.8%. Re-derived as
  `sum(makes)/sum(attempts)`; now matches Basketball-Reference exactly.
- **Identity resolution on messy data.** Accents (*Jokić*), hyphens (*Gilgeous-Alexander*), and
  rookies missing from the static list — solved with Unicode NFKD folding + a static→live-API fallback.
- **Resilience under real failure.** A mid-run internet outage during a ~200-player load lost zero
  data: daemon retry/backoff + an orchestrator retry pass + a pausable/resumable design that dedupes
  against what's on disk.
- **Tested.** Pure-function game engine (unit-testable) + headless UI flow tests via Streamlit `AppTest`.

## Stack & tradeoffs

| Tool | Why | Tradeoff |
|------|-----|----------|
| **DuckDB** | Embedded, zero-ops, columnar — ms analytical scans | Single-writer; Postgres for concurrent writes |
| **nba_api** | Official, authoritative, structured | Strict rate limits → global gate + backoff |
| **FastAPI** | Typed REST + auto OpenAPI docs | Read-only; logic lives in the shared layer |
| **Streamlit + Plotly** | Ships an interactive data UI fast (internal/demo) | Less layout control than React — now superseded by the Next.js app |
| **Next.js + Tailwind** | Typed React frontend on the REST API; tokenized design system, dark/light | Adds a build step + a second runtime to operate |

## Project structure

```
Newer_Implementation/
├── nba_daemon.py        # rate-limited, resumable ingestion daemon
├── warehouse.py         # builds the DuckDB warehouse from CSVs
├── enrich_positions.py  # player → position (cached JSON)
├── enrich_teams.py      # player → current team (cached JSON)
├── add_teams.py         # end-to-end orchestrator for a set of teams
├── data.py              # shared query layer (single source of truth)
├── api.py               # FastAPI REST service
├── vault_app.py         # Streamlit + Plotly UI
├── game82.py            # pure 82-0 simulation engine
├── site/                # marketing site (index.html, technical.html)
├── frontend/            # Next.js + Tailwind web app (typed REST client for api.py)
└── *_csv_exports/, player_vault.duckdb, positions.json, teams.json
```

## Running locally

```bash
cd Newer_Implementation

# serve the app (reads the committed warehouse)
pip install -r requirements.txt
streamlit run vault_app.py

# extend the data (pipeline deps)
pip install -r requirements-pipeline.txt
python add_teams.py Celtics 76ers Heat     # discover → pull → warehouse → enrich
```

> The prebuilt `player_vault.duckdb` (~6 MB) is committed so the app runs with zero setup and
> deploys to Streamlit Cloud as-is.

## Deployment

Deployed on **Streamlit Community Cloud** — main file `Newer_Implementation/vault_app.py`,
dependencies from `requirements.txt`.

## Roadmap

ML career-trajectory projection · LLM "chat with the vault" (text-to-SQL) · player embeddings ·
all-time-greats tier · Parquet + incremental upserts · finish the Next.js `/compare` + `/leaderboards` pages.

---

*Data from the official `stats.nba.com` API.*
