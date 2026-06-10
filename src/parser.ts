import * as XLSX from 'xlsx';
import { Match } from './types';

export function parsePredictorData(data: ArrayBuffer | Uint8Array): Match[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const matches: Match[] = [];

  for (const row of rawData) {
    if (!row || row.length < 8) continue;

    const matchNumRaw = row[0];
    const groupRaw = row[1];
    const homeTeamRaw = row[3];
    const homeScoreRaw = row[4];
    const awayScoreRaw = row[6];
    const awayTeamRaw = row[7];

    // Validate that it's a fixture row: Match # must be a number or a numeric string
    const matchNum = typeof matchNumRaw === 'number' ? matchNumRaw : parseInt(String(matchNumRaw), 10);
    if (isNaN(matchNum)) continue;

    // Validate Group and Team names are strings
    if (typeof groupRaw !== 'string' || typeof homeTeamRaw !== 'string' || typeof awayTeamRaw !== 'string') {
      continue;
    }

    const group = groupRaw.trim();
    const homeTeam = homeTeamRaw.trim();
    const awayTeam = awayTeamRaw.trim();

    if (!group || !homeTeam || !awayTeam) continue;

    // Parse scores if present
    let homeScore: number | undefined;
    let awayScore: number | undefined;

    if (homeScoreRaw !== undefined && homeScoreRaw !== null && homeScoreRaw !== '') {
      const score = typeof homeScoreRaw === 'number' ? homeScoreRaw : parseInt(String(homeScoreRaw), 10);
      if (!isNaN(score)) homeScore = score;
    }

    if (awayScoreRaw !== undefined && awayScoreRaw !== null && awayScoreRaw !== '') {
      const score = typeof awayScoreRaw === 'number' ? awayScoreRaw : parseInt(String(awayScoreRaw), 10);
      if (!isNaN(score)) awayScore = score;
    }

    matches.push({
      matchNum,
      group,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
    });
  }

  return matches;
}
