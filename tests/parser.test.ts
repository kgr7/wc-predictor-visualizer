import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePredictorData, calculatePredictorPoints, calculateMatchPoints } from '../src/parser';

describe('parsePredictorData', () => {
  it('correctly parses valid spreadsheet rows and ignores invalid ones', () => {
    // Generate in-memory Excel workbook
    const wsData = [
      ['Match #', 'Group', '', 'Home Team', 'Home Score', '', 'Away Score', 'Away Team'],
      [1, 'Group A', '', 'Team A', 2, '', 1, 'Team B'],
      ['2', 'Group B', '', 'Team C', '', '', '', 'Team D'], // numeric string matchNum
      ['Invalid Match', 'Group C', '', 'Team E', 3, '', 0, 'Team F'], // invalid matchNum
      [3, 'Group A', '', 'Team A', 1, '', 1, 'Team C'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Predictions');
    const xlsxArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;

    const matches = parsePredictorData(xlsxArrayBuffer);

    expect(matches).toHaveLength(3);

    // Match 1
    expect(matches[0]).toEqual({
      matchNum: 1,
      group: 'Group A',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeScore: 2,
      awayScore: 1,
    });

    // Match 2
    expect(matches[1]).toEqual({
      matchNum: 2,
      group: 'Group B',
      homeTeam: 'Team C',
      awayTeam: 'Team D',
      homeScore: undefined,
      awayScore: undefined,
    });

    // Match 3
    expect(matches[2]).toEqual({
      matchNum: 3,
      group: 'Group A',
      homeTeam: 'Team A',
      awayTeam: 'Team C',
      homeScore: 1,
      awayScore: 1,
    });
  });
});

describe('calculatePredictorPoints', () => {
  it('correctly calculates points for various prediction and actual score scenarios', () => {
    // 5 points: correct outcome, correct home goals, correct away goals
    expect(calculatePredictorPoints(2, 1, 2, 1)).toBe(5);
    expect(calculatePredictorPoints(0, 0, 0, 0)).toBe(5);

    // 4 points: correct outcome, correct home goals, incorrect away goals
    expect(calculatePredictorPoints(3, 0, 3, 2)).toBe(4);
    // 4 points: correct outcome, incorrect home goals, correct away goals
    expect(calculatePredictorPoints(1, 2, 0, 2)).toBe(4);

    // 3 points: correct outcome (draw), incorrect home goals, incorrect away goals
    expect(calculatePredictorPoints(2, 2, 1, 1)).toBe(3);
    // 3 points: correct outcome (home win), incorrect home/away goals
    expect(calculatePredictorPoints(2, 0, 3, 1)).toBe(3);

    // 2 points: incorrect outcome, correct home goals, correct away goals
    // Wait, is it mathematically possible to get 2 points (both goals correct but incorrect outcome)?
    // If pred is 2-1 and act is 1-2: outcome is diff (home vs away win). Home goals incorrect (2!=1), away goals incorrect (1!=2). Points = 0.
    // If pred is 2-2 (draw) and act is 2-1 (home win): outcome is diff (draw vs home win). Home goals correct (2==2), away goals incorrect (2!=1). Points = 1.
    // Wait! Can you get both home and away goals correct, but have a different outcome?
    // If predHome === actHome and predAway === actAway, then the outcome (win/loss/draw) MUST be the same because the scores are identical.
    // Thus, it is mathematically impossible to get exactly 2 points in this scoring system because if both home and away goals are correct, the scores are identical, meaning the outcome is also correct, giving 5 points.
    // Therefore, any score of 2 points is impossible!

    // 1 point: incorrect outcome, correct home goals, incorrect away goals
    expect(calculatePredictorPoints(1, 0, 1, 1)).toBe(1);
    // 1 point: incorrect outcome, incorrect home goals, correct away goals
    expect(calculatePredictorPoints(0, 2, 2, 2)).toBe(1);

    // 0 points: incorrect outcome, incorrect home goals, incorrect away goals
    expect(calculatePredictorPoints(3, 2, 2, 3)).toBe(0);
    expect(calculatePredictorPoints(1, 0, 2, 3)).toBe(0);
  });
});

describe('calculateMatchPoints', () => {
  it('correctly calculates points when team order is identical', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 1, awayScore: 0 };
    expect(calculateMatchPoints(prediction, actual)).toBe(3);
  });

  it('returns 0 points when team order is swapped', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Austria', awayTeam: 'Spain', homeScore: 1, awayScore: 2 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 1, awayScore: 0 };
    expect(calculateMatchPoints(prediction, actual)).toBe(0);
  });

  it('returns 0 points if teams do not match at all', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Germany', awayTeam: 'France', homeScore: 1, awayScore: 0 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 1, awayScore: 0 };
    expect(calculateMatchPoints(prediction, actual)).toBe(0);
  });

  it('returns 4 points for a correct outcome and one correct score, even if the other score is incorrect', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 0 };
    expect(calculateMatchPoints(prediction, actual)).toBe(4);
  });

  it('returns 5 points for a perfect prediction', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    expect(calculateMatchPoints(prediction, actual)).toBe(5);
  });

  it('returns 0 points if any of the scores are undefined', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: undefined, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    expect(calculateMatchPoints(prediction, actual)).toBe(0);

    const prediction2 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: undefined };
    const actual2 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    expect(calculateMatchPoints(prediction2, actual2)).toBe(0);

    const prediction3 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual3 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: undefined, awayScore: 1 };
    expect(calculateMatchPoints(prediction3, actual3)).toBe(0);

    const prediction4 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual4 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: undefined };
    expect(calculateMatchPoints(prediction4, actual4)).toBe(0);
  });

  it('returns 0 points if any of the scores are null', () => {
    const prediction3 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual3 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: null, awayScore: 1 };
    expect(calculateMatchPoints(prediction3, actual3)).toBe(0);

    const prediction4 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual4 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: null };
    expect(calculateMatchPoints(prediction4, actual4)).toBe(0);

    const prediction5 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual5 = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: null, awayScore: null };
    expect(calculateMatchPoints(prediction5, actual5)).toBe(0);
  });

  it('does not allocate points for correct scores if the teams are swapped', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'Spain', awayTeam: 'Austria', homeScore: 2, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'Austria', awayTeam: 'Spain', homeScore: 2, awayScore: 1 };
    expect(calculateMatchPoints(prediction, actual)).toBe(0);

    const prediction2 = { matchNum: 1, group: 'A', homeTeam: 'Austria', awayTeam: 'Spain', homeScore: 2, awayScore: 1 };
    const actual2 = { matchNum: 1, group: 'A', homeTeam: 'Austria', awayTeam: 'Spain', homeScore: 1, awayScore: 2 };
    expect(calculateMatchPoints(prediction2, actual2)).toBe(0);
  });

  it('correctly calculates points when team names differ between predictor and FIFA data', () => {
    const prediction = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'South Korea', homeScore: 2, awayScore: 1 };
    const actual = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Korea Republic', homeScore: 2, awayScore: 1 };
    expect(calculateMatchPoints(prediction, actual)).toBe(5);

    // Test with a draw
    const prediction3 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'South Korea', homeScore: 1, awayScore: 1 };
    const actual3 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Korea Republic', homeScore: 1, awayScore: 1 };
    expect(calculateMatchPoints(prediction3, actual3)).toBe(5);

    // Test with teams swapped
    const prediction4 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'South Korea', homeScore: 2, awayScore: 1 };
    const actual4 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Korea Republic', homeScore: 1, awayScore: 2 };
    expect(calculateMatchPoints(prediction4, actual4)).toBe(0);

    // Test with incorrect outcome and one correct score
    const prediction5 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'South Korea', homeScore: 2, awayScore: 1 };
    const actual5 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Korea Republic', homeScore: 2, awayScore: 2 };
    expect(calculateMatchPoints(prediction5, actual5)).toBe(1);

    // Test with incorrect team names that don't match any known FIFA names
    const prediction7 = { matchNum: 1, group: 'A', homeTeam: 'Unknown Team A', awayTeam: 'Unknown Team B', homeScore: 1, awayScore: 2 };
    const actual7 = { matchNum: 1, group: 'A', homeTeam: 'Unknown Team A', awayTeam: 'Unknown Team B', homeScore: 1, awayScore: 2 };
    expect(calculateMatchPoints(prediction7, actual7)).toBe(5);

    // Test with one team name matching and the other not
    const prediction8 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Unknown Team B', homeScore: 1, awayScore: 2 };
    const actual8 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Unknown Team B', homeScore: 1, awayScore: 2 };
    expect(calculateMatchPoints(prediction8, actual8)).toBe(5);

    // Test with correct outcome but not correct score
    const prediction9 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'South Korea', homeScore: 2, awayScore: 1 };
    const actual9 = { matchNum: 1, group: 'A', homeTeam: 'USA', awayTeam: 'Korea Republic', homeScore: 3, awayScore: 2 };
    expect(calculateMatchPoints(prediction9, actual9)).toBe(3);
  });
});
