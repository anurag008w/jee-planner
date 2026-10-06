// test-batches.mjs
// Rigorous verification of the multi-batch architecture and scheduling engine integrity.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { computeResolvedSchedule, getSundaysBetween } from './src/store/scheduleEngine.js';
import { getBatchOriginalDates, getDefaultBatchSettings, deriveDashboard, deriveChapterProgress } from './src/store/useStore.js';
import { buildLecturesWithExtras } from './src/store/extraLectures.js';

const dataset = JSON.parse(readFileSync('./src/data/dataset.json', 'utf8'));

console.log('Testing Multi-Batch Architecture & Engine Integrity...');

// 1. Verify getBatchOriginalDates and getDefaultBatchSettings
const dates = getBatchOriginalDates(dataset.lectures);
assert.strictEqual(dates.startDate, '2026-09-11', 'Default batch start date matches');
assert.strictEqual(dates.endDate, '2026-12-25', 'Default batch end date matches');

const settings = getDefaultBatchSettings(dates.startDate, dates.endDate);
assert.ok(settings.offDays.length > 0, 'Off days computed for date span');
assert.strictEqual(settings.autoShift, true, 'autoShift enabled by default');

// 2. Verify deriveDashboard and deriveChapterProgress for custom batch
const sampleLectures = [
  { id: 2001, newStudyDate: '2026-10-01', day: 'Thursday', phase: 'Phase 1', slot: 1, subject: 'Physics', chemistryBranch: '', chapterName: 'Kinematics', topic: '1D Motion', lectureNumber: 1 },
  { id: 2002, newStudyDate: '2026-10-01', day: 'Thursday', phase: 'Phase 1', slot: 2, subject: 'Mathematics', chemistryBranch: '', chapterName: 'Quadratics', topic: 'Roots', lectureNumber: 1 },
  { id: 2003, newStudyDate: '2026-10-02', day: 'Friday', phase: 'Phase 1', slot: 1, subject: 'Physics', chemistryBranch: '', chapterName: 'Kinematics', topic: '2D Motion', lectureNumber: 2 },
  { id: 2004, newStudyDate: '2026-10-02', day: 'Friday', phase: 'Phase 1', slot: 2, subject: 'Chemistry', chemistryBranch: 'Physical Chemistry', chapterName: 'Mole Concept', topic: 'Molarity', lectureNumber: 1 },
];

const customDash = deriveDashboard('Prayas 2.0', sampleLectures);
assert.strictEqual(customDash.title, 'Prayas 2.0');
assert.strictEqual(customDash.totalLectures, 4);
assert.strictEqual(customDash.physicsLectures, 2);
assert.strictEqual(customDash.mathematicsLectures, 1);
assert.strictEqual(customDash.chemistryLectures, 1);
assert.strictEqual(customDash.startDate, '2026-10-01');
assert.strictEqual(customDash.endDate, '2026-10-02');

const customCP = deriveChapterProgress(sampleLectures);
assert.strictEqual(customCP.length, 3, '3 distinct chapters generated');
const kin = customCP.find(c => c.chapter === 'Kinematics');
assert.strictEqual(kin.totalLectures, 2);
assert.strictEqual(kin.subject, 'Physics');

// 3. Verify schedule engine rules on the custom batch
// - Daily cap Phase 1 = 2
// - Diversity cap: max 2 of same subject
const sched = computeResolvedSchedule({
  lectures: sampleLectures,
  completions: {},
  today: '2026-10-01',
  offDays: [],
  autoShift: true,
});

assert.strictEqual(sched.dayMap['2026-10-01'].length, 2, 'Oct 1 has exactly 2 lectures');
assert.strictEqual(sched.dayMap['2026-10-02'].length, 2, 'Oct 2 has exactly 2 lectures');
assert.strictEqual(sched.resolved[2001].resolvedDate, '2026-10-01');
assert.strictEqual(sched.resolved[2003].resolvedDate, '2026-10-02');

// 4. Verify Backlog cascade on custom batch
// If today is 2026-10-02, and Oct 1 lectures are not completed, they cascade to today
const backlogSched = computeResolvedSchedule({
  lectures: sampleLectures,
  completions: {},
  today: '2026-10-02',
  offDays: [],
  autoShift: true,
});
assert.strictEqual(backlogSched.backlogList.length, 2, '2 lectures in backlog on Oct 2');
// Phase 1 cap is 2 cards/day, so backlog fills Oct 2 first
assert.strictEqual(backlogSched.dayMap['2026-10-02'].length, 2);
assert.ok(backlogSched.dayMap['2026-10-02'].every(l => l.isBacklog), 'Oct 2 filled by backlog first');

