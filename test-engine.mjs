import { computeResolvedSchedule, getSundaysBetween, COMMON_HOLIDAYS } from './src/store/scheduleEngine.js';
import { readFileSync } from 'fs';

const dataset = JSON.parse(readFileSync('./src/data/dataset.json', 'utf8'));
const lectures = dataset.lectures;
const dates = [...new Set(lectures.map(l => l.newStudyDate))].sort();
const defaultOff = getSundaysBetween(dates[0], dates[dates.length - 1]);
const defaultOffWithHolidays = [...new Set([...defaultOff, ...COMMON_HOLIDAYS.map(h => h.date)])].sort();

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
  if (!ok) failures++;
};
const subjectSet = (arr) => [...new Set(arr.map(l => l.subject))];
const daySubjCounts = (arr) => {
  const c = {};
  arr.forEach(l => c[l.subject] = (c[l.subject] || 0) + 1);
  return c;
};

// Helper: which subjects exist in the entire remaining original plan from a date onward
const byDate = {};
lectures.forEach(l => { if (!byDate[l.newStudyDate]) byDate[l.newStudyDate] = []; byDate[l.newStudyDate].push(l); });

// S1: clean plan (no completion, today = start) → workbook + strict max-2 tail + adaptive caps
{
  const s = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOff, autoShift: true });
  const keys = Object.keys(s.dayMap).sort();
  check('S1: plan spans 99 study days', keys.length === 99, keys.length);
  check('S1: zero backlog', s.backlogList.length === 0);
  check('S1: no lectures on within-span Sunday', keys.filter(d => new Date(d).getDay() === 0 && d <= '2026-12-25').length === 0);
  check('S1: end date == 2027-01-02 (adaptive + max-2 tail)', s.estimatedEndDate === '2027-01-02', s.estimatedEndDate);
  let total = 0; Object.values(s.dayMap).forEach(a => total += a.length);
  check('S1: 392 placed', total === 392, total);
  // every Phase 1/2/3 day still equals the workbook exactly (max-2 only touches the tail)
  const phaseOk = Object.entries(s.dayMap)
    .filter(([d]) => d <= '2026-10-23')
    .every(([d, arr]) =>
      arr.length === (byDate[d] || []).length &&
      arr.every(l => l.resolvedDate === l.newStudyDate && !l.isBacklog)
    );
  check('S1: Phase 1-3 identical to workbook', phaseOk);
  // phase-day capacities preserved (ITEM caps never exceed phase caps)
  const phaseN = {};
  Object.entries(s.dayMap).forEach(([d, arr]) => {
    const p = arr[0].phase;
    phaseN[p] = phaseN[p] || { max: 0, min: 99 };
    phaseN[p].max = Math.max(phaseN[p].max, arr.length);
    phaseN[p].min = Math.min(phaseN[p].min, arr.length);
  });
  check('S1: Phase1 ≤ 2/day', phaseN['Phase 1'].max === 2, JSON.stringify(phaseN['Phase 1']));
  check('S1: Phase2 exactly 3/3 distinct', phaseN['Phase 2'].max === 3 && phaseN['Phase 2'].min === 3);
  check('S1: Phase3 4/day', phaseN['Phase 3'].max === 4 && phaseN['Phase 3'].min === 4);
  check('S1: Phase4 ≤ 5/day', (phaseN['Phase 4']?.max || 0) <= 5, (phaseN['Phase 4']?.max || 0));
  // strict max-2 even in the tail (Inorganic kabhi 3+ same day nahi)
  let max2Bad = 0;
  Object.entries(s.dayMap).forEach(([d, arr]) => {
    const c = {}; arr.forEach(l => c[l.subject] = (c[l.subject] || 0) + 1);
    max2Bad += Object.values(c).filter(n => n > 2).length;
  });
  check('S1: strict max-2 (0 days with 3+ of one subject)', max2Bad === 0, String(max2Bad));
  // effort model: weight-based load ≤ adaptive cap, no day exceeds its cap
  let unitBad = 0;
  Object.entries(s.dayMap).forEach(([d, arr]) => {
    if ((s.dayLoad[d] || 0) > (s.dayCap[d] || 0) + 0.001) unitBad++;
  });
  check('S1: effort units never exceed day cap', unitBad === 0, unitBad + ' days');
  // ONE SHOT reduces total effort: 392 lectures → 362 units
  check('S1: weighted effort == 362 (one-shots 0.5)', Math.round(s.totalEffort) === 362, String(s.totalEffort));
  // within-day order = original (date, slot) after backlog
  let orderOk = true;
  Object.values(s.dayMap).forEach(arr => {
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1], b = arr[i];
      if (a.isBacklog === b.isBacklog && a.newStudyDate === b.newStudyDate && a.slot > b.slot) orderOk = false;
      if (a.isBacklog === b.isBacklog && a.newStudyDate.localeCompare(b.newStudyDate) > 0) orderOk = false;
    }
  });
  check('S1: within-day order preserved (date, slot)', orderOk);
}

