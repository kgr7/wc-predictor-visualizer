import { SortedGroup } from './standings';

// ANSI colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

export function printStandings(groups: SortedGroup[]): void {
  // Find max team name length to make it look perfect
  let maxTeamLen = 15;
  for (const g of groups) {
    for (const t of g.teams) {
      if (t.team.length > maxTeamLen) {
        maxTeamLen = t.team.length;
      }
    }
  }

  const separatorRaw = '-'.repeat(maxTeamLen + 40);
  const separator = `${GRAY}${separatorRaw}${RESET}`;

  for (const g of groups) {
    console.log(`\n${separator}`);
    console.log(` ${BOLD}${CYAN}${g.groupName.toUpperCase()}${RESET}`);
    console.log(separator);
    
    // Header
    const posHeader = 'Pos'.padEnd(4);
    const teamHeader = 'Team'.padEnd(maxTeamLen);
    const pldHeader = 'Pld'.padStart(4);
    const wHeader = 'W'.padStart(3);
    const dHeader = 'D'.padStart(3);
    const lHeader = 'L'.padStart(3);
    const gfHeader = 'GF'.padStart(4);
    const gaHeader = 'GA'.padStart(4);
    const gdHeader = 'GD'.padStart(5);
    const ptsHeader = 'Pts'.padStart(5);

    console.log(`${BOLD}${GRAY}${posHeader}${teamHeader}${pldHeader}${wHeader}${dHeader}${lHeader}${gfHeader}${gaHeader}${gdHeader}${ptsHeader}${RESET}`);
    console.log(separator);

    g.teams.forEach((t, index) => {
      const pos = `${index + 1}`.padEnd(4);
      const team = t.team.padEnd(maxTeamLen);
      const pld = `${t.pld}`.padStart(4);
      const w = `${t.w}`.padStart(3);
      const d = `${t.d}`.padStart(3);
      const l = `${t.l}`.padStart(3);
      const gf = `${t.gf}`.padStart(4);
      const ga = `${t.ga}`.padStart(4);
      
      const gdVal = t.gd > 0 ? `+${t.gd}` : `${t.gd}`;
      const gd = gdVal.padStart(5);
      const pts = `${t.pts}`.padStart(5);

      const isAdvancing = index < 2;
      const color = isAdvancing ? GREEN : RESET;
      const style = isAdvancing ? BOLD : '';

      console.log(`${style}${color}${pos}${team}${pld}${w}${d}${l}${gf}${ga}${gd}${pts}${RESET}`);
    });
    console.log(separator);
  }
}
