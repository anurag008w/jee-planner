import { readFileSync } from 'fs';
import { buildLecturesWithExtras, getExtraLectureSeriesKey, getExtraLectureId, normalizeExtraLectureCounts, pruneExtraCompletions } from './src/store/extraLectures.js';

const dataset = JSON.parse(readFileSync('./src/data/dataset.json', 'utf8'));
const originals = dataset.lectures;
const first = originals[0];
const key = getExtraLectureSeriesKey(first);
const originalSeries = originals.filter(l => getExtraLectureSeriesKey(l) === key);
const lastNumber = Math.max(...originalSeries.map(l => Number(l.lectureNumber) || 0));

const fail = (message) => { throw new Error(message); };

const empty = buildLecturesWithExtras(originals, {});
if (empty.length !== originals.length) fail('empty extra state changed dataset length');

const combined = buildLecturesWithExtras(originals, { [key]: 2 });
const extras = combined.filter(l => l.isExtraLecture && getExtraLectureSeriesKey(l) === key);
if (extras.length !== 2) fail('expected two generated extras');
if (extras[0].topic !== 'Extra Lecture' || extras[1].topic !== 'Extra Lecture') fail('extra topic mismatch');
if (extras[0].lectureNumber !== lastNumber + 1 || extras[1].lectureNumber !== lastNumber + 2) fail('extra numbering is not sequential');
if (extras[0].id !== getExtraLectureId(key, 1) || extras[1].id !== getExtraLectureId(key, 2)) fail('extra IDs are not deterministic');
if (!Number.isSafeInteger(extras[0].id) || extras[0].id <= 1_000_000_000_000) fail('extra ID is not safely outside the dataset range');
if (originals.length !== dataset.lectures.length || originals[0].topic !== empty[0].topic) fail('base dataset was mutated');

const normalized = normalizeExtraLectureCounts({ [key]: 2.9, missing: -5, bad: 'x' });
if (normalized[key] !== 2 || normalized.missing !== undefined || normalized.bad !== undefined) fail('count normalization failed');

const completed = { [extras[0].id]: 'completed', [getExtraLectureId(key, 99)]: 'completed', 1: 'completed' };
const pruned = pruneExtraCompletions(completed, { [key]: 1 });
if (!(String(extras[0].id) in pruned) || String(getExtraLectureId(key, 99)) in pruned || !('1' in pruned)) fail('extra completion pruning failed');

console.log(`EXTRA LECTURE TESTS OK (${extras.length} generated)`);
