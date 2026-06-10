import { describe, it, expect } from 'vitest';
import { calculateStandings } from '../src/standings';
import { Match } from '../src/types';

describe('calculateStandings', () => {
  it('correctly calculates points and standings for basic wins/draws/losses', () => {
    const matches: Match[] = [
      { matchNum: 1, group: 'Group A', homeTeam: 'Team A', awayTeam: 'Team B', homeScore: 2, awayScore: 1 },
      { matchNum: 2, group: 'Group A', homeTeam: 'Team C', awayTeam: 'Team D', homeScore: 1, awayScore: 1 },
    ];

    const result = calculateStandings(matches);
    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe('Group A');

    const teams = result[0].teams;
    expect(teams).toHaveLength(4);

    // Team A has 3 points
    const teamA = teams.find(t => t.team === 'Team A');
    expect(teamA?.pts).toBe(3);
    expect(teamA?.pld).toBe(1);
    expect(teamA?.w).toBe(1);
    expect(teamA?.gd).toBe(1);

    // Team B has 0 points
    const teamB = teams.find(t => t.team === 'Team B');
    expect(teamB?.pts).toBe(0);
    expect(teamB?.l).toBe(1);
    expect(teamB?.gd).toBe(-1);

    // Team C and D have 1 point
    const teamC = teams.find(t => t.team === 'Team C');
    const teamD = teams.find(t => t.team === 'Team D');
    expect(teamC?.pts).toBe(1);
    expect(teamD?.pts).toBe(1);
    expect(teamC?.d).toBe(1);
    expect(teamD?.d).toBe(1);
  });

  it('handles tiebreaker rules correctly', () => {
    const matches: Match[] = [
      // Scenario:
      // Team A and Team B have same points (3)
      // Team A has +2 GD (3-1), Team B has +1 GD (2-1)
      // Team C and Team D have same points (3) and same GD (0)
      // Team C has 3 GF (3-3), Team D has 2 GF (2-2)
      // Team E and Team F have same points (3), same GD (0), same GF (1)
      // Team E should sort before Team F alphabetically

      { matchNum: 1, group: 'Group A', homeTeam: 'Team A', awayTeam: 'Team Z', homeScore: 3, awayScore: 1 },
      { matchNum: 2, group: 'Group A', homeTeam: 'Team B', awayTeam: 'Team Y', homeScore: 2, awayScore: 1 },

      { matchNum: 3, group: 'Group A', homeTeam: 'Team C', awayTeam: 'Team X', homeScore: 3, awayScore: 3 },
      { matchNum: 4, group: 'Group A', homeTeam: 'Team D', awayTeam: 'Team W', homeScore: 2, awayScore: 2 },

      { matchNum: 5, group: 'Group A', homeTeam: 'Team F', awayTeam: 'Team V', homeScore: 1, awayScore: 1 },
      { matchNum: 6, group: 'Group A', homeTeam: 'Team E', awayTeam: 'Team U', homeScore: 1, awayScore: 1 },
    ];

    const result = calculateStandings(matches);
    const teams = result[0].teams;

    // Verify ordering
    // 1. Team A (3 pts, +2 GD)
    // 2. Team B (3 pts, +1 GD)
    // 3. Team C (1 pt, 0 GD, 3 GF)
    // 4. Team D (1 pt, 0 GD, 2 GF)
    // 5. Team E (1 pt, 0 GD, 1 GF) (alphabetical over F)
    // 6. Team F (1 pt, 0 GD, 1 GF)

    expect(teams[0].team).toBe('Team A');
    expect(teams[1].team).toBe('Team B');
    expect(teams[2].team).toBe('Team C');
    expect(teams[3].team).toBe('Team X');
    expect(teams[4].team).toBe('Team D');
    expect(teams[5].team).toBe('Team W');
    expect(teams[6].team).toBe('Team E');
    expect(teams[7].team).toBe('Team F');
  });
});
