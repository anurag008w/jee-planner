// ---------------------------------------------------------------------------
// Schedule engine rules
//  1. Backlog = every incomplete lecture whose original schedule date is past.
//  2. Global ordered pool = every incomplete lecture, oldest date/slot first.
//  3. Off days consume nothing; their work cascades to later study days.
//  4. Subject diversity is preferred, but never above hard caps.
//  5. HARD SUBJECT CAP = maximum 2 lectures of the same subject per day.
//  6. HARD DISPLAYED-PHASE CAP = Phase 1→2, Phase 2→3, Phase 3→4, Phase 4→5 cards/day.
//  7. HARD EFFORT CAP = Phase 1→2, Phase 2→3, Phase 3→4, Phase 4→5 effort units/day.
//  8. One-shot chapters weigh 0.5 effort units but still count as one displayed card.
//  9. Sequence invariant: within subject + chemistry branch + chapter, the next
//     incomplete lecture must be scheduled before any later incomplete lecture.
//     This is enforced while selecting, never by a later date-shift.
// 10. TODAY never pulls future lectures and stays stable when completion actions freeze it.
// 11. Safety/overflow logic also obeys the exact same hard limits.
// Data integrity: dataset dates/text/faculty are never mutated; only resolvedDate is computed.
// ---------------------------------------------------------------------------
import { getLectureLoad } from '../data/chapterStrategy.js';

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
const EPS = 1e-9;

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getSundaysBetween(startDate, endDate) {
  const result = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end) {
    if (cursor.getDay() === 0) result.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

const lectureOrder = (a, b) => {
  const an = Number(a.lectureNumber);
  const bn = Number(b.lectureNumber);
  const aNum = Number.isFinite(an) && an > 0 ? an : Number.MAX_SAFE_INTEGER;
  const bNum = Number.isFinite(bn) && bn > 0 ? bn : Number.MAX_SAFE_INTEGER;
  return aNum - bNum
    || a.newStudyDate.localeCompare(b.newStudyDate)
    || (Number(a.slot) || 0) - (Number(b.slot) || 0)
    || a.id - b.id;
};

export function computeResolvedSchedule(args) {
  const { lectures, completions, today, offDays = [], autoShift = true } = args;
  const options = args;
  const offSet = new Set(offDays);
  const completed = (id) => completions[id] === 'completed';
  const effPhase = (lecture) => options.chapterPhases?.[lecture.chapterName] || lecture.phase;
  const seriesKey = (lecture) =>
    [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');

  const sortedLectures = [...lectures].sort((a, b) =>
    a.newStudyDate === b.newStudyDate
      ? (Number(a.slot) || 0) - (Number(b.slot) || 0) || a.id - b.id
      : a.newStudyDate.localeCompare(b.newStudyDate)
  );

  const sortedDates = [...new Set(sortedLectures.map((l) => l.newStudyDate))].sort();
  const startDate = sortedDates[0] || today;
  const lastDate = sortedDates[sortedDates.length - 1] || today;

  const byDate = {};
  sortedLectures.forEach((lecture) => {
    if (!byDate[lecture.newStudyDate]) byDate[lecture.newStudyDate] = [];
    byDate[lecture.newStudyDate].push(lecture);
  });

  const phaseFor = (date) => {
    const ranges = options.phaseRanges;
    if (ranges) {
      for (const phase of ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']) {
        const range = ranges[phase];
        if (range?.start && range?.end && date >= range.start && date <= range.end) return phase;
      }
    }

    const own = byDate[date];
    if (own?.length) return effPhase(own[0]);

    let nearest = sortedDates[0];
    let nearestDistance = Infinity;
    const target = new Date(date).getTime();
    for (const candidate of sortedDates) {
      const distance = Math.abs(new Date(candidate).getTime() - target);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }
    const nearestLectures = byDate[nearest];
    return nearestLectures?.length ? effPhase(nearestLectures[0]) : 'Phase 4';
  };

  const capacityFor = (date) => offSet.has(date) ? 0 : (PHASE_CAP[phaseFor(date)] || DEFAULT_CAP);
  const distinctTargetFor = (date) => {
    const cap = capacityFor(date);
    return cap === 0 ? 0 : Math.min(PHASE_DISTINCT[phaseFor(date)] ?? DEFAULT_DISTINCT, cap);
  };

  const makeBacklog = () => sortedLectures.filter((lecture) =>
    lecture.newStudyDate < today && !completed(lecture.id)
  );

  if (!autoShift) {
    const resolved = {};
    const dayMap = {};
    sortedLectures.forEach((lecture) => {
      if (completed(lecture.id)) return;
      const isBacklog = lecture.newStudyDate < today;
      resolved[lecture.id] = { resolvedDate: lecture.newStudyDate, isBacklog };
      if (!dayMap[lecture.newStudyDate]) dayMap[lecture.newStudyDate] = [];
      dayMap[lecture.newStudyDate].push({
        ...lecture,
        phase: effPhase(lecture),
        isBacklog,
        resolvedDate: lecture.newStudyDate,
      });
    });
    Object.values(dayMap).forEach((items) => items.sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0)));
    const backlogList = makeBacklog();
    return {
      resolved,
      dayMap,
      backlogList,
      missedDates: [...new Set(backlogList.map((l) => l.newStudyDate))].sort(),
      offDays,
      estimatedEndDate: lastDate,
      dayCap: {},
      dayLoad: {},
      effortRemaining: sortedLectures.filter((l) => !completed(l.id)).reduce((sum, l) => sum + getLectureLoad(l), 0),
      totalEffort: sortedLectures.filter((l) => !completed(l.id)).reduce((sum, l) => sum + getLectureLoad(l), 0),
    };
  }

  // Build one ordered series at a time. Completed lectures are already removed, so
  // each series starts at its next incomplete lecture and advances only after pick.
  const pool = sortedLectures.filter((lecture) => !completed(lecture.id));
  const seriesLists = {};
  pool.forEach((lecture) => {
    const key = seriesKey(lecture);
    if (!seriesLists[key]) seriesLists[key] = [];
    seriesLists[key].push(lecture);
  });
  Object.values(seriesLists).forEach((series) => series.sort(lectureOrder));

  const seriesNextId = new Map();
  Object.entries(seriesLists).forEach(([key, series]) => {
    seriesNextId.set(key, series[0]?.id ?? null);
  });

  const isSequenceEligible = (lecture) => seriesNextId.get(seriesKey(lecture)) === lecture.id;
  const advanceSeries = (lecture) => {
    const series = seriesLists[seriesKey(lecture)] || [];
    const index = series.findIndex((item) => item.id === lecture.id);
    seriesNextId.set(seriesKey(lecture), series[index + 1]?.id ?? null);
  };

  const totalEffortUnits = pool.reduce((sum, lecture) => sum + getLectureLoad(lecture), 0);
  let remainingUnits = totalEffortUnits;

  const horizon = new Date(options.horizonDate || lastDate);
  const countStudyDays = (from) => {
    let count = 0;
    for (let cursor = new Date(from); cursor <= horizon; cursor.setDate(cursor.getDate() + 1)) {
      if (!offSet.has(toISODate(cursor))) count += 1;
    }
    return count;
  };

  const end = new Date(lastDate);
  end.setDate(end.getDate() + 400);
  const dayList = [];
  for (let cursor = new Date(today); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dayList.push(toISODate(cursor));
  }

  const resolved = {};
  const dayCap = {};
  const dayLoad = {};

  for (const date of dayList) {
    if (pool.length === 0) break;
    const phaseCap = capacityFor(date);
    if (phaseCap === 0) continue;

    const daysLeft = countStudyDays(date);
    const needed = Math.ceil(remainingUnits / Math.max(1, daysLeft));
    const cap = Math.min(phaseCap, Math.max(1, needed));
    dayCap[date] = cap;
    dayLoad[date] = 0;

    const isToday = date === today;
    const selectable = isToday
      ? (pool.some((lecture) => lecture.newStudyDate < today)
          ? pool.filter((lecture) => lecture.newStudyDate < today)
          : pool.filter((lecture) => lecture.newStudyDate <= today))
      : pool;
    if (selectable.length === 0) continue;

    const selected = [];
    const selectedSet = new Set();
    const subjectCounts = {};
    const phaseCounts = {};
    const phaseOf = (lecture) => effPhase(lecture) || 'Phase 4';
    const phaseCountOk = (lecture) =>
      (phaseCounts[phaseOf(lecture)] || 0) < (PHASE_CAP[phaseOf(lecture)] ?? DEFAULT_CAP);

    const pick = (predicate) => {
      const candidate = selectable.find((lecture) => {
        if (selectedSet.has(lecture.id)) return false;
        if (!pool.includes(lecture)) return false;
        if (!isSequenceEligible(lecture)) return false;
        if ((subjectCounts[lecture.subject] || 0) >= 2) return false; // HARD: max 2/subject/day
        if (!phaseCountOk(lecture)) return false;
        const load = getLectureLoad(lecture);
        if (dayLoad[date] + load > cap + EPS) return false; // HARD effort cap
        return predicate(lecture);
      });

      if (!candidate) return false;
      const load = getLectureLoad(candidate);
      selected.push(candidate);
      selectedSet.add(candidate.id);
      subjectCounts[candidate.subject] = (subjectCounts[candidate.subject] || 0) + 1;
      const phase = phaseOf(candidate);
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
      dayLoad[date] += load;
      remainingUnits -= load;
      pool.splice(pool.indexOf(candidate), 1);
      advanceSeries(candidate);
      return true;
    };

    // Pass 1: subject diversity. Every pick still passes ALL hard limits above.
    let guard = 0;
    const distinctTarget = Math.min(distinctTargetFor(date), cap);
    while (selected.length < distinctTarget && selected.length < cap && dayLoad[date] < cap - EPS && guard++ < 100) {
      if (!pick((lecture) => (subjectCounts[lecture.subject] || 0) === 0)) break;
    }

    // Pass 2: fill remaining capacity. The same HARD subject/phase/effort caps remain active.
    guard = 0;
    while (selected.length < cap && dayLoad[date] < cap - EPS && guard++ < 100) {
      if (!pick(() => true)) break;
    }

    selected.forEach((lecture) => {
      resolved[lecture.id] = {
        resolvedDate: date,
        isBacklog: lecture.newStudyDate < today,
      };
    });
  }

  // Absolute safety net. Even an extreme overflow is distributed over new dates
  // using the SAME hard max-2-subject, phase-card, and effort limits.
  if (pool.length > 0) {
    let cursor = new Date(end);
    let overflowDate = toISODate(cursor);
    let counts = { total: 0, effort: 0, subjects: {}, phases: {} };

    const resetOverflowDay = () => {
      cursor.setDate(cursor.getDate() + 1);
      overflowDate = toISODate(cursor);
      counts = { total: 0, effort: 0, subjects: {}, phases: {} };
    };

    while (pool.length > 0) {
      const lecture = pool[0];
      const phase = effPhase(lecture) || 'Phase 4';
      const load = getLectureLoad(lecture);
      const phaseLimit = PHASE_CAP[phase] ?? DEFAULT_CAP;
      const subjectCount = counts.subjects[lecture.subject] || 0;
      const phaseCount = counts.phases[phase] || 0;

      if (
        counts.total >= DEFAULT_CAP
        || counts.effort + load > DEFAULT_CAP + EPS
        || subjectCount >= 2
        || phaseCount >= phaseLimit
      ) {
        resetOverflowDay();
        continue;
      }

      pool.shift();
      counts.total += 1;
      counts.effort += load;
      counts.subjects[lecture.subject] = subjectCount + 1;
      counts.phases[phase] = phaseCount + 1;
      resolved[lecture.id] = {
        resolvedDate: overflowDate,
        isBacklog: lecture.newStudyDate < today,
      };
    }
  }

  const dayMap = {};
  lectures.forEach((lecture) => {
    if (completed(lecture.id)) return;
    const meta = resolved[lecture.id];
    if (!meta) return;
    if (!dayMap[meta.resolvedDate]) dayMap[meta.resolvedDate] = [];
    dayMap[meta.resolvedDate].push({
      ...lecture,
      phase: effPhase(lecture),
      isBacklog: meta.isBacklog,
      resolvedDate: meta.resolvedDate,
    });
  });

  Object.values(dayMap).forEach((items) => {
    items.sort((a, b) =>
      (Number(b.isBacklog) - Number(a.isBacklog))
      || (a.newStudyDate === b.newStudyDate
        ? (Number(a.slot) || 0) - (Number(b.slot) || 0)
        : a.newStudyDate.localeCompare(b.newStudyDate))
      || a.id - b.id
    );
  });

  const backlogList = makeBacklog();
  const missedDates = [...new Set(backlogList.map((lecture) => lecture.newStudyDate))].sort();

  let estimatedEndDate = '';
  Object.values(resolved).forEach((meta) => {
    if (meta.resolvedDate > estimatedEndDate) estimatedEndDate = meta.resolvedDate;
  });
  const anyIncomplete = sortedLectures.some((lecture) => !completed(lecture.id));

  return {
    resolved,
    dayMap,
    backlogList,
    missedDates,
    offDays,
    estimatedEndDate: anyIncomplete && estimatedEndDate ? estimatedEndDate : lastDate,
    dayCap,
    dayLoad,
    effortRemaining: remainingUnits,
    totalEffort: totalEffortUnits,
  };
}