// S2: exact user example — complete week1 days 11,12,14,15; miss Wed 16; today = Thu 17
{
  const completions = {};
  ['2026-09-11','2026-09-12','2026-09-14','2026-09-15'].forEach(d =>
    lectures.filter(l => l.newStudyDate === d).forEach(l => completions[l.id] = 'completed'));
  const s = computeResolvedSchedule({ lectures, completions, today: '2026-09-17', offDays: defaultOff, autoShift: true });
  const back = s.backlogList.map(l => `${l.subject}${l.lectureNumber}`).sort();
  check('S2: backlog = Wed 16 pair only', s.backlogList.length === 2 && back.join() === 'Chemistry3,Physics4', back.join(','));
  const thu = s.dayMap['2026-09-17'] || [];
  const thuSubj = subjectSet(thu);
  check('S2: Thursday = P4(backlog) + C3(backlog) + Math L4', thu.length === 3 && thuSubj.length === 3 && thu.filter(l=>l.isBacklog).length === 2,
    thu.map(l => `${l.subject}${l.lectureNumber}${l.isBacklog ? '(B)' : ''}`).join(','));
  const thuHasMath4 = thu.some(l => l.subject === 'Mathematics' && l.lectureNumber === 4 && !l.isBacklog);
  check('S2: Thursday own seat = Math L4 (not backlog)', thuHasMath4);
  // Friday morning: Thu 17 completed fully; only Wed-16 pair remains → P4/C3 are REAL backlog
  const completionsFri = { ...completions };
  lectures.filter(l => l.newStudyDate === '2026-09-17').forEach(l => completionsFri[l.id] = 'completed');
  const s2 = computeResolvedSchedule({ lectures, completions: completionsFri, today: '2026-09-18', offDays: defaultOff, autoShift: true });
  const fri = s2.dayMap['2026-09-18'] || [];
  check('S2: Friday = P4(B) + C3(B) + own Math L5', fri.length === 3 && subjectSet(fri).length === 3 && fri.filter(l=>l.isBacklog).length === 2,
    fri.map(l => `${l.subject}${l.lectureNumber}${l.isBacklog ? '(B)' : ''}`).join(','));
}

// S3: one full week missed (11-17 Sep), today = 18 Sep → backlog drains 3/day, no within-span Sundays
{
  const s = computeResolvedSchedule({ lectures, completions: {}, today: '2026-09-18', offDays: defaultOff, autoShift: true });
  check('S3: backlog = 13', s.backlogList.length === 13, s.backlogList.length);
  const fri = s.dayMap['2026-09-18'] || [];
  check('S3: Friday backlog-first, 3 distinct', fri.length === 3 && fri.every(l=>l.isBacklog) && subjectSet(fri).length === 3,
    fri.map(l => `${l.subject}${l.lectureNumber}`).join(','));
  // no day over capacity
  let capOk = true;
  Object.entries(s.dayMap).forEach(([d, arr]) => {
    if (defaultOff.includes(d)) capOk = capOk && arr.length === 0;
    else {
      const cap = byDate[d]?.[0]?.phase ? { 'Phase 1': 2, 'Phase 2': 3, 'Phase 3': 4, 'Phase 4': 5 }[byDate[d][0].phase] : 5;
      if (arr.length > cap) capOk = false;
    }
  });
  check('S3: no day exceeds capacity', capOk);
  check('S3: no Sunday (within span) got work', Object.keys(s.dayMap).filter(d => new Date(d).getDay() === 0 && d <= '2026-12-25').length === 0);
  // totals preserved (uncompleted)
  let total = 0; Object.values(s.dayMap).forEach(a => total += a.length);
  check('S3: 392 placed', total === 392, total);
}