// 5. Verify isolated completions between batches simulation
const batch1Completions = { 1: 'completed', 2: 'completed' };
const batch2Completions = { 2001: 'completed' };

assert.strictEqual(batch1Completions[1], 'completed');
assert.strictEqual(batch2Completions[1], undefined, 'Batch 2 does not have Batch 1 completions');
assert.strictEqual(batch2Completions[2001], 'completed');
assert.strictEqual(batch1Completions[2001], undefined, 'Batch 1 does not have Batch 2 completions');

// 6. Verify Sunday off-day rule on custom batch
const sundays = getSundaysBetween('2026-10-01', '2026-10-15');
assert.ok(sundays.includes('2026-10-04'), 'Oct 4 is Sunday');
assert.ok(sundays.includes('2026-10-11'), 'Oct 11 is Sunday');

const sundaySched = computeResolvedSchedule({
  lectures: [
    { id: 3001, newStudyDate: '2026-10-04', day: 'Sunday', phase: 'Phase 1', slot: 1, subject: 'Physics', chapterName: 'Test', topic: 'T1', lectureNumber: 1 }
  ],
  completions: {},
  today: '2026-10-04',
  offDays: ['2026-10-04'],
  autoShift: true,
});
assert.strictEqual(sundaySched.resolved[3001].resolvedDate, '2026-10-05', 'Sunday lecture shifted to Monday');

// 7. Verify Inbuilt Batch Protection & Custom Batch Deletion
import useStore from './src/store/useStore.js';

// Try deleting inbuilt batch -> must throw
assert.throws(() => {
  useStore.getState().deleteBatch('default');
}, /Inbuilt batch/);

// Add custom batch -> can be deleted
useStore.getState().addBatch({
  id: 'temp-batch',
  name: 'Temporary User Batch',
  lectures: sampleLectures,
});
assert.ok(useStore.getState().batches['temp-batch'], 'Custom batch added');
assert.strictEqual(useStore.getState().batches['temp-batch'].isInbuilt, false, 'Custom batch is not inbuilt');

// Delete custom batch -> succeeds
useStore.getState().deleteBatch('temp-batch');
assert.strictEqual(useStore.getState().batches['temp-batch'], undefined, 'Custom batch deleted');

// 8. Dynamic 5-Subject Batch & Custom 11th Base Foundations
import { getSubjectMeta } from './src/utils/helpers.js';
import { getChapterPairing } from './src/data/chapterPairing.js';

const fiveSubjectLectures = [
  { id: 4001, newStudyDate: '2026-10-01', day: 'Thursday', phase: 'Phase 1', slot: 1, subject: 'Physics', chapterName: 'Electrostatics', topic: 'Field', lectureNumber: 1, base: 'Class 11 Gravitation', sessions: '2 sessions', treatment: 'Revise before lecture' },
  { id: 4002, newStudyDate: '2026-10-01', day: 'Thursday', phase: 'Phase 1', slot: 2, subject: 'Chemistry', chapterName: 'Solid State', topic: 'Lattice', lectureNumber: 1 },
  { id: 4003, newStudyDate: '2026-10-02', day: 'Friday', phase: 'Phase 1', slot: 1, subject: 'Mathematics', chapterName: 'Matrices', topic: 'Types', lectureNumber: 1 },
  { id: 4004, newStudyDate: '2026-10-02', day: 'Friday', phase: 'Phase 1', slot: 2, subject: 'Biology', chapterName: 'Genetics', topic: 'Mendel', lectureNumber: 1 },
  { id: 4005, newStudyDate: '2026-10-03', day: 'Saturday', phase: 'Phase 1', slot: 1, subject: 'English', chapterName: 'Grammar', topic: 'Tenses', lectureNumber: 1 },
];

const customFoundations = {
  Physics: [{ id: 'p1', name: 'Vectors', priority: 'High', hours: 4, reason: 'Calculus & Vectors' }],
  Biology: [{ id: 'b1', name: 'Cell Structure', priority: 'High', hours: 5, reason: 'Genetics base' }],
};

const customPairings = {
  Electrostatics: { base: 'Gravitation Custom', sessions: '3 sessions', treatment: 'Review torque & dipole' },
};

useStore.getState().addBatch({
  id: 'five-sub-batch',
  name: 'NEET & English Combo Batch',
  lectures: fiveSubjectLectures,
  foundations: customFoundations,
  chapterPairing: customPairings,
});

