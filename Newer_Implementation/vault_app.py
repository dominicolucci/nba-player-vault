#!/usr/bin/env python3
"""
vault_app.py - NBA Player Vault (Streamlit UI).

The eye-popping front end: a roster of headshots, a player profile with career
trends, a by-season view, head-to-head comparison, and leaderboards. Reads
through the shared data layer (data.py) over the DuckDB warehouse.

    Run:   streamlit run vault_app.py
"""

import random
import urllib.parse

import pandas as pd
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px

import data
import game82

st.set_page_config(page_title="NBA Player Vault", page_icon="🏀", layout="wide",
                   initial_sidebar_state="collapsed")

ACCENT = "#f5a623"
PLOT_BG = "rgba(0,0,0,0)"

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap');
/* remove the hover "view fullscreen / zoom" button on images (player cards) */
[data-testid="StyledFullScreenButton"], button[title="View fullscreen"] { display: none !important; }
/* uniform button height so clickable player names align regardless of name length */
.stButton > button { min-height: 3em; }
/* clickable roster headshots: pointer + subtle highlight on hover */
a.pcard img { border-radius: 8px; cursor: pointer; transition: transform .1s ease, box-shadow .1s ease; }
a.pcard:hover img { transform: scale(1.04); box-shadow: 0 0 0 2px #f5a623; }
/* bigger tab labels (Profile / By Season) */
.stTabs [data-baseweb="tab-list"] button p { font-size: 1.35rem; font-weight: 600; }
/* easter-egg popup: blur the page behind the modal so the message is the focus */
div[data-baseweb="modal"] { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
/* ===== HOME: immersive hero + glass feature cards ===== */
/* blended, translucent court atmosphere — spotlight glow over a deep gradient */
.stApp {
    background:
      radial-gradient(1100px 520px at 50% -8%, rgba(245,166,35,0.16), transparent 62%),
      radial-gradient(760px 700px at 50% 42%, rgba(74,163,223,0.06), transparent 70%),
      linear-gradient(180deg, #0b0e17 0%, #0a0c14 45%, #07080d 100%);
}
.hero { text-align:center; padding: 2.8rem 1rem 1.2rem; position:relative; }
/* faint center-court circle behind the wordmark */
.hero::before {
    content:''; position:absolute; top:-26px; left:50%; transform:translateX(-50%);
    width:360px; height:360px; max-width:80vw; border-radius:50%;
    border:2px solid rgba(245,166,35,0.10);
    box-shadow: inset 0 0 70px rgba(245,166,35,0.05); pointer-events:none;
}
.hero .htitle {
    font-family:'Orbitron',sans-serif; font-weight:900; font-size:4rem; line-height:1.02;
    color:#f5a623; text-shadow:0 0 30px rgba(245,166,35,0.55); letter-spacing:1px; position:relative;
}
.hero .htag { font-size:1.25rem; color:#e3e8f0; margin-top:0.9rem; font-weight:500; position:relative; }
.hero .hsub { max-width:680px; margin:0.7rem auto 0; color:#9aa3b2; font-size:1rem;
    line-height:1.55; position:relative; }
/* glowing stat strip */
.statstrip { display:flex; justify-content:center; gap:2.8rem; flex-wrap:wrap; margin:1.7rem 0 0.3rem; }
.statstrip .snum {
    font-family:'Orbitron',sans-serif; font-weight:800; font-size:2.1rem; color:#fafafa;
    text-shadow:0 0 18px rgba(245,166,35,0.35);
}
.statstrip .slbl { color:#8c93a3; font-size:0.78rem; letter-spacing:2px;
    text-transform:uppercase; margin-top:0.1rem; }
.scrollcue { text-align:center; color:#6f7687; font-size:0.85rem; letter-spacing:3px;
    text-transform:uppercase; margin:1.5rem 0 0.4rem; animation: bob 1.8s ease-in-out infinite; }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
/* the four modes as big translucent glass cards */
.feature-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.4rem;
    width:100%; margin:0.5rem 0 1.2rem; }
a.feature {
    display:block; text-decoration:none; padding:1.5rem 1.6rem; border-radius:18px;
    background:linear-gradient(150deg, rgba(28,32,48,0.78), rgba(12,14,20,0.78));
    border:1px solid rgba(255,255,255,0.07); border-top:3px solid var(--accent);
    backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px);
    transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}
a.feature:hover { transform:translateY(-5px); border-color:var(--accent);
    box-shadow:0 18px 44px -14px var(--accent); }
a.feature .ficon { font-size:2.4rem; line-height:1; }
a.feature .ftitle { font-family:'Orbitron',sans-serif; font-weight:800; font-size:1.4rem;
    color:#ffffff; margin-top:0.5rem; letter-spacing:.5px; }
a.feature:hover .ftitle { color:var(--accent); }
a.feature .fdesc { color:#aab2c0; font-size:0.95rem; line-height:1.5; margin-top:0.55rem; }
a.feature .fcta { color:var(--accent); font-weight:700; font-size:0.9rem;
    margin-top:0.9rem; display:inline-block; }
@media (max-width:760px){ .feature-grid{grid-template-columns:1fr;} .hero .htitle{font-size:2.8rem;} }
/* team roster: bordered player chips (sorted by PPG), accent edge + hover lift */
.pgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; margin-top: 0.4rem; }
a.pchip {
    display: flex; align-items: center; justify-content: center; text-align: center;
    min-height: 3.2em; padding: 0.5rem 0.65rem; text-decoration: none; font-weight: 600;
    color: #fafafa; border: 1px solid #353b48; border-left: 3px solid #f5a623;
    border-radius: 12px; background: linear-gradient(145deg, #1c2030 0%, #12141c 100%);
    transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
}
a.pchip:hover {
    transform: translateY(-3px); border-color: #f5a623;
    box-shadow: 0 8px 20px -5px rgba(245, 166, 35, 0.55);
}
/* brand wordmark (raw-HTML logo) — futuristic font + glow, clickable -> home */
a.brand { text-decoration: none; display: block; text-align: center; padding: 0.4rem 0 0.2rem; }
a.brand .vault {
    font-family: 'Orbitron', sans-serif;
    font-size: 2.3rem;
    font-weight: 900;
    letter-spacing: 1px;
    line-height: 1.05;
    color: #f5a623;
    text-shadow: 0 0 16px rgba(245, 166, 35, 0.55);
}
a.brand:hover .vault { text-shadow: 0 0 22px rgba(245, 166, 35, 0.9); }
/* top-left Home link: borderless, bold arrow that clearly reads as 'go home' */
a.homebtn { text-decoration: none; font-weight: 800; font-size: 1.1rem; color: #f5a623; white-space: nowrap; }
a.homebtn:hover { color: #ffce6b; text-shadow: 0 0 10px rgba(245, 166, 35, 0.55); }
/* 'Columns' picker trigger: plain bold + underlined text, no button outline/icon */
[data-testid="stPopover"] button {
    border: none !important; background: none !important; box-shadow: none !important;
    min-height: 0 !important; padding: 0.3rem 0 !important;
}
[data-testid="stPopover"] button p { font-weight: 800 !important; text-decoration: underline !important; }
/* ===== GLOBAL DESIGN SYSTEM — bring the marketing-site polish into the app ===== */
/* base typography: Inter everywhere (home hero/brand keep Orbitron via specificity) */
html, body, .stApp, .stApp p, .stApp li, .stApp span, .stApp label, .stApp input,
[data-testid="stMarkdownContainer"] { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
/* content headers -> editorial display face */
.stApp h1, .stApp h2, .stApp h3, .stApp h4 {
    font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 600;
    letter-spacing: -0.4px; color: #f4f6fb;
}
.stApp h1 { font-weight: 700; }
/* st.metric -> polished glass stat cards with mono numerals */
[data-testid="stMetric"] {
    background: linear-gradient(150deg, rgba(28,32,48,0.72), rgba(14,17,26,0.72));
    border: 1px solid rgba(255,255,255,0.08); border-top: 2px solid rgba(245,166,35,0.55);
    border-radius: 14px; padding: 0.85rem 1.05rem;
}
[data-testid="stMetricValue"] { font-family: 'DM Mono', monospace; color: #f5a623; font-weight: 500; }
[data-testid="stMetricLabel"], [data-testid="stMetricLabel"] p {
    color: #98a1b2 !important; letter-spacing: .5px; text-transform: uppercase; font-size: .72rem;
}
/* buttons -> subtle glass, accent lift on hover (popover stays borderless via its !important rule) */
.stButton > button {
    min-height: 3em; border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(150deg, rgba(28,32,48,0.55), rgba(14,17,26,0.55));
    color: #e9edf4; border-radius: 10px; font-weight: 600;
    transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
}
.stButton > button:hover {
    border-color: #f5a623; color: #fff; transform: translateY(-2px);
    box-shadow: 0 8px 20px -8px rgba(245,166,35,0.5);
}
/* dataframes/tables -> framed card */
[data-testid="stDataFrame"], [data-testid="stTable"] {
    border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden;
}
/* tabs -> accent the active tab */
.stTabs [data-baseweb="tab-list"] { border-bottom: 1px solid rgba(255,255,255,0.08); }
.stTabs [aria-selected="true"] p { color: #f5a623 !important; }
/* misc polish */
hr { border-color: rgba(255,255,255,0.08) !important; }
[data-testid="stCaptionContainer"] p { color: #8c93a3 !important; }
</style>
""", unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Cached data accessors (so reruns don't re-hit the warehouse needlessly)
# --------------------------------------------------------------------------
@st.cache_data(ttl=300)
def players(league=None):
    return data.list_players(league)

@st.cache_data(ttl=300)
def profile(name):
    return data.get_player(name)

@st.cache_data(ttl=300)
def seasons(name):
    return data.player_seasons(name)

@st.cache_data(ttl=300)
def games(name, season=None, last=None):
    return data.player_games(name, season, last)

@st.cache_data(ttl=300)
def board(stat, season, league, limit):
    return data.leaderboards(stat, season, league, limit)


def style_fig(fig, height=320):
    fig.update_layout(
        height=height, margin=dict(l=10, r=10, t=30, b=10),
        paper_bgcolor=PLOT_BG, plot_bgcolor=PLOT_BG,
        font_color="#fafafa", legend=dict(orientation="h", y=1.15),
    )
    fig.update_xaxes(gridcolor="#2a2e3a")
    fig.update_yaxes(gridcolor="#2a2e3a")
    return fig


def show_img(url, radius=8):
    """Render an image as raw HTML so it has NO Streamlit fullscreen/zoom button."""
    st.markdown(f'<img src="{url}" style="width:100%; border-radius:{radius}px">',
                unsafe_allow_html=True)


def _pct(v):
    return f"{v * 100:.1f}" if v is not None else "—"

def _one(v):
    """Round a stat to one decimal place for display (22.233 -> '22.2')."""
    return f"{v:.1f}" if v is not None else "—"

# Game-log display: fuse home/away + opponent + result into one column, show all stats.
LOG_RENAME = {
    "date": "Date", "matchup": "Opponent", "min": "MIN", "pts": "PTS", "reb": "REB",
    "ast": "AST", "stl": "STL", "blk": "BLK", "tov": "TOV", "fg": "FG", "fga": "FGA",
    "fg_pct": "FG%", "fg3": "3FG", "fg3a": "3FGA", "fg3_pct": "3FG%", "ft": "FT",
    "fta": "FTA", "ft_pct": "FT%", "gmsc": "GM Score", "plus_minus": "+/-",
}
LOG_ORDER = ["Date", "Opponent", "MIN", "PTS", "REB", "AST", "STL", "BLK", "TOV",
             "FG", "FGA", "FG%", "3FG", "3FGA", "3FG%", "FT", "FTA", "FT%", "GM Score", "+/-"]

def format_log(df):
    """'@UTA (W)' for away, 'VS PHX (L)' for home; renamed/ordered with every stat."""
    df = df.copy()
    df["matchup"] = [f"VS {o} ({r})" if h else f"@{o} ({r})"
                     for h, o, r in zip(df["home"], df["opponent"], df["result"])]
    df = df.rename(columns=LOG_RENAME)
    return df[[c for c in LOG_ORDER if c in df.columns]]

# Stat columns that the column-picker can toggle (Date + Opponent are always shown).
STAT_FILTER_COLS = [c for c in LOG_ORDER if c not in ("Date", "Opponent")]

def _trim_cols(fmt, stat_cols):
    if stat_cols is None:
        return fmt
    return fmt[["Date", "Opponent"] + [c for c in stat_cols if c in fmt.columns]]

def show_game_log(rows, stat_cols=None, by_month=True):
    """Render a game log (most recent first). by_month=True splits it into month sections;
    by_month=False shows one table. If stat_cols is given, only those stat columns show."""
    if not rows:
        st.caption("No games.")
        return
    df = pd.DataFrame(rows)
    df["_d"] = pd.to_datetime(df["date"])
    if not by_month:
        flat = df.sort_values("_d", ascending=False)
        st.dataframe(_trim_cols(format_log(flat), stat_cols), width="stretch", hide_index=True)
        return
    df["_month"] = df["_d"].dt.strftime("%B %Y")
    for month in df.sort_values("_d", ascending=False)["_month"].unique():
        sub = df[df["_month"] == month].sort_values("_d", ascending=False)
        st.markdown(f"**{month}**  ·  {len(sub)} games")
        st.dataframe(_trim_cols(format_log(sub), stat_cols), width="stretch", hide_index=True)

def stat_row(s, label):
    """Two rows of metric tiles covering every stat, for a career/season scope dict."""
    st.markdown(f"**{label} averages**" + (f"  ·  {s['games']} games" if s.get("games") else ""))
    r1 = st.columns(5)
    r1[0].metric("PTS", _one(s["pts"])); r1[1].metric("REB", _one(s["reb"])); r1[2].metric("AST", _one(s["ast"]))
    r1[3].metric("STL", _one(s["stl"])); r1[4].metric("BLK", _one(s["blk"]))
    r2 = st.columns(5)
    r2[0].metric("TOV", _one(s["tov"]))
    r2[1].metric("FG%", _pct(s["fg_pct"]))
    r2[2].metric("3FG%", _pct(s["fg3_pct"]))
    r2[3].metric("FT%", _pct(s["ft_pct"]))
    r2[4].metric("GM Score", _one(s["gmsc"]))


# --------------------------------------------------------------------------
# Navigation state + slim top bar (NO sidebar — the Home page is the hub)
# --------------------------------------------------------------------------
st.session_state.setdefault("player", None)   # open player profile (None = list/section)
st.session_state.setdefault("team", None)     # open team roster (None = team menu/section)
st.session_state.setdefault("nav", "🏠 Home")

# Deep-link to a player via ?player=Name.
if "player" in st.query_params:
    st.session_state["player"] = st.query_params["player"]
    del st.query_params["player"]

# Brand wordmark navigates to ?go=home.
if st.query_params.get("go") == "home":
    st.session_state.update(player=None, team=None, nav="🏠 Home")
    del st.query_params["go"]

# Home mode-card clicks navigate to ?nav=<slug>.
NAV_SLUGS = {"teams": "Teams", "compare": "Compare",
             "leaders": "Stat Leaderboards", "game": "🎮 82-0 Game"}
if "nav" in st.query_params:
    _target = NAV_SLUGS.get(st.query_params["nav"])
    if _target:
        st.session_state.update(nav=_target, player=None, team=None)
    del st.query_params["nav"]

def _clear_player():       # league switch resets the team/player drill-down
    st.session_state["player"] = None
    st.session_state["team"] = None

# Top bar: a Home button (only when you're away from home) + the global league switch.
_at_home = st.session_state["nav"] == "🏠 Home" and not st.session_state.get("player")
_tb_left, _tb_mid, _tb_right = st.columns([2, 5, 2])
with _tb_left:
    if not _at_home:
        st.markdown("<a class='homebtn' href='?go=home' target='_self'>← Home</a>",
                    unsafe_allow_html=True)
with _tb_right:
    lg = st.segmented_control("League", ["NBA", "WNBA"], default="NBA", key="league",
                              on_change=_clear_player, label_visibility="collapsed") or "NBA"

roster = players(lg)
names = [p["player"] for p in roster]


# --------------------------------------------------------------------------
# Views
# --------------------------------------------------------------------------
def view_roster():
    st.title(f"{lg} Roster")
    st.caption(f"Every tracked {lg} player — **click a player** to open their profile.")
    per_row = 5
    # Fresh columns per row so each row aligns to its own band (otherwise the
    # columns become independent vertical stacks and drift out of alignment).
    for start in range(0, len(roster), per_row):
        cols = st.columns(per_row)
        for col, p in zip(cols, roster[start:start + per_row]):
            with col:
                # Clickable headshot (HTML link -> ?player=). Raw <img> also avoids
                # Streamlit's fullscreen button entirely.
                if p["headshot_url"]:
                    href = f"?player={urllib.parse.quote(p['player'])}"
                    st.markdown(
                        f'<a class="pcard" href="{href}" target="_self">'
                        f'<img src="{p["headshot_url"]}" style="width:100%"></a>',
                        unsafe_allow_html=True,
                    )
                # Clickable name does the same. Uniform button height (CSS) keeps the grid aligned.
                if st.button(p["player"], key=f"open_{p['player']}",
                             type="tertiary", width="stretch"):
                    st.session_state["player"] = p["player"]
                    st.rerun()
                st.caption(f"{p['league']} · {p['first_season']}→{p['last_season']}  \n"
                           f"{p['games_played']:,} games")


def view_player_page(name):
    """A single player's page: hero + season-scoped stat header + Profile / By-Season tabs."""
    _back = f"← Back to {st.session_state['team']}" if st.session_state.get("team") else "← Back"
    if st.button(_back, type="tertiary"):
        st.session_state["player"] = None
        st.rerun()

    p = profile(name)
    sea_rows = seasons(name)
    season_opts = ["Career"] + [s["season"] for s in sea_rows][::-1]

    # hero: headshot + name + a season picker that drives the stat header below
    c1, c2 = st.columns([1, 3])
    with c1:
        if p["headshot_url"]:
            show_img(p["headshot_url"])
    with c2:
        st.title(p["player"])
        st.caption(f"{p['league']} · {p['first_season']} → {p['last_season']} · {p['games_played']:,} career games")
        scope = st.selectbox("Show stats for", season_opts, key=f"scope_{name}")

    if scope == "Career":
        stats = p["career"]
    else:
        match = [s for s in sea_rows if s["season"] == scope]
        stats = match[0] if match else p["career"]
    stat_row(stats, scope)

    st.divider()
    tab_profile, tab_season = st.tabs(["📊 Profile", "📅 By Season"])

    with tab_profile:
        trends = [("pts", ACCENT), ("reb", "#4aa3df"), ("ast", "#7ed957")]
        if len(sea_rows) >= 3:
            # enough seasons -> the season-by-season career arc
            st.subheader("Career trajectory")
            sea = pd.DataFrame(sea_rows)
            fig = go.Figure()
            for stat, color in trends:
                fig.add_trace(go.Scatter(x=sea["season"], y=sea[stat], mode="lines+markers",
                                         name=stat.upper(), line=dict(color=color, width=3)))
        else:
            # short career -> a game-by-game 10-game rolling average (form trend)
            st.subheader("Form · 10-game rolling average")
            g = pd.DataFrame(games(name)).sort_values("date")
            g["date"] = pd.to_datetime(g["date"])
            fig = go.Figure()
            for stat, color in trends:
                fig.add_trace(go.Scatter(x=g["date"], y=g[stat].rolling(10, min_periods=1).mean(),
                                         mode="lines", name=stat.upper(), line=dict(color=color, width=3)))
        st.plotly_chart(style_fig(fig), width="stretch")

        h1, h2, h3 = st.columns([6, 1.5, 1])
        h1.subheader("Recent games")
        # group-by-month toggle + a column picker (narrow cols so they sit close together)
        by_month = h2.toggle("Group by month", value=True, key="recent_bymonth")
        with h3.popover("Columns"):
            chosen = st.multiselect("Stats to show", STAT_FILTER_COLS,
                                    default=STAT_FILTER_COLS, key="recent_cols")
        show_game_log(games(name, last=25), chosen, by_month=by_month)

    with tab_season:
        st.subheader("Season averages")
        st.caption("**Click a season row** to open that year's game log.")
        sdf = pd.DataFrame(sea_rows)
        for _c in ("fg_pct", "fg3_pct", "ft_pct"):
            # coerce handles NULL %s (a season with 0 attempts) without crashing
            sdf[_c] = (pd.to_numeric(sdf[_c], errors="coerce") * 100).round(1)
        SEA_COLS = {"season": "Season", "games": "GP", "pts": "PTS", "reb": "REB", "ast": "AST",
                    "stl": "STL", "blk": "BLK", "tov": "TOV", "fg_pct": "FG%", "fg3_pct": "3FG%",
                    "ft_pct": "FT%", "gmsc": "GM Score"}
        sdf = sdf.rename(columns=SEA_COLS)[list(SEA_COLS.values())]
        sdf = sdf.sort_values("Season", ascending=False).reset_index(drop=True)
        event = st.dataframe(sdf, width="stretch", hide_index=True,
                             on_select="rerun", selection_mode="single-row", key=f"seasontbl_{name}")
        rows_sel = event.selection.rows
        if rows_sel:
            chosen = sdf.iloc[rows_sel[0]]["Season"]
            st.subheader(f"{chosen} game log")
            g = pd.DataFrame(games(name, season=chosen)).sort_values("date")
            fig = px.bar(g, x="date", y="pts", color="pts", color_continuous_scale="Oranges")
            st.plotly_chart(style_fig(fig), width="stretch")
            show_game_log(games(name, season=chosen))


def view_compare():
    st.title("Compare players")
    picks = st.multiselect("Pick 2–4 players", names,
                           default=names[:2] if len(names) >= 2 else names)
    if len(picks) < 2:
        st.info("Pick at least two players.")
        return
    rows = data.compare(picks)
    radar_stats = ["pts", "reb", "ast", "stl", "blk", "gmsc"]
    # normalize each stat by the max among the picked players -> relative profile
    maxes = {k: max(r["career"][k] or 0 for r in rows) or 1 for k in radar_stats}
    fig = go.Figure()
    for r in rows:
        vals = [(r["career"][k] or 0) / maxes[k] for k in radar_stats]
        fig.add_trace(go.Scatterpolar(r=vals + [vals[0]],
                                      theta=[s.upper() for s in radar_stats] + ["PTS"],
                                      fill="toself", name=r["player"]))
    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 1], showticklabels=False)))
    st.plotly_chart(style_fig(fig, height=420), width="stretch")

    tbl = pd.DataFrame([{"player": r["player"], **{k: r["career"][k] for k in radar_stats}} for r in rows])
    st.dataframe(tbl, width="stretch", hide_index=True)


def view_leaderboards():
    st.title("Stat Leaderboards")
    c1, c2, c3 = st.columns(3)
    stat = c1.selectbox("Stat", data.AVG_STATS, index=data.AVG_STATS.index("pts"))
    season = c2.selectbox("Season", ["Career"] + sorted({s["season"] for p in names for s in seasons(p)}, reverse=True))
    limit = c3.slider("Top N", 5, 27, 15)
    sea = None if season == "Career" else season
    rows = pd.DataFrame(board(stat, sea, lg, limit))
    fig = px.bar(rows[::-1], x=stat, y="player", orientation="h", color=stat,
                 color_continuous_scale="Oranges", text=stat)
    st.plotly_chart(style_fig(fig, height=30 * len(rows) + 80), width="stretch")
    st.dataframe(rows, width="stretch", hide_index=True)


def _g82_open_slots(lineup):
    return [s for s in game82.SLOTS if s not in lineup]

def _g82_eligible_open(player, lineup):
    """Open court slots this player can fill, in natural PG-SG-SF-PF-C order."""
    elig, openset = set(game82.eligibility(player["position"])), set(_g82_open_slots(lineup))
    return [s for s in game82.SLOTS if s in elig and s in openset]

def _g82_offer(pool, lineup, k=5):
    """A random set of undrafted players (NOT slot-filtered), guaranteeing at least one
    that still fits an open position so the round is always playable."""
    used = {p["player"] for p in lineup.values()}
    avail = [p for p in pool if p["player"] not in used]
    if not avail:
        return []
    fitting = [p for p in avail if _g82_eligible_open(p, lineup)]
    offer = [random.choice(fitting)] if fitting else []
    rest = [p for p in avail if p not in offer]
    offer += random.sample(rest, min(k - len(offer), len(rest)))
    random.shuffle(offer)
    return offer

def _g82_reset(pool):
    ss = st.session_state
    ss.g82_lineup = {}
    ss.g82_reskips = 1          # player-offer re-spins allowed
    ss.g82_pending = None       # player drafted, awaiting placement + season roll
    ss.g82_slot_choice = None   # chosen open slot for the pending player
    ss.g82_rolled = None        # the currently-rolled season for the pending player
    ss.g82_season_respins = 0   # season re-spins used THIS GAME (shared budget, max 2 total)
    ss.g82_seen_seasons = set() # seasons already rolled for the pending player (no repeats)
    ss.g82_eg_shown = False     # has the 23-and-Me easter egg popup been shown this game
    ss.g82_offer = _g82_offer(pool, {})


# Easter egg: LeBron + Bronny James in the same lineup -> +67 PRA + this popup.
EASTER_EGG_DUO = {"lebron james", "bronny james"}
EASTER_EGG_BONUS = 67

@st.dialog("🏀  🔥  🏀")
def _eg_dialog():
    st.markdown(
        "<div style='text-align:center; font-family:Orbitron,sans-serif; font-size:2.3rem; "
        "font-weight:900; color:#f5a623; text-shadow:0 0 18px rgba(245,166,35,.65); line-height:1.15;'>"
        "23 AND ME BONUS!!!!</div>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div style='text-align:center; font-size:1.05rem; margin-top:0.9rem;'>"
        "LeBron 👑 &amp; Bronny James in the same lineup<br>"
        f"<b>+{EASTER_EGG_BONUS} PRA</b> added to your team this round!</div>",
        unsafe_allow_html=True,
    )
    st.write("")
    if st.button("LET'S GO 🔥", width="stretch", type="primary"):
        st.rerun()


def view_game82():
    pool = data.game_pool(lg)
    ss = st.session_state
    if ss.get("g82_league") != lg or "g82_lineup" not in ss:
        ss.g82_league = lg
        _g82_reset(pool)
    for _k in ("g82_pending", "g82_slot_choice", "g82_rolled"):
        ss.setdefault(_k, None)
    ss.setdefault("g82_reskips", 1)
    ss.setdefault("g82_season_respins", 0)
    ss.setdefault("g82_seen_seasons", set())
    ss.setdefault("g82_eg_shown", False)

    # title + top-right "restart the whole game" button (works at any point)
    t1, t2 = st.columns([4, 1])
    t1.title("🏀 82-0: Vault Edition")
    if t2.button("🔄 Restart game", width="stretch", key="g82_restart"):
        _g82_reset(pool)
        st.rerun()
    st.caption(f"Draft any 5 **{lg}** players. Each can only fill positions they actually played — "
               "once those fill up, you can't pick them. Pick a player, **spin for a random season**, "
               "then use the **→ buttons** under him to move him to another open position he can play. "
               "Record = total **PRA** across your lineup.")

    SLOTS = game82.SLOTS
    lineup = ss.g82_lineup
    open_slots = _g82_open_slots(lineup)

    # 23-and-Me easter egg: fire the moment BOTH LeBron & Bronny are in the squad,
    # not at the end of the draft.
    if not ss.g82_eg_shown and EASTER_EGG_DUO <= {v["player"].lower() for v in lineup.values()}:
        ss.g82_eg_shown = True
        _eg_dialog()

    # current lineup strip (shows the rolled season under each filled slot)
    strip = st.columns(5)
    for i, slot in enumerate(SLOTS):
        with strip[i]:
            st.markdown(f"**{slot}**")
            p = lineup.get(slot)
            if p:
                if p.get("headshot_url"):
                    show_img(p["headshot_url"])
                st.caption(f"{p['player']}  \n{p['season']}")
                # click-to-move: relocate to another OPEN slot this player can play
                targets = [s for s in SLOTS if s != slot and s in open_slots
                           and s in game82.eligibility(p.get("position", ""))]
                for t in targets:
                    if st.button(f"→ {t}", key=f"move_{slot}_{t}", width="stretch"):
                        ss.g82_lineup[t] = ss.g82_lineup.pop(slot)
                        st.rerun()
            else:
                st.caption("open")
    st.divider()

    # ---- RESULTS phase (all 5 slots filled) ----
    if not open_slots:
        names_lower = {lineup[s]["player"].lower() for s in SLOTS}
        bonus = EASTER_EGG_BONUS if EASTER_EGG_DUO <= names_lower else 0
        result = game82.simulate([lineup[s] for s in SLOTS], bonus=bonus)
        st.subheader("Season simulated")
        big = st.columns([1, 1, 2])
        big[0].metric("Projected record", f"{result['wins']}–{result['losses']}")
        big[1].metric("Team PRA", result["team_pra"],
                      delta=f"+{bonus} · 23 and Me" if bonus else None)
        with big[2]:
            st.markdown(f"### {result['tier']}")
            if result["comparison"]:
                st.caption(f"≈ {result['comparison']}")
        rows = [{"label": f"{slot} · {lineup[slot]['player']} ({lineup[slot]['season']})",
                 "pra": round((lineup[slot]["pts"] or 0) + (lineup[slot]["reb"] or 0)
                              + (lineup[slot]["ast"] or 0), 1)} for slot in SLOTS]
        cdf = pd.DataFrame(rows)
        fig = px.bar(cdf.iloc[::-1], x="pra", y="label", orientation="h", color="pra",
                     color_continuous_scale="Oranges", text="pra")
        fig.update_layout(yaxis_title=None, xaxis_title="PRA (pts + reb + ast)")
        st.plotly_chart(style_fig(fig), width="stretch")
        st.caption("Each player's PRA is from the **season you spun**. Use Restart to gamble again.")
        return

    # ---- SEASON-SPIN phase (player picked AND slot chosen) ----
    if ss.g82_pending and ss.g82_slot_choice:
        pend, slot = ss.g82_pending, ss.g82_slot_choice
        st.subheader(f"🎰 Spin a season for **{pend['player']}**  →  **{slot}**")
        sea_list = seasons(pend["player"])
        if st.button("↩ Pick someone else"):
            ss.g82_pending = ss.g82_slot_choice = ss.g82_rolled = None
            st.rerun()
        if ss.g82_rolled is None:
            st.caption(f"{pend['player']} has **{len(sea_list)}** seasons — hit spin to roll one.")
            if st.button("🎰 Spin for season", type="primary"):
                pick = random.choice(sea_list)
                ss.g82_rolled = pick
                ss.g82_seen_seasons = {pick["season"]}
                st.rerun()
        else:
            r = ss.g82_rolled
            pra = (r["pts"] or 0) + (r["reb"] or 0) + (r["ast"] or 0)
            st.markdown(f"### {r['season']} season")
            st.markdown(f"**{r['pts']} pts · {r['reb']} reb · {r['ast']} ast**  →  PRA **{pra:.1f}**")
            b1, b2 = st.columns(2)
            if b1.button("✅ Lock in this season", type="primary"):
                ss.g82_lineup[slot] = {"player": pend["player"], "season": r["season"],
                                       "headshot_url": pend["headshot_url"], "position": pend.get("position", ""),
                                       "pts": r["pts"], "reb": r["reb"], "ast": r["ast"]}
                ss.g82_pending = ss.g82_slot_choice = ss.g82_rolled = None
                ss.g82_offer = _g82_offer(pool, ss.g82_lineup)
                st.rerun()
            # only seasons NOT already rolled this player are eligible to re-spin into
            unseen = [s for s in sea_list if s["season"] not in ss.g82_seen_seasons]
            if b2.button(f"🎲 Spin again ({2 - ss.g82_season_respins} left)",
                         disabled=ss.g82_season_respins >= 2 or not unseen):
                pick = random.choice(unseen)
                ss.g82_rolled = pick
                ss.g82_seen_seasons.add(pick["season"])
                ss.g82_season_respins += 1
                st.rerun()
        return

    # ---- OFFER phase (random players; pick one that fits an open spot) ----
    st.subheader(f"Pick a player  ·  {len(lineup)}/5 filled  ·  open: {'/'.join(open_slots)}")
    if st.button(f"🎲 Re-spin players ({ss.g82_reskips} left)", disabled=ss.g82_reskips <= 0):
        ss.g82_offer = _g82_offer(pool, lineup)
        ss.g82_reskips -= 1
        st.rerun()

    offer = ss.g82_offer
    if not offer:
        st.warning("No players left.")
        return
    for col, p in zip(st.columns(len(offer)), offer):
        with col:
            if p["headshot_url"]:
                show_img(p["headshot_url"])
            st.markdown(
                f"<div style='font-weight:700; line-height:1.25; min-height:2.5em; "
                f"display:flex; align-items:flex-start'>{p['player']}</div>",
                unsafe_allow_html=True,
            )
            plays = "/".join(sorted(game82.eligibility(p["position"])))
            peak_pra = (p["pts"] or 0) + (p["reb"] or 0) + (p["ast"] or 0)
            st.caption(f"Plays: {plays}  \ncareer-best {peak_pra:.0f} PRA")
            elig_open = _g82_eligible_open(p, lineup)
            if elig_open:
                if st.button(f"Draft → {'/'.join(elig_open)}", key=f"draft_{p['player']}", width="stretch"):
                    ss.g82_pending = p
                    ss.g82_rolled = None
                    ss.g82_seen_seasons = set()         # per-player no-repeat tracker (re-spins are game-wide)
                    ss.g82_slot_choice = elig_open[0]   # auto-drop into first eligible; move it later
                    st.rerun()
            else:
                st.button("✗ no open spot", key=f"draft_{p['player']}", width="stretch", disabled=True)
    return


def _did_you_know(league):
    """A random standout fact pulled live from the league's data."""
    pool = data.game_pool(league)
    if not pool:
        return "Add some players to get started!"
    kind = random.choice(["peak", "pra", "pts"])
    if kind == "pra":
        p = max(pool, key=lambda x: x["pts"] + x["reb"] + x["ast"])
        return f"**{p['player']}** has the Vault's highest peak PRA — {p['pts'] + p['reb'] + p['ast']:.0f} ({p['peak_season']})."
    if kind == "pts":
        p = max(pool, key=lambda x: x["pts"])
        return f"**{p['player']}** owns the Vault's top scoring peak — {p['pts']} PPG in {p['peak_season']}."
    p = random.choice(pool)
    pra = p["pts"] + p["reb"] + p["ast"]
    return f"**{p['player']}**'s best season ({p['peak_season']}) averaged {p['pts']}/{p['reb']}/{p['ast']} — {pra:.0f} PRA."


def view_home():
    s = data.summary()
    teams = sum(1 for L in ("NBA", "WNBA")
                for t in data.team_list(L) if t["team"] != "Free Agents")
    # ---- immersive hero ----
    st.markdown(
        "<div class='hero'>"
        "<div class='htitle'>NBA PLAYER VAULT</div>"
        "<div class='htag'>Every career. Every season. Build the team that never loses.</div>"
        "<div class='hsub'>An interactive vault of <b>NBA &amp; WNBA</b> careers built on full "
        "game-by-game stats — explore player profiles, compare stars head-to-head, climb the "
        "leaderboards, and chase a perfect <b>82-0</b> season.</div>"
        "<div class='statstrip'>"
        f"<div><div class='snum'>{s['players']:,}</div><div class='slbl'>Players</div></div>"
        f"<div><div class='snum'>{s['games']:,}</div><div class='slbl'>Games</div></div>"
        f"<div><div class='snum'>{teams}</div><div class='slbl'>Teams</div></div>"
        f"<div><div class='snum'>{s['leagues']}</div><div class='slbl'>Leagues</div></div>"
        "</div>"
        "<div class='scrollcue'>↓ explore the vault</div>"
        "</div>",
        unsafe_allow_html=True,
    )
    # ---- the four modes as glass feature cards ----
    cards = [
        ("teams", "📋", "Players",
         "Browse every team's roster and dive into any player's full career — "
         "season-by-season splits, game logs and shooting trends.", "#4aa3df"),
        ("compare", "⚖️", "Compare",
         "Put any two stars head-to-head and see who takes each stat across "
         "their careers.", "#a06cd5"),
        ("leaders", "🏆", "Leaderboards",
         "Climb the single-season and all-time rankings — points, assists, "
         "efficiency and more.", "#f5c518"),
        ("game", "🎮", "82-0 Game",
         "Draft a starting five from the vault and chase the perfect, "
         "undefeated 82-0 season.", "#f5623c"),
    ]
    html = "<div class='feature-grid'>"
    for slug, icon, title, desc, accent in cards:
        html += (f"<a class='feature' href='?nav={slug}' target='_self' style='--accent:{accent}'>"
                 f"<div class='ficon'>{icon}</div>"
                 f"<div class='ftitle'>{title}</div>"
                 f"<div class='fdesc'>{desc}</div>"
                 f"<div class='fcta'>Enter →</div></a>")
    html += "</div>"
    st.markdown(html, unsafe_allow_html=True)

    # ---- a fact at the bottom to reward the scroll ----
    st.info(f"💡 **Did you know?**  {_did_you_know(lg)}")


def view_teams():
    st.title(f"{lg} Teams")
    st.caption("Pick a team to see its players.")
    tl = data.team_list(lg)
    if not tl:
        st.info("No teams yet for this league.")
        return
    per_row = 3
    for i in range(0, len(tl), per_row):
        cols = st.columns(per_row)
        for col, t in zip(cols, tl[i:i + per_row]):
            if col.button(f"{t['team']}  ·  {t['count']}", key=f"team_{t['team']}", width="stretch"):
                st.session_state["team"] = t["team"]
                st.session_state["player"] = None
                st.rerun()


def view_team_roster(team):
    if st.button("← All teams", type="tertiary"):
        st.session_state["team"] = None
        st.rerun()
    st.title(team)
    players_on = data.team_players(lg, team)   # sorted by career PPG, highest first
    st.caption(f"{len(players_on)} players, ranked by career PPG — click a player for the full profile.")
    # Bordered chips in a grid, filling left-to-right, top-to-bottom in descending-PPG order.
    chips = "".join(
        f"<a class='pchip' href='?player={urllib.parse.quote(p['player'])}' target='_self'>{p['player']}</a>"
        for p in players_on
    )
    st.markdown(f"<div class='pgrid'>{chips}</div>", unsafe_allow_html=True)


VIEWS = {
    "🏠 Home": view_home,
    "Teams": view_teams,
    "Compare": view_compare,
    "Stat Leaderboards": view_leaderboards,
    "🎮 82-0 Game": view_game82,
}

# Precedence: an open player profile > an open team roster > the section view.
if st.session_state.get("player"):
    view_player_page(st.session_state["player"])
elif st.session_state.get("team"):
    view_team_roster(st.session_state["team"])
else:
    VIEWS[st.session_state["nav"]]()
