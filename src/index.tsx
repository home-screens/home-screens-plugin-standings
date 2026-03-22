import React from 'react';
import type { PluginComponentProps, PluginConfigSectionProps } from './hs-plugin';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLUGIN_ID = 'standings';

/** ESPN sport paths keyed by league identifier */
const LEAGUE_MAP: Record<string, string> = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  wnba: 'basketball/wnba',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
  mls: 'soccer/usa.1',
  epl: 'soccer/eng.1',
  laliga: 'soccer/esp.1',
  bundesliga: 'soccer/ger.1',
  seriea: 'soccer/ita.1',
  ligue1: 'soccer/fra.1',
  liga_mx: 'soccer/mex.1',
};

/** Static division → team abbreviation mappings for leagues where ESPN
 *  doesn't provide division-level groupings natively */
const DIVISION_MAP: Record<string, Record<string, string[]>> = {
  nfl: {
    'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC West': ['DEN', 'KC', 'LAC', 'LV'],
    'NFC East': ['DAL', 'NYG', 'PHI', 'WSH'],
    'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC West': ['ARI', 'LAR', 'SEA', 'SF'],
  },
  nba: {
    'Atlantic': ['BOS', 'BKN', 'NY', 'PHI', 'TOR'],
    'Central': ['CHI', 'CLE', 'DET', 'IND', 'MIL'],
    'Southeast': ['ATL', 'CHA', 'MIA', 'ORL', 'WSH'],
    'Northwest': ['DEN', 'MIN', 'OKC', 'POR', 'UTAH'],
    'Pacific': ['GS', 'LAC', 'LAL', 'PHX', 'SAC'],
    'Southwest': ['DAL', 'HOU', 'MEM', 'NO', 'SA'],
  },
  mlb: {
    'AL East': ['BAL', 'BOS', 'NYY', 'TB', 'TOR'],
    'AL Central': ['CHW', 'CLE', 'DET', 'KC', 'MIN'],
    'AL West': ['HOU', 'LAA', 'ATH', 'SEA', 'TEX'],
    'NL East': ['ATL', 'MIA', 'NYM', 'PHI', 'WSH'],
    'NL Central': ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
    'NL West': ['ARI', 'COL', 'LAD', 'SD', 'SF'],
  },
  nhl: {
    'Atlantic': ['BOS', 'BUF', 'DET', 'FLA', 'MTL', 'OTT', 'TB', 'TOR'],
    'Metropolitan': ['CAR', 'CBJ', 'NJ', 'NYI', 'NYR', 'PHI', 'PIT', 'WSH'],
    'Central': ['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG', 'UTA'],
    'Pacific': ['ANA', 'CGY', 'EDM', 'LA', 'SEA', 'SJ', 'VAN', 'VGK'],
  },
};

