export interface Match {
  matchNum: number;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

export interface TeamStats {
  team: string;
  pld: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface GroupStandings {
  [groupName: string]: {
    [teamName: string]: TeamStats;
  };
}
