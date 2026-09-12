// ---------------------------------------------------------------------------
// Rules implemented (as confirmed by the user):
//  1. Backlog  = every incomplete lecture whose ORIGINAL date is in the past
//                (includes leftovers from half-done days).
//  2. Global ordered pool = every incomplete lecture, oldest first. Each study
//     day fills from the head of the pool:
//        • nothing is off        → each day keeps its own lectures (plan = original)
//        • an off day is removed → its lectures are placed on the next study day
//                                  (kal ka → aaj)
//        • a Sunday/holiday is switched ON as a study day → spare capacity PULLS
//          the nearest future lectures forward, so the finish date actually
//          decreases and those days show lectures.
//  3. Off days = skipped (default = every Sunday in the span + common holidays).
//     Any date can be toggled as an off day.
//  4. Diversity = each study day keeps the subject-mix rule of its phase:
//        Phase 1 → 2 distinct subjects
//        Phase 2 → 3 distinct subjects (P + M + C)
//        Phase 3 → 3 distinct subjects + 1 extra (any)
//        Phase 4 → 3 distinct subjects + 2 extra (any)
//     While filling, a subject that is NOT yet present in the day is preferred
//     (backlog me jo subject nahi hai, wahi daalna hai).
//  5. Max-2 rule (user): a day NEVER gets a 3rd lecture of the same subject
//     (so Inorganic 5-in-one-day can never happen, even in the tail).
//  6. Effort-units model (user): ONE SHOT chapter lectures weigh 0.5 of a full
//     lecture — "agar 4 per day se ho jata hai toh 5 kyun".
//     Daily capacity = EFFORT UNITS (Phase 1→2, 2→3, 3→4, 4→5), and the cap is
//     ADAPTIVE: each day takes only the units actually needed to finish the
//     remaining pool by the horizon (ceil(remainingUnits / studyDaysLeft)),
//     so light days stay light and heavy days catch up only when needed.
//  7. TODAY never pulls future lectures — ticking today's plan is stable.
//     Jab tak backlog pool me baaki hai, aaj SIRF backlog dikhta hai; aaj ke
//     apne lectures (newStudyDate === today) tabhi aate hain jab backlog khaali
//     ho — "uss din ke lectures backlog khatam hone ke baad".
//  8. COUNT cap per DISPLAYED phase (user): ek din me Phase X ke lectures us
//     phase ki daily capacity se zyada kabhi nahi — Phase 1 ≤ 2, Phase 2 ≤ 3,
//     Phase 3 ≤ 4, Phase 4 ≤ 5 (counting every lecture card the user sees).
//     Ye phase us lecture ka hai (card pill), day ki original date ki phase
//     se alag ho sakti hai — backlog 4 Phase-1 lectures ek "Phase 3 day" par
//     nahi aate. One-shot (0.5) lectures se bhi din count me nahi fat-ta.
// Data integrity: original dates/text/faculty are NEVER mutated; the engine
// only computes a `resolvedDate` layer on top.
// ---------------------------------------------------------------------------
import { getLectureLoad } from '../data/chapterStrategy.js';

// Static rule data — do not edit here, single source of truth for capacities.
export const PHASE_CAP = {
  'Phase 1': 2,
  'Phase 2': 3,
  'Phase 3': 4,
  'Phase 4': 5,
};

export const PHASE_DISTINCT = {
  'Phase 1': 2,
  'Phase 2': 3,
  'Phase 3': 3,
  'Phase 4': 3,
};

// Non-Sunday public/common holidays (toggle-based). Student decides OFF/ON.
export const COMMON_HOLIDAYS = [
  { date: '2026-09-14', label: 'Common Holiday' },
  { date: '2026-10-02', label: 'Common Holiday' },
  { date: '2026-10-20', label: 'Common Holiday' },
  { date: '2026-11-06', label: 'Common Holiday' },
  { date: '2026-11-07', label: 'Common Holiday' },
  { date: '2026-11-09', label: 'Common Holiday' },
  { date: '2026-11-11', label: 'Common Holiday' },
  { date: '2026-11-16', label: 'Common Holiday' },
  { date: '2026-12-25', label: 'Common Holiday' },
];

