// Schedule date helpers. The dataset remains immutable; only the computed plan dates move.

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
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

export function shiftLecturesToStartDate(lectures, originalStartDate, startDate) {
  const deltaDays = dateDiffInDays(originalStartDate, startDate);
  if (!deltaDays) return lectures;
  return lectures.map((lecture) => ({
    ...lecture,
    newStudyDate: shiftISODate(lecture.newStudyDate, deltaDays),
  }));
}

export function shiftSundayOffDays(offDays, deltaDays) {
  if (!deltaDays) return offDays;
  return offDays.map((date) => (
    parseDate(date).getDay() === 0 ? shiftISODate(date, deltaDays) : date
  ));
}
