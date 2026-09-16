// Schedule date helpers kept separate from the engine so the dataset stays immutable.

function parseDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftISODate(value, deltaDays) {
  const date = parseDate(value);
  date.setDate(date.getDate() + deltaDays);
  return toISODate(date);
}

export function dateDiffInDays(from, to) {
  const a = parseDate(from);
  const b = parseDate(to);
  return Math.round((b - a) / 86400000);
}

export function shiftLecturesToStartDate(lectures, originalStartDate, startDate) {
  const delta = dateDiffInDays(originalStartDate, startDate);
  if (!delta) return lectures;
  return lectures.map((lecture) => ({
    ...lecture,
    newStudyDate: shiftISODate(lecture.newStudyDate, delta),
  }));
}

export function shiftSundayOffDays(offDays, deltaDays) {
  if (!deltaDays) return offDays;
  // Only move the automatically generated Sunday entries. Fixed calendar
  // holidays/custom off-days remain attached to their real calendar dates.
  return offDays.map((date) => {
    const day = parseDate(date).getDay();
    return day === 0 ? shiftISODate(date, deltaDays) : date;
  });
}