const SOCCER_LEAGUES = new Set(['mls', 'epl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'liga_mx']);

// ─── Types ───────────────────────────────────────────────────────────────────

interface StandingsEntry {
  rank: number;
  team: string;
  teamAbbr: string;
  teamShort: string;
  teamLogo: string;
  teamColor: string;
  wins: number;
  losses: number;
  ties?: number;
  otLosses?: number;
  draws?: number;
  points?: number;
  winPct: number;
  gamesBack?: number;
  streak?: string;
  clincher?: string;
  playoffSeed?: number;
  gamesPlayed?: number;
  last10?: string;
  pointsFor?: number;
  pointsAgainst?: number;
  differential?: number;
  homeRecord?: string;
  awayRecord?: string;
  divRecord?: string;
  goalDiff?: number;
}

interface StandingsGroup {
  name: string;
  league: string;
  entries: StandingsEntry[];
}

type StandingsView = 'table' | 'compact' | 'conference';
type StandingsGrouping = 'division' | 'conference' | 'league';

// ─── ESPN Data Parsing ───────────────────────────────────────────────────────
// Ported from the built-in server-side API route to run client-side.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function getStat(stats: AnyRecord[], name: string): string | number | undefined {
  const stat = stats.find((s) => s.name === name || s.abbreviation === name);
  return (stat?.displayValue as string | undefined) ?? (stat?.value as number | undefined);
}

function getStatNum(stats: AnyRecord[], name: string): number | undefined {
  const stat = stats.find((s) => s.name === name || s.abbreviation === name);
  if (stat?.value !== undefined) return Number(stat.value);
  if (stat?.displayValue !== undefined) return Number(stat.displayValue);
  return undefined;
}

type StatMapping = {
  num?: Partial<Record<keyof StandingsEntry, string[]>>;
  str?: Partial<Record<keyof StandingsEntry, string[]>>;
  postProcess?: (result: StandingsEntry) => void;
};

const LEAGUE_STAT_MAP: Record<string, StatMapping> = {
  nfl: {
    num: { ties: ['ties'], pointsFor: ['pointsFor'], pointsAgainst: ['pointsAgainst'], differential: ['pointDifferential', 'pointsDiff'] },
    str: { streak: ['streak'], divRecord: ['divisionRecord'] },
  },
  nhl: {
    num: { otLosses: ['otLosses', 'overtimeLosses'], points: ['points'], gamesPlayed: ['gamesPlayed'], differential: ['pointDifferential', 'pointsDiff'] },
    str: { streak: ['streak'], homeRecord: ['homeRecord', 'Home'], awayRecord: ['awayRecord', 'Road', 'Away'], last10: ['Last Ten Games', 'last10Record'] },
  },
  soccer: {
    num: { draws: ['ties', 'draws'], points: ['points'], gamesPlayed: ['gamesPlayed'], pointsFor: ['pointsFor'], pointsAgainst: ['pointsAgainst'], goalDiff: ['pointDifferential', 'pointsDiff'] },
    postProcess: (result) => {
      if (result.points !== undefined && result.gamesPlayed) {
        result.winPct = result.points / (result.gamesPlayed * 3);
      }
    },
  },
  _default: {
    num: { gamesBack: ['gamesBehind'], differential: ['pointDifferential', 'pointsDiff'], pointsFor: ['pointsFor'], pointsAgainst: ['pointsAgainst'] },
    str: { streak: ['streak'], last10: ['Last Ten Games', 'last10Record'], homeRecord: ['homeRecord', 'Home'], awayRecord: ['awayRecord', 'Road', 'Away'] },
  },
};

function sortAndRank(entries: StandingsEntry[]): void {
  entries.sort((a, b) => {
    if (a.points !== undefined && b.points !== undefined && a.points !== b.points) return b.points - a.points;
    if (a.winPct !== b.winPct) return b.winPct - a.winPct;
    return b.wins - a.wins;
  });
  entries.forEach((e, i) => { e.rank = i + 1; });
}

function sortStandingsEntries(entries: AnyRecord[]): AnyRecord[] {
  return [...entries].sort((a, b) => {
    const statsA = (a.stats as AnyRecord[]) ?? [];
    const statsB = (b.stats as AnyRecord[]) ?? [];
    const seedA = getStatNum(statsA, 'playoffSeed') ?? 999;
    const seedB = getStatNum(statsB, 'playoffSeed') ?? 999;
    if (seedA !== seedB) return seedA - seedB;
    const ptsA = getStatNum(statsA, 'points') ?? 0;
    const ptsB = getStatNum(statsB, 'points') ?? 0;
    if (ptsA !== ptsB) return ptsB - ptsA;
    const winsA = getStatNum(statsA, 'wins') ?? 0;
    const winsB = getStatNum(statsB, 'wins') ?? 0;
    return winsB - winsA;
  });
}

function parseEntry(entry: AnyRecord, rank: number, league: string): StandingsEntry {
  const team = entry.team as AnyRecord | undefined;
  const stats = (entry.stats as AnyRecord[]) ?? [];
  const logos = (team?.logos as AnyRecord[]) ?? [];
  const logo = (logos[0]?.href as string) ?? '';
  const leagueKey = league.toLowerCase();

  const wins = getStatNum(stats, 'wins') ?? 0;
  const losses = getStatNum(stats, 'losses') ?? 0;
  const clincher = getStat(stats, 'clincher') as string | undefined;
  const playoffSeed = getStatNum(stats, 'playoffSeed');

  const result: StandingsEntry = {
    rank,
    team: (team?.displayName as string) ?? 'Unknown',
    teamAbbr: (team?.abbreviation as string) ?? '???',
    teamShort: (team?.shortDisplayName as string) ?? (team?.name as string) ?? '',
    teamLogo: logo,
    teamColor: (team?.color as string) ?? '666666',
    wins,
    losses,
    winPct: getStatNum(stats, 'winPercent') ?? getStatNum(stats, 'winPct') ?? (wins + losses > 0 ? wins / (wins + losses) : 0),
    clincher: clincher && clincher !== '' ? clincher : undefined,
    playoffSeed,
  };

  const mappingKey = SOCCER_LEAGUES.has(leagueKey) ? 'soccer' : leagueKey;
  const mapping = LEAGUE_STAT_MAP[mappingKey] ?? LEAGUE_STAT_MAP._default;

  if (mapping.num) {
    for (const [field, statNames] of Object.entries(mapping.num)) {
      for (const name of statNames!) {
        const val = getStatNum(stats, name);
        if (val !== undefined) {
          (result as unknown as Record<string, unknown>)[field] = val;
          break;
        }
      }
    }
  }

  if (mapping.str) {
    for (const [field, statNames] of Object.entries(mapping.str)) {
      for (const name of statNames!) {
        const val = getStat(stats, name) as string | undefined;
        if (val !== undefined) {
          (result as unknown as Record<string, unknown>)[field] = val;
          break;
        }
      }
    }
  }

  mapping.postProcess?.(result);
  return result;
}

function parseStandings(data: AnyRecord, league: string): StandingsGroup[] {
  const groups: StandingsGroup[] = [];
  const leagueUpper = league.toUpperCase();
  const children = data.children as AnyRecord[] | undefined;

  if (!children || children.length === 0) {
    const standings = data.standings as AnyRecord | undefined;
    const entries = (standings?.entries as AnyRecord[]) ?? [];
    if (entries.length > 0) {
      const sorted = sortStandingsEntries(entries);
      groups.push({
        name: (data.name as string) ?? leagueUpper,
        league: leagueUpper,
        entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
      });
    }
    return groups;
  }

  for (const conf of children) {
    const confName = (conf.name as string) ?? 'Conference';
    const confChildren = conf.children as AnyRecord[] | undefined;

    if (confChildren && confChildren.length > 0) {
      for (const div of confChildren) {
        const divName = (div.name as string) ?? 'Division';
        const standings = div.standings as AnyRecord | undefined;
        const entries = (standings?.entries as AnyRecord[]) ?? [];
        const sorted = sortStandingsEntries(entries);
        groups.push({
          name: divName,
          league: leagueUpper,
          entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
        });
      }
    } else {
      const standings = conf.standings as AnyRecord | undefined;
      const entries = (standings?.entries as AnyRecord[]) ?? [];
      const sorted = sortStandingsEntries(entries);
      groups.push({
        name: confName,
        league: leagueUpper,
        entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
      });
    }
  }

  return groups;
}

function groupByConference(groups: StandingsGroup[], data: AnyRecord, league: string): StandingsGroup[] {
  const confMap = new Map<string, StandingsGroup>();
  const children = data.children as AnyRecord[] | undefined;

  if (children && children.length > 0) {
    for (const conf of children) {
      const confName = (conf.name as string) ?? 'Conference';
      const confChildren = conf.children as AnyRecord[] | undefined;

      if (confChildren && confChildren.length > 0) {
        const allEntries: StandingsEntry[] = [];
        for (const div of confChildren) {
          const standings = div.standings as AnyRecord | undefined;
          const entries = (standings?.entries as AnyRecord[]) ?? [];
          allEntries.push(...entries.map((e, i) => parseEntry(e, i + 1, league)));
        }
        sortAndRank(allEntries);
        confMap.set(confName, { name: confName, league: league.toUpperCase(), entries: allEntries });
      } else {
        const existing = groups.find((g) => g.name === confName);
        if (existing) confMap.set(confName, existing);
      }
    }
    return Array.from(confMap.values());
  }

  return groups;
}

function groupByLeague(groups: StandingsGroup[], league: string): StandingsGroup[] {
  const allEntries = groups.flatMap((g) => g.entries);
  sortAndRank(allEntries);
  return [{ name: league.toUpperCase(), league: league.toUpperCase(), entries: allEntries }];
}

function groupByDivision(groups: StandingsGroup[], league: string): StandingsGroup[] {
  const divMap = DIVISION_MAP[league.toLowerCase()];
  if (!divMap) return groups;

  const allEntries = groups.flatMap((g) => g.entries);
  const divGroups: StandingsGroup[] = [];
  for (const [divName, teamAbbrs] of Object.entries(divMap)) {
    const divEntries = allEntries.filter((e) => teamAbbrs.includes(e.teamAbbr));
    sortAndRank(divEntries);
    if (divEntries.length > 0) {
      divGroups.push({ name: divName, league: league.toUpperCase(), entries: divEntries });
    }
  }

  return divGroups.length > 0 ? divGroups : groups;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

/** Fetch standings + team colors from ESPN via the plugin proxy, parse client-side */
function useStandingsData(
  league: string,
  grouping: StandingsGrouping,
  refreshIntervalMs: number,
): [StandingsGroup[] | null, string | null] {
  const [groups, setGroups] = React.useState<StandingsGroup[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const path = LEAGUE_MAP[league.toLowerCase()];
      if (!path) {
        setError(`Unknown league: ${league}`);
        return;
      }

      try {
        // Fetch standings and team colors in parallel via pluginFetch
        const [standingsRes, colorsRes] = await Promise.all([
          window.__HS_SDK__.pluginFetch(PLUGIN_ID, {
            url: `https://site.api.espn.com/apis/v2/sports/${path}/standings`,
            cacheTtlMs: 300_000,
          }),
          window.__HS_SDK__.pluginFetch(PLUGIN_ID, {
            url: `https://site.api.espn.com/apis/site/v2/sports/${path}/teams`,
            cacheTtlMs: 3_600_000,
          }),
        ]);

        if (cancelled) return;

        if (!standingsRes.ok) {
          setError(`ESPN API error: ${standingsRes.status}`);
          window.__HS_SDK__.emit({ type: 'log', level: 'error', message: `Standings fetch failed: ${standingsRes.status}` });
          return;
        }

        const data = await standingsRes.json();

        // Parse team colors
        const colorMap = new Map<string, string>();
        if (colorsRes.ok) {
          try {
            const colorsData = await colorsRes.json();
            const teams = colorsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];
            for (const t of teams) {
              const tm = t.team ?? t;
              if (tm.abbreviation && tm.color) {
                colorMap.set(tm.abbreviation as string, tm.color as string);
              }
            }
          } catch {
            // Colors are optional — continue without them
          }
        }

        // Parse standings
        let allGroups = parseStandings(data, league);

        // Apply grouping
        if (grouping === 'conference') {
          allGroups = groupByConference(allGroups, data, league);
        } else if (grouping === 'league') {
          allGroups = groupByLeague(allGroups, league);
        } else if (grouping === 'division') {
          allGroups = groupByDivision(allGroups, league);
        }

        // Merge team colors
        if (colorMap.size > 0) {
          for (const group of allGroups) {
            for (const entry of group.entries) {
              const color = colorMap.get(entry.teamAbbr);
              if (color) entry.teamColor = color;
            }
          }
        }

        if (!cancelled) {
          setGroups(allGroups);
          setError(null);

          // Cache the parsed result for fast re-renders
          window.__HS_SDK__.displayCache.set(
            `standings:${league}:${grouping}`,
            allGroups,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to fetch standings');
          window.__HS_SDK__.emit({
            type: 'log',
            level: 'error',
            message: `Standings error: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    // Check displayCache for instant render
    const cached = window.__HS_SDK__.displayCache.get(
      `standings:${league}:${grouping}`,
    ) as StandingsGroup[] | undefined;
    if (cached) {
      setGroups(cached);
      setError(null);
    }

    fetchData();
    const interval = setInterval(fetchData, refreshIntervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [league, grouping, refreshIntervalMs]);

  return [groups, error];
}

// ─── Hook: useRotatingIndex ──────────────────────────────────────────────────

function useRotatingIndex(itemCount: number, intervalMs: number): number {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
    if (itemCount <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % itemCount);
    }, intervalMs);
    return () => clearInterval(id);
  }, [itemCount, intervalMs]);

  return index;
}

// ─── Shared Utilities ────────────────────────────────────────────────────────

function isSoccer(league: string): boolean {
  return SOCCER_LEAGUES.has(league.toLowerCase());
}

function formatRecord(entry: StandingsEntry, league: string): string {
  const l = league.toLowerCase();
  if (l === 'nhl') {
    return `${entry.wins}-${entry.losses}${entry.otLosses ? `-${entry.otLosses}` : ''}`;
  }
  if (isSoccer(l)) {
    return `${entry.wins}-${entry.draws ?? 0}-${entry.losses}`;
  }
  if (l === 'nfl') {
    return entry.ties ? `${entry.wins}-${entry.losses}-${entry.ties}` : `${entry.wins}-${entry.losses}`;
  }
  return `${entry.wins}-${entry.losses}`;
}

function getPlayoffTeamCount(league: string, grouping: StandingsGrouping = 'conference'): number {
  const l = league.toLowerCase();
  const perConf = (() => {
    switch (l) {
      case 'nfl': return 7;
      case 'nba': return 10;
      case 'wnba': return 8;
      case 'mlb': return 6;
      case 'nhl': return 8;
      default: return 0;
    }
  })();
  const twoConference = ['nfl', 'nba', 'mlb', 'nhl'];
  if (grouping === 'league' && twoConference.includes(l)) return perConf * 2;
  return perConf;
}

/** Convert a hex opacity byte (0-255) to a 2-char hex string */
function hexOpacity(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

// ─── Shared Components ──────────────────────────────────────────────────────

const S = {
  // Since plugins can't use Tailwind, all styles are inline objects
  flexCol: { display: 'flex', flexDirection: 'column' as const, height: '100%' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 8px 6px', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  leagueLabel: {
    fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)', fontSize: '0.65em',
  },
  groupLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: '0.75em' },
  dot: (active: boolean) => ({
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
    transition: 'background-color 0.2s',
  }),
  dotsWrap: { display: 'flex', gap: 4 },
  dotsText: { color: 'rgba(255,255,255,0.3)', fontSize: '0.6em', fontVariantNumeric: 'tabular-nums' },
  overflow: { flex: 1, overflow: 'hidden' },
  row: (showCutoff: boolean, borderColor: string, borderWidth: number) => ({
    position: 'relative' as const,
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px',
    borderLeft: `${borderWidth}px solid #${borderColor}`,
    borderBottom: showCutoff ? '1px dashed rgba(255,255,255,0.2)' : 'none',
  }),
  gradient: (color: string, width: number, opacity: string) => ({
    position: 'absolute' as const, inset: 0, pointerEvents: 'none' as const,
    background: `linear-gradient(90deg, #${color}${opacity} 0%, transparent ${width}%)`,
  }),
  rank: {
    color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums',
    flexShrink: 0, fontSize: '0.7em', width: 18, textAlign: 'right' as const,
    position: 'relative' as const,
  },
  logo: (size: number) => ({
    width: size, height: size, objectFit: 'contain' as const, flexShrink: 0,
  }),
  logoPlaceholder: (size: number) => ({ width: size, height: size, flexShrink: 0 }),
  teamName: {
    flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.9)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    fontWeight: 500, fontSize: '0.8em', position: 'relative' as const,
  },
  clincher: {
    color: 'rgba(52,211,153,0.7)', fontWeight: 500, fontSize: '0.6em', flexShrink: 0,
  },
  statCell: (width?: number) => ({
    width: width || undefined, textAlign: 'right' as const, color: 'rgba(255,255,255,0.6)',
    fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontSize: '0.7em',
    whiteSpace: 'nowrap' as const, position: 'relative' as const,
  }),
  colHeader: (width?: number) => ({
    width: width || undefined, textAlign: 'right' as const, color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const, flexShrink: 0, fontSize: '0.55em',
  }),
  positive: { color: 'rgb(52,211,153)' },
  negative: { color: 'rgb(248,113,113)' },
  streakW: { color: 'rgb(52,211,153)' },
  streakL: { color: 'rgb(248,113,113)' },
  pointsBold: {
    color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums',
    fontWeight: 600, flexShrink: 0, fontSize: '0.7em', width: 28,
    textAlign: 'right' as const, whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
  },
};

function PaginationDots({ total, current, threshold = 10 }: { total: number; current: number; threshold?: number }) {
  if (total <= 1) return null;

  if (total <= threshold) {
    return (
      <div style={S.dotsWrap}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={S.dot(i === current)} />
        ))}
      </div>
    );
  }

  return <span style={S.dotsText}>{current + 1} / {total}</span>;
}

function TeamLogo({ src, alt, size = 24 }: { src: string; alt: string; size?: number }) {
  if (!src) return <div style={S.logoPlaceholder(size)} />;
  return (
    <img
      src={`/api/image-proxy?url=${encodeURIComponent(src)}`}
      alt={alt}
      width={size}
      height={size}
      style={S.logo(size)}
      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
    />
  );
}

function StandingsHeader({ league, groupName, total, current }: {
  league: string; groupName: string; total: number; current: number;
}) {
  return (
    <div style={S.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={S.leagueLabel}>{league}</span>
        <span style={S.groupLabel}>{groupName}</span>
      </div>
      <PaginationDots total={total} current={current} />
    </div>
  );
}

interface TeamRowProps {
  entry: StandingsEntry;
  showPlayoffCutoff: boolean;
  showGradientBar?: boolean;
  barWidth?: number;
  borderWidth?: number;
  logoSize?: number;
  accentOpacity?: number;
  teamLabel?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

function StandingsTeamRow({
  entry, showPlayoffCutoff, showGradientBar = true,
  barWidth = 0, borderWidth = 3, logoSize = 18,
  accentOpacity = 16, teamLabel, compact, children,
}: TeamRowProps) {
  const label = teamLabel ?? (entry.teamShort || entry.teamAbbr);
  const nameStyle = compact
    ? { ...S.teamName, fontSize: '0.75em' }
    : S.teamName;

  return (
    <div style={S.row(showPlayoffCutoff, entry.teamColor, borderWidth)}>
      {showGradientBar && (
        <div style={S.gradient(entry.teamColor, barWidth, hexOpacity(accentOpacity))} />
      )}
      <span style={S.rank}>{entry.rank}</span>
      <div style={{ flexShrink: 0, position: showGradientBar ? 'relative' as const : undefined }}>
        <TeamLogo src={entry.teamLogo} alt={entry.teamAbbr} size={logoSize} />
      </div>
      <span style={nameStyle}>
        {label}
        {entry.clincher && (
          <span style={{ ...S.clincher, marginLeft: 4 }}>{entry.clincher}</span>
        )}
      </span>
      {children}
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────────────────

function getColumns(league: string): { key: string; label: string; width: number }[] {
  const l = league.toLowerCase();
  if (l === 'nfl') {
    return [
      { key: 'record', label: 'W-L', width: 42 },
      { key: 'pct', label: 'PCT', width: 36 },
      { key: 'pf', label: 'PF', width: 32 },
      { key: 'pa', label: 'PA', width: 32 },
      { key: 'diff', label: 'DIFF', width: 38 },
      { key: 'strk', label: 'STRK', width: 38 },
    ];
  }
  if (l === 'nhl') {
    return [
      { key: 'gp', label: 'GP', width: 28 },
      { key: 'record', label: 'W-L-OT', width: 52 },
      { key: 'pts', label: 'PTS', width: 32 },
      { key: 'diff', label: 'DIFF', width: 38 },
      { key: 'strk', label: 'STRK', width: 38 },
    ];
  }
  if (isSoccer(l)) {
    return [
      { key: 'gp', label: 'GP', width: 28 },
      { key: 'record', label: 'W-D-L', width: 42 },
      { key: 'pts', label: 'PTS', width: 32 },
      { key: 'gd', label: 'GD', width: 38 },
    ];
  }
  return [
    { key: 'record', label: 'W-L', width: 36 },
    { key: 'pct', label: 'PCT', width: 36 },
    { key: 'gb', label: 'GB', width: 32 },
    { key: 'strk', label: 'STRK', width: 38 },
    { key: 'l10', label: 'L10', width: 36 },
  ];
}

function CellValue({ entry, col, league }: { entry: StandingsEntry; col: string; league: string }) {
  switch (col) {
    case 'record': return <>{formatRecord(entry, league)}</>;
    case 'pct': return <>{entry.winPct.toFixed(3).replace(/^0/, '')}</>;
    case 'gb': return <>{entry.gamesBack !== undefined && entry.gamesBack > 0 ? entry.gamesBack : '\u2014'}</>;
    case 'strk': {
      const style = entry.streak?.startsWith('W') ? S.streakW : entry.streak?.startsWith('L') ? S.streakL : undefined;
      return <span style={style}>{entry.streak ?? '\u2014'}</span>;
    }
    case 'l10': return <>{entry.last10 ?? '\u2014'}</>;
    case 'pts': return <>{entry.points ?? 0}</>;
    case 'gp': return <>{entry.gamesPlayed ?? 0}</>;
    case 'pf': return <>{entry.pointsFor ?? 0}</>;
    case 'pa': return <>{entry.pointsAgainst ?? 0}</>;
    case 'diff': {
      const diff = Math.round(entry.differential ?? entry.goalDiff ?? 0);
      return <span style={diff > 0 ? S.positive : diff < 0 ? S.negative : undefined}>{diff > 0 ? `+${diff}` : diff}</span>;
    }
    case 'gd': {
      const gd = Math.round(entry.goalDiff ?? entry.differential ?? 0);
      return <span style={gd > 0 ? S.positive : gd < 0 ? S.negative : undefined}>{gd > 0 ? `+${gd}` : gd}</span>;
    }
    default: return <>{'\u2014'}</>;
  }
}

function TableView({ groups, teamsToShow, showPlayoffLine, rotationIntervalMs, grouping, accentOpacity }: {
  groups: StandingsGroup[]; teamsToShow: number; showPlayoffLine: boolean;
  rotationIntervalMs: number; grouping: StandingsGrouping; accentOpacity: number;
}) {
  const index = useRotatingIndex(groups.length, rotationIntervalMs);
  const group = groups[index];
  if (!group) return null;

  const columns = getColumns(group.league);
  const entries = teamsToShow > 0 ? group.entries.slice(0, teamsToShow) : group.entries;
  const playoffCount = getPlayoffTeamCount(group.league, grouping);
  const maxWinPct = Math.max(...entries.map((e) => e.winPct), 0.001);

  return (
    <div style={S.flexCol}>
      <StandingsHeader league={group.league} groupName={group.name} total={groups.length} current={index} />

      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px 4px',
        paddingLeft: 'calc(0.5rem + 3px)',
      }}>
        <span style={{ width: 18, fontSize: '0.6em', color: 'rgba(255,255,255,0.25)', textAlign: 'right' as const, flexShrink: 0 }}>#</span>
        <div style={{ width: 18, flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
        {columns.map((col) => (
          <span key={col.key} style={S.colHeader(col.width)}>{col.label}</span>
        ))}
      </div>

      <div style={S.overflow}>
        {entries.map((entry) => {
          const barWidth = maxWinPct > 0 ? (entry.winPct / maxWinPct) * 100 : 0;
          return (
            <StandingsTeamRow
              key={entry.teamAbbr}
              entry={entry}
              showPlayoffCutoff={showPlayoffLine && entry.rank === playoffCount}
              barWidth={barWidth}
              accentOpacity={accentOpacity}
            >
              {columns.map((col) => (
                <span key={col.key} style={S.statCell(col.width)}>
                  <CellValue entry={entry} col={col.key} league={group.league} />
                </span>
              ))}
            </StandingsTeamRow>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compact View ────────────────────────────────────────────────────────────

function CompactView({ groups, teamsToShow, showPlayoffLine, rotationIntervalMs, grouping, accentOpacity }: {
  groups: StandingsGroup[]; teamsToShow: number; showPlayoffLine: boolean;
  rotationIntervalMs: number; grouping: StandingsGrouping; accentOpacity: number;
}) {
  const index = useRotatingIndex(groups.length, rotationIntervalMs);
  const group = groups[index];
  if (!group) return null;

  const entries = teamsToShow > 0 ? group.entries.slice(0, teamsToShow) : group.entries;
  const playoffCount = getPlayoffTeamCount(group.league, grouping);
  const maxWinPct = Math.max(...entries.map((e) => e.winPct), 0.001);

  return (
    <div style={S.flexCol}>
      <StandingsHeader league={group.league} groupName={group.name} total={groups.length} current={index} />
      <div style={S.overflow}>
        {entries.map((entry) => {
          const barWidth = maxWinPct > 0 ? (entry.winPct / maxWinPct) * 100 : 0;
          return (
            <StandingsTeamRow
              key={entry.teamAbbr}
              entry={entry}
              showPlayoffCutoff={showPlayoffLine && entry.rank === playoffCount}
              barWidth={barWidth}
              logoSize={16}
              compact
              accentOpacity={accentOpacity}
            >
              <span style={{ ...S.statCell(0), position: 'relative' as const }}>
                {formatRecord(entry, group.league)}
              </span>
              {entry.points !== undefined && (
                <span style={S.pointsBold}>{entry.points}</span>
              )}
            </StandingsTeamRow>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conference View ─────────────────────────────────────────────────────────

function ConferenceColumn({ group, teamsToShow, showPlayoffLine, grouping }: {
  group: StandingsGroup; teamsToShow: number; showPlayoffLine: boolean; grouping: StandingsGrouping;
}) {
  const entries = teamsToShow > 0 ? group.entries.slice(0, teamsToShow) : group.entries;
  const playoffCount = getPlayoffTeamCount(group.league, grouping);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        padding: '0 6px 4px', marginBottom: 4,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontSize: '0.65em' }}>
          {group.name}
        </span>
      </div>

      {entries.map((entry) => (
        <StandingsTeamRow
          key={entry.teamAbbr}
          entry={entry}
          showPlayoffCutoff={showPlayoffLine && entry.rank === playoffCount}
          showGradientBar={false}
          borderWidth={2}
          logoSize={14}
          teamLabel={entry.teamAbbr}
          compact
        >
          <span style={{ ...S.statCell(0), color: 'rgba(255,255,255,0.5)', fontSize: '0.6em' }}>
            {formatRecord(entry, group.league)}
          </span>
        </StandingsTeamRow>
      ))}
    </div>
  );
}

function ConferenceView({ groups, teamsToShow, showPlayoffLine, rotationIntervalMs, grouping }: {
  groups: StandingsGroup[]; teamsToShow: number; showPlayoffLine: boolean;
  rotationIntervalMs: number; grouping: StandingsGrouping;
}) {
  const pairs: StandingsGroup[][] = [];
  for (let i = 0; i < groups.length; i += 2) {
    pairs.push(groups.slice(i, i + 2));
  }

  const index = useRotatingIndex(pairs.length, rotationIntervalMs);
  const pair = pairs[index];
  if (!pair || pair.length === 0) return null;

  return (
    <div style={S.flexCol}>
      <div style={S.header}>
        <span style={S.leagueLabel}>{pair[0].league}</span>
        <PaginationDots total={pairs.length} current={index} />
      </div>
      <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
        {pair.map((group) => (
          <ConferenceColumn
            key={group.name}
            group={group}
            teamsToShow={teamsToShow}
            showPlayoffLine={showPlayoffLine}
            grouping={grouping}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Display Component ─────────────────────────────────────────────────

export default function StandingsPlugin({ config, style }: PluginComponentProps) {
  const sdk = window.__HS_SDK__;

  // Guard against SDK not being initialized
  if (!sdk) {
    return <div style={{ padding: 16, opacity: 0.5 }}>SDK not ready</div>;
  }

  const view = (config.view as StandingsView) ?? 'table';
  const league = (config.league as string) ?? 'nba';
  const grouping = (config.grouping as StandingsGrouping) ?? 'conference';
  const teamsToShow = (config.teamsToShow as number) ?? 0;
  const showPlayoffLine = config.showPlayoffLine !== false;
  const rotationIntervalMs = (config.rotationIntervalMs as number) ?? 10000;
  const refreshIntervalMs = (config.refreshIntervalMs as number) ?? 300000;
  const accentOpacity = (config.accentOpacity as number) ?? 16;

  const [groups, error] = useStandingsData(league, grouping, refreshIntervalMs);

  if (groups === null) {
    return (
      <sdk.ModuleLoadingState loading error={error ?? undefined}>
        <div />
      </sdk.ModuleLoadingState>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: 16,
      }}>
        <p style={{ textAlign: 'center', opacity: 0.5, fontSize: style.fontSize * 0.85 }}>
          No standings available
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      opacity: style.opacity,
      borderRadius: style.borderRadius,
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      color: style.textColor,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      backdropFilter: `blur(${style.backdropBlur ?? 0}px)`,
      WebkitBackdropFilter: `blur(${style.backdropBlur ?? 0}px)`,
      boxSizing: 'border-box',
    }}>
      {view === 'table' && (
        <TableView
          groups={groups} teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine} rotationIntervalMs={rotationIntervalMs}
          grouping={grouping} accentOpacity={accentOpacity}
        />
      )}
      {view === 'compact' && (
        <CompactView
          groups={groups} teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine} rotationIntervalMs={rotationIntervalMs}
          grouping={grouping} accentOpacity={accentOpacity}
        />
      )}
      {view === 'conference' && (
        <ConferenceView
          groups={groups} teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine} rotationIntervalMs={rotationIntervalMs}
          grouping={grouping}
        />
      )}
    </div>
  );
}

// ─── Custom Config Section (Editor-Only) ─────────────────────────────────────

const STANDINGS_VIEWS: { value: StandingsView; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'compact', label: 'Compact' },
  { value: 'conference', label: 'Conference' },
];

const STANDINGS_GROUPINGS: { value: StandingsGrouping; label: string }[] = [
  { value: 'division', label: 'By Division' },
  { value: 'conference', label: 'By Conference' },
  { value: 'league', label: 'Full League' },
];

const STANDINGS_LEAGUES: { value: string; label: string }[] = [
  { value: 'nfl', label: 'NFL' },
  { value: 'nba', label: 'NBA' },
  { value: 'mlb', label: 'MLB' },
  { value: 'nhl', label: 'NHL' },
  { value: 'wnba', label: 'WNBA' },
  { value: 'mls', label: 'MLS' },
  { value: 'epl', label: 'Premier League' },
  { value: 'laliga', label: 'La Liga' },
  { value: 'bundesliga', label: 'Bundesliga' },
  { value: 'seriea', label: 'Serie A' },
  { value: 'ligue1', label: 'Ligue 1' },
  { value: 'liga_mx', label: 'Liga MX' },
];

export function ConfigSection({ config, onChange }: PluginConfigSectionProps) {
  const { Slider, Toggle } = window.__HS_SDK__;
  const INPUT_CLASS = window.__HS_SDK__.INPUT_CLASS;

  const view = (config.view as StandingsView) ?? 'table';
  const league = (config.league as string) ?? 'nba';
  const grouping = (config.grouping as StandingsGrouping) ?? 'conference';
  const teamsToShow = (config.teamsToShow as number) ?? 0;
  const showPlayoffLine = config.showPlayoffLine !== false;
  const accentOpacity = (config.accentOpacity as number) ?? 16;
  const rotationIntervalMs = (config.rotationIntervalMs as number) ?? 10000;
  const refreshIntervalMs = (config.refreshIntervalMs as number) ?? 300000;

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px', fontSize: 12,
    backgroundColor: '#262626', border: '1px solid #525252',
    borderRadius: 4, color: '#e5e5e5',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#a3a3a3',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={labelStyle}>View</span>
        <select
          value={view}
          onChange={(e) => onChange({ view: e.target.value })}
          className={INPUT_CLASS}
          style={selectStyle}
        >
          {STANDINGS_VIEWS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={labelStyle}>League</span>
        <select
          value={league}
          onChange={(e) => onChange({ league: e.target.value })}
          className={INPUT_CLASS}
          style={selectStyle}
        >
          {STANDINGS_LEAGUES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={labelStyle}>Grouping</span>
        <select
          value={grouping}
          onChange={(e) => onChange({ grouping: e.target.value })}
          className={INPUT_CLASS}
          style={selectStyle}
        >
          {STANDINGS_GROUPINGS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <Toggle
        label="Playoff Cutoff Line"
        checked={showPlayoffLine}
        onChange={(v) => onChange({ showPlayoffLine: v })}
      />

      <Slider
        label="Teams to Show (0 = all)"
        value={teamsToShow}
        min={0} max={32} step={1}
        onChange={(v) => onChange({ teamsToShow: v })}
      />

      {view === 'table' && (
        <Slider
          label="Team Color Intensity"
          value={accentOpacity}
          min={0} max={64} step={4}
          onChange={(v) => onChange({ accentOpacity: v })}
        />
      )}

      <Slider
        label="Rotation (seconds)"
        value={rotationIntervalMs / 1000}
        min={5} max={60} step={5}
        onChange={(v) => onChange({ rotationIntervalMs: v * 1000 })}
      />

      <Slider
        label="Refresh (minutes)"
        value={refreshIntervalMs / 60000}
        min={1} max={60} step={1}
        onChange={(v) => onChange({ refreshIntervalMs: v * 60000 })}
      />
    </div>
  );
}