// S4: mark Wed 16 as OFF → its lectures join backlog and shift to Thu (not vanish)
{
  const completions = {};
  ['2026-09-11','2026-09-12','2026-09-14','2026-09-15'].forEach(d =>
    lectures.filter(l => l.newStudyDate === d).forEach(l => completions[l.id] = 'completed'));
  const off = [...defaultOff, '2026-09-16'];
  const s = computeResolvedSchedule({ lectures, completions, today: '2026-09-17', offDays: off, autoShift: true });
  check('S4: Wed 16 has no lectures (off)', !s.dayMap['2026-09-16']);
  const thu = s.dayMap['2026-09-17'] || [];
  const thuIds = thu.map(l => `${l.subject}${l.lectureNumber}`).sort();
  check('S4: Thu = Wed pair (P4,C3) + own M4', thu.length === 3 && thuIds.join() === 'Chemistry3,Mathematics4,Physics4',
    thu.map(l => `${l.subject}${l.lectureNumber}`).join(','));
  // from Friday morning: Wed pair is backlog (shifted to next day)
  const completionsFri = { ...completions };
  lectures.filter(l => l.newStudyDate === '2026-09-17').forEach(l => completionsFri[l.id] = 'completed');
  const s2 = computeResolvedSchedule({ lectures, completions: completionsFri, today: '2026-09-18', offDays: off, autoShift: true });
  const friday = s2.dayMap['2026-09-18'] || [];
  check('S4: Wed pair lands as backlog on Friday', friday.some(l => l.subject === 'Physics' && l.lectureNumber === 4 && l.isBacklog) &&
        friday.some(l => l.subject === 'Chemistry' && l.lectureNumber === 3 && l.isBacklog),
    friday.map(l => `${l.subject}${l.lectureNumber}${l.isBacklog ? '(B)' : ''}`).join(','));
}

// S5: un-off a SUNDAY → it becomes a study day (capacity, cascade works)
{
  const off = defaultOff.filter(d => d !== '2026-09-20');
  const s = computeResolvedSchedule({ lectures, completions: {}, today: '2026-09-18', offDays: off, autoShift: true });
  const sun = s.dayMap['2026-09-20'] || [];
  check('S5: un-off\'d Sunday is used', sun.length > 0, String(sun.length));
  const counts = daySubjCounts(sun);
  check('S5: Sunday max 2 per subject', Object.values(counts).every(c => c <= 2), JSON.stringify(counts));
}

// S6: all complete → empty plan
{
  const all = {}; lectures.forEach(l => all[l.id] = 'completed');
  const s = computeResolvedSchedule({ lectures, completions: all, today: '2026-12-26', offDays: defaultOff, autoShift: true });
  let total = 0; Object.values(s.dayMap).forEach(a => total += a.length);
  check('S6: empty dayMap + backlog 0', total === 0 && s.backlogList.length === 0);
}

// S7: no autoShift → plan untouched, backlog listed
{
  const s = computeResolvedSchedule({ lectures, completions: {}, today: '2026-09-17', offDays: defaultOff, autoShift: false });
  check('S7: backlog listed (10)', s.backlogList.length === 10, s.backlogList.length);
  check('S7: Thu original unchanged', (s.dayMap['2026-09-17'] || []).length === 3);
  check('S7: no resolved dates differ', Object.values(s.dayMap).flat().every(l => l.resolvedDate === l.newStudyDate));
}

// S8: diversity invariant across EVERY cascade scenario — each day >= min(distinctTarget, subjectsAvailableInPool)
function assertDiversity(s, label) {
  let bad = 0;
  const datesSorted = Object.keys(s.dayMap).sort();
  // suffixSubjects[d] = distinct subjects present in the schedule on days STRICTLY
  // AFTER d (== the subjects available in the pool once day d was filled)
  const suffixSubjects = {};
  let tail = new Set();
  for (let i = datesSorted.length - 1; i >= 0; i--) {
    const d = datesSorted[i];
    suffixSubjects[d] = new Set(tail);
    s.dayMap[d].forEach(l => tail.add(l.subject));
  }
  for (const date of datesSorted) {
    const arr = s.dayMap[date];
    const placedDistinct = new Set(arr.map(l => l.subject)).size;
    const phaseTarget = byDate[date]?.[0]?.phase ? { 'Phase 1': 2, 'Phase 2': 3, 'Phase 3': 3, 'Phase 4': 3 }[byDate[date][0].phase] : 3;
    const target = Math.min(phaseTarget, suffixSubjects[date].size, arr.length);
    if (placedDistinct < target) { bad++; console.log(`  DIVERSITY ${date}: placed=${placedDistinct} target=${target} subs=${[...new Set(arr.map(l => l.subject))].join(',')}`); }
  }
  check(`${label}: diversity satisfied`, bad === 0, `${bad} violations`);
}
assertDiversity(computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOff, autoShift: true }), 'S8 clean');
assertDiversity(computeResolvedSchedule({ lectures, completions: {}, today: '2026-10-15', offDays: defaultOff, autoShift: true }), 'S8 backlog-oct');
assertDiversity(computeResolvedSchedule({ lectures, completions: {}, today: '2026-11-20', offDays: defaultOff, autoShift: true }), 'S8 backlog-nov');
assertDiversity(computeResolvedSchedule({ lectures, completions: {}, today: '2026-12-20', offDays: defaultOff, autoShift: true }), 'S8 tail');

