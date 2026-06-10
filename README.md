# World Cup Predictor Visualizer
[View on GitHub Pages](https://kgr7.github.io/wc-predictor-visualizer/)

CLI tool to calculate and visualize group stage standings from a completed predictor spreadsheet.

## Column Mapping
- Column B: Group
- Column D: Home Team
- Column E: Home Score
- Column G: Away Score
- Column H: Away Team

## Standing Logic
1. Points (Pts) descending
2. Goal Difference (GD) descending
3. Goals For (GF) descending
4. Team Name alphabetical ascending (fallback)

## Scripts
- Compile: `npm run build`
- Run locally: `npx ts-node src/index.ts <path>`
- Build and Run: `node dist/index.js <path>`
- Link CLI globally: `npm link`
