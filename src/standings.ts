import { Match, TeamStats } from './types';

export interface SortedGroup {
  groupName: string;
  teams: TeamStats[];
}

export function calculateStandings(matches: Match[]): SortedGroup[] {
  const groupMap: { [group: string]: { [team: string]: TeamStats } } = {};

  // Initialize all teams in their respective groups
  for (const m of matches) {
    if (!groupMap[m.group]) {
      groupMap[m.group] = {};
    }
    if (!groupMap[m.group][m.homeTeam]) {
      groupMap[m.group][m.homeTeam] = createInitialStats(m.homeTeam);
    }
    if (!groupMap[m.group][m.awayTeam]) {
      groupMap[m.group][m.awayTeam] = createInitialStats(m.awayTeam);
    }
  }

  // Update standings for matches that have scores
  for (const m of matches) {
    if (m.homeScore === undefined || m.awayScore === undefined) {
      continue;
    }

    const home = groupMap[m.group][m.homeTeam];
    const away = groupMap[m.group][m.awayTeam];

    home.pld += 1;
    away.pld += 1;

    // predictor matches should never be null
    home.gf += m.homeScore!;
    home.ga += m.awayScore!;
    away.gf += m.awayScore!;
    away.ga += m.homeScore!;

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.homeScore! > m.awayScore!) {
      home.w += 1;
      home.pts += 3;
      away.l += 1;
    } else if (m.homeScore! < m.awayScore!) {
      away.w += 1;
      away.pts += 3;
      home.l += 1;
    } else {
      home.d += 1;
      home.pts += 1;
      away.d += 1;
      away.pts += 1;
    }
  }

  // Convert map to sorted arrays
  const sortedGroups: SortedGroup[] = [];

  for (const groupName of Object.keys(groupMap).sort()) {
    const teams = Object.values(groupMap[groupName]);
    teams.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });
    sortedGroups.push({
      groupName,
      teams,
    });
  }

  return sortedGroups;
}

function createInitialStats(teamName: string): TeamStats {
  return {
    team: teamName,
    pld: 0,
    w: 0,
    d: 0,
    l: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  };
}
