import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePredictorData } from '../src/parser';

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