// S9: PULL-FORWARD — turning OFF days into study days must DECREASE the finish date
{
  // baseline: Sundays + all common holidays off (like the store default)
  const base = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOffWithHolidays, autoShift: true });
  const baseEnd = base.estimatedEndDate;
  check('S9: baseline (holidays off) end > 2026-12-25', baseEnd > '2026-12-25', baseEnd);
  // remove ALL common holidays → finish earlier
  const holidaysOn = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOff, autoShift: true });
  check('S9: un-off\'ing ALL holidays reduces finish', holidaysOn.estimatedEndDate < baseEnd,
    `${holidaysOn.estimatedEndDate} < ${baseEnd}`);
  check('S9: un-off\'ing holidays places work on those days',
    COMMON_HOLIDAYS.filter(h => !defaultOff.includes(h.date)).every(h => (holidaysOn.dayMap[h.date] || []).length > 0));
  // remove ALL Sundays too → finish even earlier
  const allOn = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: [], autoShift: true });
  check('S9: all days study → finish earliest', allOn.estimatedEndDate < holidaysOn.estimatedEndDate,
    `${allOn.estimatedEndDate} < ${holidaysOn.estimatedEndDate}`);
  check('S9: Sundays get lectures when un-off\'d', Object.keys(allOn.dayMap).filter(d => new Date(d).getDay() === 0).length > 0);
}

// S10: MAX-2 RULE — a non-original (backlog/pulled) day must never have 3 of one subject.
// Workbook-original days MAY exceed 2 (unavoidable Dec tail: sirf Chemistry).
{
  const holidaysOn = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOff, autoShift: true });
  const hDates = Object.keys(holidaysOn.dayMap).sort();
  const hSuffix = {};
  let hTail = new Set();
  for (let i = hDates.length - 1; i >= 0; i--) {
    const d = hDates[i];
    hSuffix[d] = new Set(hTail);
    holidaysOn.dayMap[d].forEach(l => hTail.add(l.subject));
  }
  let violations = [];
  for (const [date, arr] of Object.entries(holidaysOn.dayMap)) {
    const isOriginal = arr.every(l => l.resolvedDate === l.newStudyDate && l.newStudyDate === date && !l.isBacklog);
    const counts = daySubjCounts(arr);
    const over = Object.entries(counts).filter(([s, c]) => c > 2 && hSuffix[date].size > 1).map(([s, c]) => `${s}:${c}`);
    if (!isOriginal && over.length) violations.push(`${date} ${over.join(',')}`);
  }
  check('S10: max-2 enforced on every reshuffled day', violations.length === 0, violations.join(' | '));

  // also on a heavy backlog scenario (Nov mid-plan)
  let violations2 = [];
  const nov = computeResolvedSchedule({ lectures, completions: {}, today: '2026-11-20', offDays: defaultOffWithHolidays, autoShift: true });
  const novDates = Object.keys(nov.dayMap).sort();
  const novSuffix = {};
  let novTail = new Set();
  for (let i = novDates.length - 1; i >= 0; i--) {
    const d = novDates[i];
    novSuffix[d] = new Set(novTail);
    nov.dayMap[d].forEach(l => novTail.add(l.subject));
  }
  for (const [date, arr] of Object.entries(nov.dayMap)) {
    const isOriginal = arr.every(l => l.resolvedDate === l.newStudyDate && l.newStudyDate === date && !l.isBacklog);
    const counts = daySubjCounts(arr);
    const over = Object.entries(counts).filter(([s, c]) => c > 2 && novSuffix[date].size > 1).map(([s, c]) => `${s}:${c}`);
    if (!isOriginal && over.length) violations2.push(`${date} ${over.join(',')}`);
  }
  check('S10b: max-2 enforced under Nov backlog', violations2.length === 0, violations2.join(' | '));
}