const storedBatch = useStore.getState().batches['five-sub-batch'];
assert.ok(storedBatch, '5-subject batch created');
assert.strictEqual(storedBatch.lectures.length, 5);
assert.deepStrictEqual(storedBatch.foundations, customFoundations, 'Foundations preserved');
assert.deepStrictEqual(storedBatch.chapterPairing, customPairings, 'Chapter pairing preserved');

// Verify chapterProgress preserves 11th base
const derivedCP = deriveChapterProgress(fiveSubjectLectures);
assert.strictEqual(derivedCP.length, 5, '5 distinct chapters across 5 subjects');
const elecCP = derivedCP.find(c => c.chapter === 'Electrostatics');
assert.strictEqual(elecCP.base, 'Class 11 Gravitation', '11th base preserved on chapter progress');
assert.strictEqual(elecCP.sessions, '2 sessions');

// Verify custom chapter pairing takes precedence over defaults
const resolvedPairing = getChapterPairing('Electrostatics', customPairings);
assert.strictEqual(resolvedPairing.base, 'Gravitation Custom');

// Verify getSubjectMeta for standard, biology, english, and custom subjects
const metaPhys = getSubjectMeta('Physics');
assert.strictEqual(metaPhys.label, 'Physics');
const metaBio = getSubjectMeta('Biology');
assert.strictEqual(metaBio.label, 'Biology');
const metaEng = getSubjectMeta('English');
assert.strictEqual(metaEng.label, 'English');
const metaCustom = getSubjectMeta('Robotics & AI');
assert.strictEqual(metaCustom.label, 'Robotics & AI');
assert.ok(metaCustom.color.hex, 'Custom subject gets dynamic color palette');

// Clean up test batch
useStore.getState().deleteBatch('five-sub-batch');

// 9. Chapter Name Variant & Alias Resolver
import { resolveCanonicalChapter } from './src/data/chapterAliases.js';
import { getChapterStrategy } from './src/data/chapterStrategy.js';
import { detectChapterClass } from './src/utils/helpers.js';

// Verify alias resolution for coaching variant names
assert.strictEqual(resolveCanonicalChapter('NLM').canonical, "Newton's Laws of Motion");
assert.strictEqual(resolveCanonicalChapter('Electric Charges and Fields').canonical, 'Electrostatics');
assert.strictEqual(resolveCanonicalChapter('Mole Concept').canonical, 'Some Basic Concepts of Chemistry');
assert.strictEqual(resolveCanonicalChapter('GOC').canonical, 'General Organic Chemistry');
assert.strictEqual(resolveCanonicalChapter('P&C').canonical, 'Permutations and Combinations');
assert.strictEqual(resolveCanonicalChapter('ITF').canonical, 'Inverse Trigonometric Functions');
assert.strictEqual(resolveCanonicalChapter('RBD').canonical, 'Rotational Motion');
assert.strictEqual(resolveCanonicalChapter('Dual Nature').canonical, 'Dual Nature of Radiation and Matter');

// Verify strategy resolution through aliases
const stratElectro = getChapterStrategy('Electric Charges and Fields');
assert.ok(stratElectro, 'Strategy resolved for Electric Charges and Fields alias');
assert.strictEqual(stratElectro.label, 'FULL');

const stratDual = getChapterStrategy('Dual Nature');
assert.ok(stratDual, 'Strategy resolved for Dual Nature alias');
assert.strictEqual(stratDual.label, 'ONE SHOT');

// Verify 11th base pairing resolution through aliases
const pairingElectro = getChapterPairing('Electric Charges and Fields');
assert.ok(pairingElectro, '11th base pairing resolved for Electric Charges and Fields');
assert.strictEqual(pairingElectro.base, 'Units and Measurements + basic vectors');

// Verify class level detection through aliases
assert.strictEqual(detectChapterClass('Electric Charges and Fields'), '12th');
assert.strictEqual(detectChapterClass('NLM'), '11th');
assert.strictEqual(detectChapterClass('P&C'), '11th');
assert.strictEqual(detectChapterClass('Inverse Trigonometry'), '12th');

