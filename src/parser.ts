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

/**
 * Parses the FIFA results data and returns a list of matches with the final scores.
 * 
 * @param data - The FIFA rounds.json from https://play.fifa.com/json/dream_eleven/rounds.json
 * pull match data using the following pattern:
 * top level array -> tournaments[idx] -> game object
 * game object has the following properties:
 * id: number (sequential game number)
 * homeSquadName: string
 * awaySquadName: string
 * homeScore: number
 * awayScore: number
 * 
 * where the top level array contains a list of tournament rounds (group stage match day 1, match day 2... RO32, RO16, QF, SF, FINAL)
 * 
 * @returns An array of matches with the final scores.
 */
export function parseFifaResults(data: unknown): Match[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((round): Match[] => {
    if (!round || typeof round !== "object") {
      return [];
    }

    const tournaments = (round as { tournaments?: unknown }).tournaments;

    if (!Array.isArray(tournaments)) {
      return [];
    }

    return tournaments.map((game): Match => {
      const match = game as {
        id: number;
        homeSquadName: string;
        awaySquadName: string;
        homeScore: number;
        awayScore: number;
        groupName?: string | null;
      };

      return {
        matchNum: match.id,
        homeTeam: match.homeSquadName,
        awayTeam: match.awaySquadName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        group: match.groupName || 'n/a'
      };
    });
  });
}

/**
 * Calculates the predictor points earned for a prediction against the actual score.
 * 
 * Correct outcome: 3 pts
 * Correct home goals: 1 pt
 * Correct away goals: 1 pt
 */
export function calculatePredictorPoints(
  predHome: number,
  predAway: number,
  actHome: number | null,
  actAway: number | null
): number {
  let points = 0;

  // these will be null if the game is in the future
  if (actHome === null || actAway === null) return 0;

  const predOutcome = predHome > predAway ? 'home' : (predHome < predAway ? 'away' : 'draw');
  const actOutcome = actHome > actAway ? 'home' : (actHome < actAway ? 'away' : 'draw');

  if (predOutcome === actOutcome) {
    points += 3;
  }

  if (predHome === actHome) {
    points += 1;
  }

  if (predAway === actAway) {
    points += 1;
  }

  return points;
}

/**
 * Calculates predictor points for a match, handling cases where the team order is swapped
 * and where FIFA and predictor data use different names for the same country.
 */
export function calculateMatchPoints(prediction: Match, actual: Match): number {
  if (
    prediction.homeScore === undefined ||
    prediction.awayScore === undefined ||
    actual.homeScore === undefined ||
    actual.awayScore === undefined
  ) {
    return 0;
  }

  const predHomeName = prediction.homeTeam.toLowerCase().trim();
  const predAwayName = prediction.awayTeam.toLowerCase().trim();
  const actHomeName = normalizeFifaTeamName(actual.homeTeam.trim()).toLowerCase();
  const actAwayName = normalizeFifaTeamName(actual.awayTeam.trim()).toLowerCase();

  const isDirect = predHomeName === actHomeName && predAwayName === actAwayName;

  if (!isDirect) {
    return 0;
  }

  return calculatePredictorPoints(
    prediction.homeScore!,
    prediction.awayScore!,
    actual.homeScore,
    actual.awayScore
  );
}

/**
 * Normalizes a FIFA team/country name to the corresponding name used in the
 * predictor spreadsheet, if a mapping exists. Falls back to the original name.
 */
export function normalizeFifaTeamName(name: string): string {
  return FifaCountryToPredictorCountry[name] ?? name;
}

const FifaCountryToPredictorCountry: Record<string, string> = {
  "Korea Republic": "South Korea",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Türkiye": "Turkey",
  "Curaçao": "Curacao",
  "Cabo Verde": "Cape Verde",
  "IR Iran": "Iran",
  "Congo DR": "D.R. Congo",
  "Côte d'Ivoire": "Ivory Coast",
};
