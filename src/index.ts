#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { parsePredictorSheet } from './parser-node';
import { calculateStandings } from './standings';
import { printStandings } from './formatter';

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: predictor <path-to-xlsx-file>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  try {
    const matches = parsePredictorSheet(filePath);
    if (matches.length === 0) {
      console.warn('Warning: No valid fixtures found in the spreadsheet.');
      process.exit(0);
    }
    const standings = calculateStandings(matches);
    printStandings(standings);
  } catch (error: any) {
    console.error('Error processing spreadsheet:', error.message || error);
    process.exit(1);
  }
}

main();
