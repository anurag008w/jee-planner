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
//     lecture. Daily capacity = EFFORT UNITS (Phase 1→2, 2→3, 3→4, 4→5), and
//     the cap is ADAPTIVE: each day takes only the units actually needed to
//     finish the remaining pool by the horizon.
//  7. TODAY never pulls future lectures — ticking today's plan is stable.
//     Jab tak backlog pool me baaki hai, aaj SIRF backlog dikhta hai; aaj ke
//     apne lectures (newStudyDate === today) tabhi aate hain jab backlog khaali
//     ho — "uss din ke lectures backlog khatam hone ke baad".
//  8. COUNT cap per DISPLAYED phase (user): ek din me Phase X ke lectures us
//     phase ki daily capacity se zyada kabhi nahi — Phase 1 ≤ 2, Phase 2 ≤ 3,
//     Phase 3 ≤ 4, Phase 4 ≤ 5 (counting every lecture card the user sees).
//  9. SEQUENCE INTEGRITY: within the same subject + chemistry branch + chapter,
//     Lecture N+1 can never be scheduled before the next incomplete Lecture N.
//     This constraint is enforced DURING selection, not as a later date-shift,
//     so day caps and dayLoad stay consistent with the displayed schedule.
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

function lectureOrder(a, b) {
  const an = Number(a.lectureNumber);
  const bn = Number(b.lectureNumber);
  const aNum = Number.isFinite(an) && an > 0 ? an : Number.MAX_SAFE_INTEGER;
  const bNum = Number.isFinite(bn) && bn > 0 ? bn : Number.MAX_SAFE_INTEGER;
  return aNum - bNum
    || a.newStudyDate.localeCompare(b.newStudyDate)
    || (Number(a.slot) || 0) - (Number(b.slot) || 0)
    || a.id - b.id;
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

  // Group original plan by date.
  const byDate = {};
  lectures.forEach((l) => {
    if (!byDate[l.newStudyDate]) byDate[l.newStudyDate] = [];
    byDate[l.newStudyDate].push(l);
  });
  const sortedDates = Object.keys(byDate).sort();
  const startDate = sortedDates[0] || today;
  const lastDate = sortedDates[sortedDates.length - 1] || today;

  // Effective phase of a lecture: manual chapter override > data phase.
  const effPhase = (l) => options.chapterPhases?.[l.chapterName] || l.phase;

  const phaseFor = (date) => {
    const ranges = options.phaseRanges;
    if (ranges) {
      for (const p of ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']) {
        const r = ranges[p];
        if (r && r.start && r.end && date >= r.start && date <= r.end) return p;
      }
    }

    const arr = byDate[date];
    if (arr && arr.length) return effPhase(arr[0]);

    // No own lectures (e.g. an un-off'd Sunday): inherit the phase of the nearest
    // original study day so its daily capacity remains predictable.
    let best = sortedDates[0];
    let bestDist = Infinity;
    const t = new Date(date).getTime();
    for (const d of sortedDates) {
      const dist = Math.abs(new Date(d).getTime() - t);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
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

  const sortByDateSlot = (arr) => arr.sort((a, b) =>
    a.newStudyDate === b.newStudyDate
      ? (Number(a.slot) || 0) - (Number(b.slot) || 0) || a.id - b.id
      : a.newStudyDate.localeCompare(b.newStudyDate)
  );

  const makeBacklog = () => sortByDateSlot(
    lectures.filter((l) => l.newStudyDate < today && !completed(l.id))
  );

  // ---------------------------------------------------------------- AUTO SHIFT OFF
  if (!autoShift) {
    const resolved = {};
    const dayMap = {};
    lectures.forEach((l) => {
      if (completed(l.id)) return;
      const isBacklog = l.newStudyDate < today;
      resolved[l.id] = { resolvedDate: l.newStudyDate, isBacklog };
      if (!dayMap[l.newStudyDate]) dayMap[l.newStudyDate] = [];
      dayMap[l.newStudyDate].push({
        ...l,
        phase: effPhase(l),
        isBacklog,
        resolvedDate: l.newStudyDate,
      });
    });
    Object.values(dayMap).forEach((arr) => arr.sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0)));
    const backlogList = makeBacklog();
    const missedDates = [...new Set(backlogList.map((l) => l.newStudyDate))].sort();
    return {
      resolved,
      dayMap,
      backlogList,
      missedDates,
      offDays,
      estimatedEndDate: lastDate,
      dayCap: {},
      dayLoad: {},
      effortRemaining: 0,
      totalEffort: lectures.filter((l) => !completed(l.id)).reduce((s, l) => s + getLectureLoad(l), 0),
    };
  }

  // ---------------------------------------------------------------- AUTO SHIFT ON
  // Global pool is still ordered by original date/slot, but candidate selection
  // additionally requires the lecture to be the NEXT incomplete lecture in its
  // own subject + branch + chapter series. This is the key ordering invariant:
  // a later lecture can never leapfrog an earlier incomplete lecture.
  const pool = sortByDateSlot(lectures.filter((l) => !completed(l.id)));

  const seriesKey = (lecture) =>
    [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');

  const seriesLists = {};
  pool.forEach((lecture) => {
    const key = seriesKey(lecture);
    if (!seriesLists[key]) seriesLists[key] = [];
    seriesLists[key].push(lecture);
  });
  Object.values(seriesLists).forEach((series) => series.sort(lectureOrder));

  const seriesNextId = new Map();
  Object.entries(seriesLists).forEach(([key, series]) => {
    if (series[0]) seriesNextId.set(key, series[0].id);
  });

  const advanceSeries = (lecture) => {
    const key = seriesKey(lecture);
    const series = seriesLists[key] || [];
    const index = series.findIndex((item) => item.id === lecture.id);
    if (index < 0) return;
    seriesNextId.set(key, series[index + 1]?.id ?? null);
  };

  const isSequenceEligible = (lecture) => seriesNextId.get(seriesKey(lecture)) === lecture.id;

  const totalEffortUnits = pool.reduce((s, l) => s + getLectureLoad(l), 0);
  let remainingUnits = totalEffortUnits;

  const horizon = new Date(options.horizonDate || lastDate);
  const countStudyDays = (from) => {
    let n = 0;
    for (let d = new Date(from); d <= horizon; d.setDate(d.getDate() + 1)) {
      if (!offSet.has(toISODate(d))) n++;
    }
    return n;
  };

  const end = new Date(lastDate);
  end.setDate(end.getDate() + 400);
  const dayList = [];
  for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) dayList.push(toISODate(d));

  const resolved = {};
  const dayCap = {};
  const dayLoad = {};

  for (const date of dayList) {
    if (pool.length === 0) break;
    const phaseCap = capacityFor(date);
    if (phaseCap === 0) continue;

    const studyDaysLeft = countStudyDays(date);
    const needed = Math.ceil(remainingUnits / Math.max(1, studyDaysLeft));
    const cap = Math.min(phaseCap, Math.max(1, needed));
    dayCap[date] = cap;

    // TODAY is intentionally isolated from future lectures. Completion actions
    // can therefore remove cards without refilling today from tomorrow.
    const isToday = date === today;
    const selectable = isToday
      ? (pool.some((l) => l.newStudyDate < today)
          ? pool.filter((l) => l.newStudyDate < today)
          : pool.filter((l) => l.newStudyDate <= today))
      : pool;
    if (selectable.length === 0) continue;

    const selected = [];
    const selectedSet = new Set();
    const dayCounts = {};
    const phaseCounts = {};
    const distinctTarget = Math.min(distinctTargetFor(date), cap);
    const subjectActive = (subject) => (dayCounts[subject] || 0) > 0;
    const phaseOf = (l) => effPhase(l) || 'Phase 4';
    const phaseCountOk = (l) => (phaseCounts[phaseOf(l)] || 0) < (PHASE_CAP[phaseOf(l)] ?? DEFAULT_CAP);

    const pick = (predicate) => {
      const cand = selectable.find((l) =>
        !selectedSet.has(l.id)
        && pool.includes(l)
        && isSequenceEligible(l)
        && phaseCountOk(l)
        && predicate(l)
      );
      if (!cand) return false;

      selected.push(cand);
      selectedSet.add(cand.id);
      dayCounts[cand.subject] = (dayCounts[cand.subject] || 0) + 1;
      const p = phaseOf(cand);
      phaseCounts[p] = (phaseCounts[p] || 0) + 1;
      const load = getLectureLoad(cand);
      dayLoad[date] = (dayLoad[date] || 0) + load;
      remainingUnits -= load;
      pool.splice(pool.indexOf(cand), 1);
      advanceSeries(cand);
      return true;
    };

    // Pass 1 — ensure as many distinct subjects as the current phase/cap allows.
    let guard = 0;
    while (selected.length < distinctTarget && selected.length < cap && (dayLoad[date] || 0) < cap - 1e-9 && guard++ < 100) {
      const picked = pick((l) => !subjectActive(l.subject));
      if (!picked) break;
    }

    // Pass 2 — fill remaining capacity, never exceeding two lectures of one subject
    // or the per-lecture displayed-phase count cap.
    guard = 0;
    while (selected.length < cap && (dayLoad[date] || 0) < cap - 1e-9 && guard++ < 100) {
      const picked = pick((l) =>
        (dayCounts[l.subject] || 0) < 2
        && (dayLoad[date] || 0) + getLectureLoad(l) <= cap + 1e-9
      );
      if (!picked) break;
    }

    // Keep the final metric present for days that did receive zero selected cards
    // only when the engine actually opened a study day.
    if (!(date in dayLoad)) dayLoad[date] = 0;

    selected.forEach((l) => {
      resolved[l.id] = {
        resolvedDate: date,
        isBacklog: l.newStudyDate < today,
      };
    });
  }

  // Safety net — should never trigger with the generous 400-day overflow horizon.
  // It does NOT merge lectures into a capped day; each leftover gets its own
  // overflow date, preserving the scheduler's hard daily limits.
  if (pool.length > 0) {
    let cursor = new Date(end);
    const overflowLoad = new Map();
    pool.forEach((lecture) => {
      const key = toISODate(cursor);
      const current = overflowLoad.get(key) || 0;
      const load = getLectureLoad(lecture);
      if (current + load > DEFAULT_CAP + 1e-9) {
        cursor.setDate(cursor.getDate() + 1);
      }
      const date = toISODate(cursor);
      resolved[lecture.id] = {
        resolvedDate: date,
        isBacklog: lecture.newStudyDate < today,
      };
      overflowLoad.set(date, (overflowLoad.get(date) || 0) + load);
    });
  }

  const dayMap = {};
  lectures.forEach((l) => {
    if (completed(l.id)) return;
    const r = resolved[l.id];
    if (!r) return;
    if (!dayMap[r.resolvedDate]) dayMap[r.resolvedDate] = [];
    dayMap[r.resolvedDate].push({
      ...l,
      phase: effPhase(l),
      isBacklog: r.isBacklog,
      resolvedDate: r.resolvedDate,
    });
  });

  Object.values(dayMap).forEach((arr) => {
    arr.sort((a, b) =>
      (Number(b.isBacklog) - Number(a.isBacklog))
      || (a.newStudyDate === b.newStudyDate
        ? (Number(a.slot) || 0) - (Number(b.slot) || 0)
        : a.newStudyDate.localeCompare(b.newStudyDate))
      || a.id - b.id
    );
  });

  const backlogList = makeBacklog();
  const missedDates = [...new Set(backlogList.map((l) => l.newStudyDate))].sort();

  let estEnd = '';
  Object.values(resolved).forEach((r) => {
    if (r.resolvedDate > estEnd) estEnd = r.resolvedDate;
  });
  const anyIncomplete = lectures.some((l) => !completed(l.id));
  const estimatedEndDate = anyIncomplete && estEnd ? estEnd : lastDate;

  return {
    resolved,
    dayMap,
    backlogList,
    missedDates,
    offDays,
    estimatedEndDate,
    dayCap,
    dayLoad,
    effortRemaining: remainingUnits,
    totalEffort: totalEffortUnits,
  };
}