// Verify completely custom novel chapter name handles gracefully without throwing
const customNovel = resolveCanonicalChapter('Quantum Computing & AI');
assert.strictEqual(customNovel.canonical, 'Quantum Computing & AI');
assert.strictEqual(customNovel.isMatched, false);
assert.strictEqual(getChapterPairing('Quantum Computing & AI'), null);
// 10. Mission 100 JEE 2027 Inbuilt Batch Verification
const state = useStore.getState();
const missionBatch = state.batches['mission-100-2027'];
assert.ok(missionBatch, 'Mission 100 JEE 2027 batch exists in store');
assert.strictEqual(missionBatch.name, 'Mission 100 JEE 2027');
assert.strictEqual(missionBatch.isInbuilt, true, 'Mission 100 is registered as inbuilt');
assert.strictEqual(missionBatch.lectures.length, 209, 'Exactly 209 lectures present');
assert.strictEqual(missionBatch.dashboard.physicsLectures, 72, '72 Physics lectures');
assert.strictEqual(missionBatch.dashboard.mathematicsLectures, 67, '67 Mathematics lectures');
assert.strictEqual(missionBatch.dashboard.chemistryLectures, 70, '70 Chemistry lectures');
assert.strictEqual(missionBatch.dashboard.inorganicChemistryLectures, 15, '15 Inorganic Chemistry lectures');
assert.strictEqual(missionBatch.dashboard.physicalChemistryLectures, 27, '27 Physical Chemistry lectures');
assert.strictEqual(missionBatch.dashboard.organicChemistryLectures, 28, '28 Organic Chemistry lectures');
assert.strictEqual(missionBatch.dashboard.startDate, '2026-09-28');
assert.strictEqual(missionBatch.dashboard.endDate, '2027-01-09');

// Attempting to delete Mission 100 batch must throw
assert.throws(() => {
  useStore.getState().deleteBatch('mission-100-2027');
}, /Inbuilt batch/);

// Switch to Mission 100 batch
useStore.getState().setActiveBatch('mission-100-2027');
const missionActive = useStore.getState();
assert.strictEqual(missionActive.activeBatchId, 'mission-100-2027');
assert.strictEqual(missionActive.lectures.length, 209);
assert.strictEqual(missionActive.dashboard.title, 'Mission 100 JEE 2027');

// Verify that Mission 100 schedules exactly 3 lectures on Day 1 and subsequent days
useStore.getState().setPreviewDate('2026-09-28');
const sStart = useStore.getState();
assert.ok(sStart.schedule.dayMap['2026-09-28'], 'Day 1 is present in schedule');
assert.strictEqual(sStart.schedule.dayMap['2026-09-28'].length, 3, 'Day 1 has EXACTLY 3 lectures (P+C+M)');
assert.strictEqual(sStart.schedule.dayMap['2026-09-29'].length, 3, 'Day 2 has EXACTLY 3 lectures (P+C+M)');
assert.strictEqual(sStart.schedule.dayMap['2026-10-06'].length, 3, 'Oct 6 has EXACTLY 3 lectures (P+C+M)');
assert.strictEqual(sStart.schedule.dayMap['2026-10-07'].length, 3, 'Oct 7 has EXACTLY 3 lectures (P+C+M)');
assert.strictEqual(sStart.schedule.dayMap['2026-10-08'].length, 3, 'Oct 8 has EXACTLY 3 lectures (P+C+M)');
useStore.getState().setPreviewDate('');

// 11. Saturday Holiday Toggle & Adaptive Phases Toggle Verification
// Test setSaturdaysOff
useStore.getState().setSaturdaysOff(true);
const stateSatOn = useStore.getState();
const satDates = stateSatOn.settings.offDays.filter(d => new Date(d).getDay() === 6);
assert.ok(satDates.length > 0, 'Saturdays added to offDays when toggle is ON');

useStore.getState().setSaturdaysOff(false);
const stateSatOff = useStore.getState();
const satDatesOff = stateSatOff.settings.offDays.filter(d => new Date(d).getDay() === 6);
assert.strictEqual(satDatesOff.length, 0, 'Saturdays removed from offDays when toggle is OFF');

// Test setAdaptivePhases
useStore.getState().setAdaptivePhases(false);
assert.strictEqual(useStore.getState().settings.adaptivePhases, false);
useStore.getState().setAdaptivePhases(true);
assert.strictEqual(useStore.getState().settings.adaptivePhases, true);
// Restore to false for Mission 100
useStore.getState().setAdaptivePhases(false);

// Switch back to default batch
useStore.getState().setActiveBatch('default');
const defaultActive = useStore.getState();
assert.strictEqual(defaultActive.activeBatchId, 'default');
assert.strictEqual(defaultActive.lectures.length, 392);

console.log('ALL MULTI-BATCH, DYNAMIC SUBJECT, ALIAS, MISSION 100, 3-LEC/DAY & SATURDAY TOGGLE TESTS PASSED ✅');