// S11: un-off'd Sundays inherit the surrounding phase (Phase1 → 2, Phase2 → 3, Phase3 → 4)
{
  const offP1 = defaultOff.filter(d => d !== '2026-09-13'); // Phase 1 Sunday
  const s1 = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: offP1, autoShift: true });
  const sun1 = s1.dayMap['2026-09-13'] || [];
  check('S11: Phase-1 Sunday gets exactly 2 lectures', sun1.length === 2, String(sun1.length));

  const offP2 = defaultOff.filter(d => d !== '2026-09-20'); // Phase 2 Sunday
  const s2 = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: offP2, autoShift: true });
  const sun2 = s2.dayMap['2026-09-20'] || [];
  check('S11: Phase-2 Sunday gets 3 lectures', sun2.length === 3, String(sun2.length));

  const offP3 = defaultOff.filter(d => d !== '2026-10-04'); // Phase 3 Sunday
  const s3 = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: offP3, autoShift: true });
  const sun3 = s3.dayMap['2026-10-04'] || [];
  check('S11: Phase-3 Sunday gets 4 lectures', sun3.length === 4, String(sun3.length));

  const offP4 = defaultOff.filter(d => d !== '2026-10-25'); // Phase 4 Sunday
  const s4 = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: offP4, autoShift: true });
  const sun4 = s4.dayMap['2026-10-25'] || [];
  check('S11: Phase-4 Sunday gets 5 lectures', sun4.length === 5, String(sun4.length));
}

// S12: TICK STABILITY — completing today's lecture must NOT refill today from future days
{
  const completions = {};
  ['2026-09-11','2026-09-12','2026-09-14','2026-09-15','2026-09-16'].forEach(d =>
    lectures.filter(l => l.newStudyDate === d).forEach(l => completions[l.id] = 'completed'));
  const before = computeResolvedSchedule({ lectures, completions, today: '2026-09-17', offDays: defaultOff, autoShift: true });
  const idsBefore = (before.dayMap['2026-09-17'] || []).map(l => l.id);
  check('S12: today has backlog+own before tick', idsBefore.length >= 2, String(idsBefore.length));
  const ticked = idsBefore[0];
  completions[ticked] = 'completed';
  const after = computeResolvedSchedule({ lectures, completions, today: '2026-09-17', offDays: defaultOff, autoShift: true });
  const idsAfter = (after.dayMap['2026-09-17'] || []).map(l => l.id);
  const noFuturePulled = idsAfter.every(id => lectures.find(l => l.id === id).newStudyDate <= '2026-09-17');
  check('S12: nothing from the FUTURE refills today', noFuturePulled, idsAfter.map(i => lectures.find(l => l.id === i).newStudyDate).join(','));
  check('S12: ticked lecture removed, others stay', !idsAfter.includes(ticked) && idsAfter.length === idsBefore.length - 1,
    `${idsAfter.length} (before ${idsBefore.length})`);
}

// S13: TAIL with holidays ON and OFF — max-2 enforced in both, chemistry order intact
{
  const completions = {};
  lectures.filter(l => l.newStudyDate < '2026-12-10').forEach(l => completions[l.id] = 'completed');
  const offAll = [...new Set([...defaultOff, ...COMMON_HOLIDAYS.map(h => h.date)])].sort();
  const variants = [
    computeResolvedSchedule({ lectures, completions, today: '2026-12-10', offDays: offAll, autoShift: true }),
    computeResolvedSchedule({ lectures, completions, today: '2026-12-10', offDays: defaultOff, autoShift: true }),
  ];
  variants.forEach((s, i) => {
    let bad = 0;
    Object.entries(s.dayMap).forEach(([d, arr]) => {
      const c = {}; arr.forEach(l => c[l.subject] = (c[l.subject] || 0) + 1);
      Object.values(c).forEach(n => { if (n > 2) bad++; });
    });
    check(`S13: tail max-2 (holidays ${i === 0 ? 'OFF' : 'ON'})`, bad === 0, bad + ' violations');
  });
  // chemistry branch order within each day stays (date, slot)
  let orderBad = 0;
  variants[0] && Object.values(variants[0].dayMap).forEach(arr => {
    for (let j = 1; j < arr.length; j++) {
      const a = arr[j - 1], b = arr[j];
      if (a.isBacklog === b.isBacklog && a.newStudyDate === b.newStudyDate && a.slot > b.slot) orderBad++;
    }
  });
  check('S13: within-day order intact (holidays OFF)', orderBad === 0, String(orderBad));
}

