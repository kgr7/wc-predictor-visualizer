# World Cup Predictor Visualizer
[View on GitHub Pages](https://kgr7.github.io/wc-predictor-visualizer/)

Web and CLI tool to calculate and visualize group stage standings from a completed predictor spreadsheet.


## Features
- Group standings tab
    - Show how each group shapes up with your predictions
- Overall standings tab
    - All teams together in one view
- Picks tab
    - Show your picks as they appeared in the original spreadsheet.
    - Row highlighting with colour depending on total goals in the game

## Excel Column Mapping
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
- Compile web: `npm run build:web`
- Run web locally: `npm run dev`