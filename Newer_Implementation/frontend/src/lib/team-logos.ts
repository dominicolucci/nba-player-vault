/**
 * team-logos.ts — official NBA/WNBA team logos from the league CDNs.
 *
 * Keyed by the exact team name returned by the API (which mirrors teams.json).
 * Name (not abbreviation) is the key on purpose: "Indiana Fever" and "Indiana
 * Pacers" share the abbr "IND" but are different franchises.
 *
 * Every URL below was verified to resolve (HTTP 200). `cdn.nba.com` and
 * `cdn.wnba.com` are already whitelisted in next.config.ts.
 */

type LogoRef = { league: "nba" | "wnba"; id: number };

const TEAM_LOGOS: Record<string, LogoRef> = {
  // NBA
  "Atlanta Hawks": { league: "nba", id: 1610612737 },
  "Boston Celtics": { league: "nba", id: 1610612738 },
  "Brooklyn Nets": { league: "nba", id: 1610612751 },
  "Charlotte Hornets": { league: "nba", id: 1610612766 },
  "Chicago Bulls": { league: "nba", id: 1610612741 },
  "Cleveland Cavaliers": { league: "nba", id: 1610612739 },
  "Dallas Mavericks": { league: "nba", id: 1610612742 },
  "Denver Nuggets": { league: "nba", id: 1610612743 },
  "Detroit Pistons": { league: "nba", id: 1610612765 },
  "Golden State Warriors": { league: "nba", id: 1610612744 },
  "Houston Rockets": { league: "nba", id: 1610612745 },
  "Indiana Pacers": { league: "nba", id: 1610612754 },
  "LA Clippers": { league: "nba", id: 1610612746 },
  "Los Angeles Clippers": { league: "nba", id: 1610612746 },
  "Los Angeles Lakers": { league: "nba", id: 1610612747 },
  "Memphis Grizzlies": { league: "nba", id: 1610612763 },
  "Miami Heat": { league: "nba", id: 1610612748 },
  "Milwaukee Bucks": { league: "nba", id: 1610612749 },
  "Minnesota Timberwolves": { league: "nba", id: 1610612750 },
  "New Orleans Pelicans": { league: "nba", id: 1610612740 },
  "New York Knicks": { league: "nba", id: 1610612752 },
  "Oklahoma City Thunder": { league: "nba", id: 1610612760 },
  "Orlando Magic": { league: "nba", id: 1610612753 },
  "Philadelphia 76ers": { league: "nba", id: 1610612755 },
  "Phoenix Suns": { league: "nba", id: 1610612756 },
  "Portland Trail Blazers": { league: "nba", id: 1610612757 },
  "Sacramento Kings": { league: "nba", id: 1610612758 },
  "San Antonio Spurs": { league: "nba", id: 1610612759 },
  "Toronto Raptors": { league: "nba", id: 1610612761 },
  "Utah Jazz": { league: "nba", id: 1610612762 },
  "Washington Wizards": { league: "nba", id: 1610612764 },
  // WNBA
  "Atlanta Dream": { league: "wnba", id: 1611661330 },
  "Chicago Sky": { league: "wnba", id: 1611661329 },
  "Connecticut Sun": { league: "wnba", id: 1611661323 },
  "Dallas Wings": { league: "wnba", id: 1611661321 },
  "Indiana Fever": { league: "wnba", id: 1611661325 },
  "Las Vegas Aces": { league: "wnba", id: 1611661319 },
  "Los Angeles Sparks": { league: "wnba", id: 1611661320 },
  "Minnesota Lynx": { league: "wnba", id: 1611661324 },
  "New York Liberty": { league: "wnba", id: 1611661313 },
  "Phoenix Mercury": { league: "wnba", id: 1611661317 },
  "Seattle Storm": { league: "wnba", id: 1611661328 },
  "Washington Mystics": { league: "wnba", id: 1611661322 },
};

/** Official logo URL for a team, or null (e.g. "Free Agents" / unknown). */
export function teamLogoUrl(team: string): string | null {
  const ref = TEAM_LOGOS[team];
  if (!ref) return null;
  return `https://cdn.${ref.league}.com/logos/${ref.league}/${ref.id}/global/L/logo.svg`;
}