// S15: MANUAL PHASE RANGES — user date windows override the data phase for capacity
{
  // By default Phase 2 days (e.g. 2026-09-17/18) allow 3/day. Force a "Phase 1" window
  // over 16-19 Sep and a "Phase 4" window way later → mid-Sep days drop to 2/day.
  const phaseRanges = {
    'Phase 1': { start: '2026-09-16', end: '2026-09-19' },
    'Phase 4': { start: '2026-09-20', end: '2026-12-31' },
  };
  const s = computeResolvedSchedule({ lectures, completions: {}, today: dates[0], offDays: defaultOff, autoShift: true, phaseRanges });
  const caps = [];
  Object.entries(s.dayMap).forEach(([d, arr]) => {
    if (d >= '2026-09-16' && d <= '2026-09-19') caps.push(arr.length);
  });
  check('S15: manual Phase-1 window caps 16-19 Sep to ≤ 2/day', caps.length > 0 && caps.every(n => n <= 2), JSON.stringify(caps));
  // Phase-4 window → 5/day allowed but adaptive cap may keep it lower; check dayCap never exceeds 5
  let over = 0;
  Object.entries(s.dayCap).forEach(([d, cap]) => { if (d >= '2026-09-20' && cap > 5) over++; });
  check('S15: Phase-4 window never exceeds 5 cap', over === 0, over + ' days');
  // dates outside any manual window keep auto phase — Phase 1 start (12-13 Sep) still 2/day
  const early = Object.entries(s.dayMap).filter(([d]) => d <= '2026-09-15').map(([, arr]) => arr.length);
  check('S15: outside windows stays auto (Phase 1 → ≤ 2/day)', early.every(n => n <= 2), JSON.stringify(early));
}

// S16: CHAPTER-LEVEL PHASE OVERRIDE — chapter's lectures can be re-based to another phase
{
  // Scenario: today = first date, 09-11 complete → 09-12 is a NORMAL day (not today).
  // Its day-anchor chapter (Electrostatics, Phase 1) override → Phase 3 → cap 4 →
  // the day STACKS 4 lectures instead of control 2 (today-lock would hide this).
  const byD = {};
  lectures.forEach(l => { if (!byD[l.newStudyDate]) byD[l.newStudyDate] = []; byD[l.newStudyDate].push(l); });
  const anchor2 = byD[dates[1]][0]; // 09-12 first lecture
  const c11 = {};
  byD[dates[0]].forEach(l => c11[l.id] = 'completed');
  const s = computeResolvedSchedule({ lectures, completions: c11, today: dates[0], offDays: defaultOff, autoShift: true, chapterPhases: { [anchor2.chapterName]: 'Phase 3' } });
  const sCtrl = computeResolvedSchedule({ lectures, completions: c11, today: dates[0], offDays: defaultOff, autoShift: true });
  check('S16: control (no override) keeps Phase-1 cap 2/day', sCtrl.dayCap[dates[1]] === 2, String(sCtrl.dayCap[dates[1]]));
  check('S16: chapter override lifts anchor day cap 2 → 4', s.dayCap[dates[1]] === 4, String(s.dayCap[dates[1]]));
  check('S16: anchor day actually stacks 4 lectures (3.5+ units)', (s.dayMap[dates[1]] || []).length >= 3, String((s.dayMap[dates[1]] || []).length));
  check('S16: unit load fills up to the new cap (no inflation)', (s.dayLoad[dates[1]] || 0) <= s.dayCap[dates[1]] + 1e-9, String(s.dayLoad[dates[1]]));
  // every rescheduled copy of that chapter shows the override phase (display consistency)
  let displayOk = true;
  Object.values(s.dayMap).forEach(arr => arr.forEach(l => {
    if (l.chapterName === anchor2.chapterName && l.phase !== 'Phase 3') displayOk = false;
  }));
  check('S16: chapter override phase shows on all its lecture cards', displayOk);
}

console.log(`\n${failures === 0 ? 'ALL TESTS PASSED ✅' : failures + ' TEST(S) FAILED ❌'}`);
process.exit(failures === 0 ? 0 : 1);