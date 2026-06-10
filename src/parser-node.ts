import * as fs from 'fs';
import { Match } from './types';
import { parsePredictorData } from './parser';

export function parsePredictorSheet(filePath: string): Match[] {
  const buffer = fs.readFileSync(filePath);
  return parsePredictorData(buffer);
}
