// User-defined extra lectures live outside the immutable dataset.
// Generated lecture objects intentionally mirror normal lecture objects so
// the existing scheduler, completion tracking, calendar and analytics can
// treat them like regular lectures.

const MAX_EXTRA_LECTURES = 1000;
const EXTRA_ID_BASE = 1_000_000_000_000;

export function getExtraLectureSeriesKey(lecture) {
  return [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function getExtraLectureId(seriesKey, index) {
  return EXTRA_ID_BASE + (stableHash(seriesKey) * (MAX_EXTRA_LECTURES + 1)) + index;
}

export function normalizeExtraLectureCounts(counts) {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return {};
  return Object.entries(counts).reduce((result, [key, raw]) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return result;
    const count = Math.max(0, Math.min(MAX_EXTRA_LECTURES, Math.floor(parsed)));
    if (count > 0) result[key] = count;
    return result;
  }, {});
}

export function buildLecturesWithExtras(baseLectures, counts) {
  const normalized = normalizeExtraLectureCounts(counts);
  const grouped = {};

  baseLectures.forEach((lecture) => {
    const key = getExtraLectureSeriesKey(lecture);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(lecture);
  });

  const extras = [];
  Object.entries(normalized).forEach(([key, count]) => {
    const series = grouped[key];
    if (!series?.length) return;

    const ordered = [...series].sort((a, b) =>
      (Number(a.lectureNumber) || Number.MAX_SAFE_INTEGER) - (Number(b.lectureNumber) || Number.MAX_SAFE_INTEGER)
      || String(a.newStudyDate).localeCompare(String(b.newStudyDate))
      || (Number(a.slot) || 0) - (Number(b.slot) || 0)
      || Number(a.id) - Number(b.id)
    );
    const last = ordered[ordered.length - 1];
    const lastNumber = Math.max(...ordered.map((lecture) => Number(lecture.lectureNumber) || 0), 0);

    for (let index = 1; index <= count; index += 1) {
      extras.push({
        ...last,
        id: getExtraLectureId(key, index),
        topic: 'Extra Lecture',
        lectureNumber: lastNumber + index,
        sourceSNo: null,
        originalDate: '',
        isExtraLecture: true,
        extraIndex: index,
        slot: (Number(last.slot) || 0) + index,
        // The final original lecture is the anchor; the scheduler then resolves
        // the generated lecture through the normal pool/capacity/off-day rules.
        newStudyDate: last.newStudyDate,
        day: last.day,
        phase: last.phase,
      });
    }
  });

  return [...baseLectures, ...extras];
}

export function pruneExtraCompletions(completions, counts) {
  const normalized = normalizeExtraLectureCounts(counts);
  const validIds = new Set();
  Object.entries(normalized).forEach(([key, count]) => {
    for (let index = 1; index <= count; index += 1) validIds.add(String(getExtraLectureId(key, index)));
  });

  return Object.fromEntries(
    Object.entries(completions || {}).filter(([id]) => {
      const numericId = Number(id);
      const isGenerated = Number.isSafeInteger(numericId) && numericId >= EXTRA_ID_BASE;
      return !isGenerated || validIds.has(String(id));
    })
  );
}