// Fallback load for dates beyond every original day (pure overflow / safety).
const DEFAULT_CAP = 5;
const DEFAULT_DISTINCT = 3;

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getSundaysBetween(startDate, endDate) {
  const out = [];
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    if (d.getDay() === 0) out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * @param lectures     array of lecture objects (dataset, unmodified)
 * @param completions  { id: 'completed' | 'not_started' }
 * @param today        'YYYY-MM-DD' anchor date (previewDate || system today)
 * @param offDays      array of 'YYYY-MM-DD' dates treated as holidays
 * @param autoShift    bool — false keeps the original plan (backlog shown, not pushed)
 * @param phaseRanges  { 'Phase 1': {start,end}, ... } — manual date windows (win over data phase)
 * @param chapterPhases { [chapterName]: 'Phase 2' } — per-chapter phase override (display + anchoring)
 * @param horizonDate  'YYYY-MM-DD' — adaptive cap target (default = last original lecture date)
 * @returns { resolved, dayMap, backlogList, missedDates, offDays, estimatedEndDate }
 */
export function computeResolvedSchedule(args) {
  const { lectures, completions, today, offDays = [], autoShift = true } = args;
  const options = args;
  const offSet = new Set(offDays);
  const completed = (id) => completions[id] === 'completed';

  // Group original plan by date
  const byDate = {};
  lectures.forEach(l => {
    if (!byDate[l.newStudyDate]) byDate[l.newStudyDate] = [];
    byDate[l.newStudyDate].push(l);
  });
  const sortedDates = Object.keys(byDate).sort();
  const startDate = sortedDates[0] || today;
  const lastDate = sortedDates[sortedDates.length - 1] || today;

  // Effective phase of a lecture: manual chapter override > data phase.
  // options.chapterPhases = { [chapterName]: 'Phase 2' } (user-set).
  const effPhase = (l) => options.chapterPhases?.[l.chapterName] || l.phase;

  const phaseFor = (date) => {
    // MANUAL PHASE RANGES (user): if the date falls inside a user-set phase
    // window, that phase wins — "itne din tak yeh phase rahegi".
    const ranges = options.phaseRanges;
    if (ranges) {
      for (const p of ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']) {
        const r = ranges[p];
        if (r && r.start && r.end && date >= r.start && date <= r.end) return p;
      }
    }
    const arr = byDate[date];
    if (arr && arr.length) return effPhase(arr[0]);
    // No own lectures (e.g. an un-off'd Sunday): inherit the phase of the NEAREST
    // original study day. Phase 1 stretch ka Sunday → 2 lectures, Phase 2 → 3, etc.
    let best = sortedDates[0];
    let bestDist = Infinity;
    const t = new Date(date).getTime();
    for (const d of sortedDates) {
      const dist = Math.abs(new Date(d).getTime() - t);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    const arr2 = byDate[best];
    return (arr2 && arr2.length ? effPhase(arr2[0]) : 'Phase 4') || 'Phase 4';
  };

  const capacityFor = (date) => {
    if (offSet.has(date)) return 0;
    return PHASE_CAP[phaseFor(date)] || DEFAULT_CAP;
  };

  const distinctTargetFor = (date) => {
    const cap = capacityFor(date);
    if (cap === 0) return 0;
    return Math.min(PHASE_DISTINCT[phaseFor(date)] ?? DEFAULT_DISTINCT, cap);
  };

  const sortByDateSlot = (arr) =>
    arr.sort((a, b) =>
      a.newStudyDate === b.newStudyDate ? a.slot - b.slot : a.newStudyDate.localeCompare(b.newStudyDate)
    );

  const makeBacklog = () =>
    sortByDateSlot(
      lectures.filter(l => l.newStudyDate < today && !completed(l.id))
    );

  // ---------------------------------------------------------------- AUTO SHIFT OFF
  if (!autoShift) {
    const resolved = {};
    const dayMap = {};
    lectures.forEach(l => {
      if (completed(l.id)) return;
      const isBacklog = l.newStudyDate < today;
      resolved[l.id] = { resolvedDate: l.newStudyDate, isBacklog };
      if (!dayMap[l.newStudyDate]) dayMap[l.newStudyDate] = [];
      dayMap[l.newStudyDate].push({ ...l, phase: effPhase(l), isBacklog, resolvedDate: l.newStudyDate });
    });
    Object.values(dayMap).forEach(arr => arr.sort((a, b) => a.slot - b.slot));
    const backlogList = makeBacklog();
    const missedDates = [...new Set(backlogList.map(l => l.newStudyDate))].sort();
    return {
      resolved, dayMap, backlogList, missedDates, offDays, estimatedEndDate: lastDate,
      dayCap: {}, dayLoad: {},
      effortRemaining: 0,
      totalEffort: lectures.filter(l => !completed(l.id)).reduce((s, l) => s + getLectureLoad(l), 0),
    };
  }

  // ---------------------------------------------------------------- AUTO SHIFT ON
  // Global ordered pool: EVERY incomplete lecture, oldest (date, slot) first.
  //
  // With no off days this reproduces the workbook exactly (each day consumes its
  // own lectures, which are always the head of the pool). When a day is off, its
  // lectures stay in the pool and are consumed by the next study day (cascade).
  // When a previously-off day is switched ON, its spare capacity consumes the
  // head of the pool = the nearest FUTURE lectures, so the whole plan pulls
  // forward and the finish date shrinks.
  const pool = sortByDateSlot(lectures.filter(l => !completed(l.id)));

  // Weighted effort remaining (ONE SHOT lectures weigh 0.5).
  const totalEffortUnits = pool.reduce((s, l) => s + getLectureLoad(l), 0);
  let remainingUnits = totalEffortUnits;

  // Finish horizon — DEFAULT = the very last original lecture date (Dec 25 tak
  // khatam). Adaptive cap targets finishing the whole pool by this horizon.
  const horizon = new Date(options.horizonDate || lastDate);
  const horizonISO = toISODate(horizon);
  const countStudyDays = (from) => {
    let n = 0;
    for (let d = new Date(from); d <= horizon; d.setDate(d.getDate() + 1)) {
      if (!offSet.has(toISODate(d))) n++;
    }
    return n;
  };

  // Walk every date from today out to a generous horizon (overflow room).
  const end = new Date(lastDate);
  end.setDate(end.getDate() + 400);
  const dayList = [];
  for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) dayList.push(toISODate(d));

  const resolved = {};
  const dayCap = {};   // adaptive capacity in effort units per date (0 = off)
  const dayLoad = {};  // actual effort units placed per date

  for (const date of dayList) {
    if (pool.length === 0) break; // everything already placed
    const phaseCap = capacityFor(date);
    if (phaseCap === 0) continue; // OFF DAY → nothing consumed; its lectures stay for a study day

    // ADAPTIVE CAP ("according to days"):
    //   needed = ceil(remaining effort units / study days left till horizon)
    //   cap    = min(phase max, needed)
    // Agar 4/day se kaam nikal jata hai toh 5 kyun? Exactly yahi logic hai —
    // light days light rehte hain, aur pichde ho toh hi cap upar jata hai.
    const studyDaysLeft = countStudyDays(date);
    const needed = Math.ceil(remainingUnits / Math.max(1, studyDaysLeft));
    const cap = Math.min(phaseCap, Math.max(1, needed));
    dayCap[date] = cap;

    // TODAY is special: we NEVER pull future lectures into it. Completing one of
    // today's lectures must NOT refill today from tomorrow (stability while ticking).
    // Aur jab tak backlog pool me baaki hai, aaj SIRF backlog dikhta hai — aaj ke
    // apne lectures (newStudyDate === today) backlog khatam hone ke baad hi aayenge.
    const isToday = date === today;
    let selectable;
    if (isToday) {
      const backlogLeft = pool.filter(l => l.newStudyDate < today);
      selectable = backlogLeft.length > 0
        ? backlogLeft                                 // backlog baaki → sirf backlog
        : pool.filter(l => l.newStudyDate <= today);  // backlog khaali → aaj ke apne
    } else {
      selectable = pool;
    }
    if (selectable.length === 0) continue; // today: koi backlog/own nahi → aaj khali

    // ENGINE MODE — backlog / pulled-forward / spare-capacity day.
    const selected = [];
    const selectedSet = new Set(); // IDs already picked TODAY — kabhi duplicate mat uthao
    const dayCounts = {}; // subject -> number of lectures already picked TODAY (max 2)
    const phaseCounts = {}; // displayed phase -> lectures already picked TODAY (count cap)
    const distinctTarget = Math.min(distinctTargetFor(date), cap);
    const subjectActive = (s) => (dayCounts[s] || 0) > 0;
    const phaseOf = (l) => effPhase(l) || 'Phase 4';
    const phaseCountOk = (l) => (phaseCounts[phaseOf(l)] || 0) < (PHASE_CAP[phaseOf(l)] ?? DEFAULT_CAP);
    const bumpPhase = (l) => {
      const p = phaseOf(l);
      phaseCounts[p] = (phaseCounts[p] || 0) + 1;
    };
    let dayUnits = 0; // effort units consumed today

    // Pass 1 — fill the distinct-subject requirement.
    // Prefers a subject NOT yet present in the day ("jo subject mein nahi hai wohi").
    let guard = 0;
    while (selected.length < distinctTarget && selected.length < cap && dayUnits < cap - 1e-9 && guard++ < 100) {
      const cand = selectable.find(l => !selectedSet.has(l.id) && !subjectActive(l.subject) && phaseCountOk(l));
      if (!cand) break;
      selected.push(cand);
      selectedSet.add(cand.id);
      dayCounts[cand.subject] = (dayCounts[cand.subject] || 0) + 1;
      bumpPhase(cand);
      dayUnits += getLectureLoad(cand);
      remainingUnits -= getLectureLoad(cand);
      pool.splice(pool.indexOf(cand), 1);
    }

    // Pass 2 — fill the remaining slots.
    // Item count NEVER exceeds the phase cap (Phase 1→2, 2→3, 3→4, 4→5) and
    // effort units NEVER exceed it either. STRICT Max-2 rule: a day NEVER gets a
    // 3rd lecture of the same subject (Inorganic 5-in-one-day impossible). Only
    // lectures that FIT the remaining units are taken. selectedSet guards against
    // re-picking the same lecture (TO-DAY selectable is a separate filtered array,
    // so pass 2 must never double-select pass 1's picks). Count per DISPLAYED
    // phase bhi bounded hai (4 Phase-1 cards ek din me kabhi nahi).
    while (selected.length < cap && dayUnits < cap - 1e-9) {
      const cand = selectable.find(
        l => !selectedSet.has(l.id) && (dayCounts[l.subject] || 0) < 2 && phaseCountOk(l) && dayUnits + getLectureLoad(l) <= cap + 1e-9
      );
      if (!cand) break;
      selected.push(cand);
      selectedSet.add(cand.id);
      dayCounts[cand.subject] = (dayCounts[cand.subject] || 0) + 1;
      bumpPhase(cand);
      dayUnits += getLectureLoad(cand);
      remainingUnits -= getLectureLoad(cand);
      pool.splice(pool.indexOf(cand), 1);
    }
    dayLoad[date] = dayUnits;

    selected.forEach(l => {
      resolved[l.id] = { resolvedDate: date, isBacklog: l.newStudyDate < today };
    });
  }

  // Safety net (should never trigger with a 400-day horizon)
  pool.forEach(l => {
    if (!resolved[l.id]) resolved[l.id] = { resolvedDate: toISODate(end), isBacklog: true };
  });

  // Build the resolved day map (incomplete lectures only)
  const dayMap = {};
  lectures.forEach(l => {
    if (completed(l.id)) return;
    const r = resolved[l.id];
    if (!r) return;
    if (!dayMap[r.resolvedDate]) dayMap[r.resolvedDate] = [];
    dayMap[r.resolvedDate].push({ ...l, phase: effPhase(l), isBacklog: r.isBacklog, resolvedDate: r.resolvedDate });
  });
  // Keep lectures in their ORIGINAL (date, slot) order within each day — never
  // re-sort by slot alone (that scrambles pulled-forward days, e.g. IC4 of an
  // earlier date showing AFTER IC5 of a later date). Backlog stays on top.
  Object.values(dayMap).forEach(arr =>
    arr.sort((a, b) =>
      (Number(b.isBacklog) - Number(a.isBacklog)) ||
      (a.newStudyDate === b.newStudyDate ? a.slot - b.slot : a.newStudyDate.localeCompare(b.newStudyDate))
    )
  );

  // Backlog pool + red-zone (missed) dates
  const backlogList = makeBacklog();
  const missedDates = [...new Set(backlogList.map(l => l.newStudyDate))].sort();

  // Estimated completion date = the last unresolved lecture's resolved date
  let estEnd = '';
  Object.entries(resolved).forEach(([id, r]) => {
    if (r.resolvedDate > estEnd) estEnd = r.resolvedDate;
  });
  const anyIncomplete = lectures.some(l => !completed(l.id));
  const estimatedEndDate = anyIncomplete && estEnd ? estEnd : lastDate;

  return {
    resolved,
    dayMap,
    backlogList,
    missedDates,
    offDays,
    estimatedEndDate,
    dayCap,          // adaptive capacity (effort units) per date, 0 = off day
    dayLoad,         // effort units actually placed per date
    effortRemaining: remainingUnits, // leftover after the whole run (normally 0)
    totalEffort: totalEffortUnits,   // full weighted effort of the remaining pool
  };
}