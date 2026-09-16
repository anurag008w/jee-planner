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
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

export function getSundaysBetween(startDate, endDate) {
  const result = [];
  const cursor = parseDate(startDate);
  const end = parseDate(endDate);
  while (cursor <= end) {
    if (cursor.getDay() === 0) result.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function shiftLecturesToStartDate(lectures, originalStartDate, startDate) {
  const deltaDays = dateDiffInDays(originalStartDate, startDate);
  if (!deltaDays) return lectures;
  return lectures.map((lecture) => ({
    ...lecture,
    newStudyDate: shiftISODate(lecture.newStudyDate, deltaDays),
  }));
}

// Rebuild the Sunday set for the shifted schedule while preserving any
// user-disabled Sunday exceptions. Fixed calendar holidays/custom off-days
// remain attached to their real calendar dates.
export function shiftSundayOffDays(offDays, originalStartDate, originalEndDate, previousStartDate, nextStartDate) {
  const deltaDays = dateDiffInDays(previousStartDate, nextStartDate);
  if (!deltaDays) return offDays;

  const previousEndDate = shiftISODate(originalEndDate, dateDiffInDays(originalStartDate, previousStartDate));
  const previousSundays = new Set(getSundaysBetween(previousStartDate, previousEndDate));
  const disabledSundays = [...previousSundays].filter((date) => !offDays.includes(date));
  const shiftedDisabledSundays = new Set(disabledSundays.map((date) => shiftISODate(date, deltaDays)));

  const fixedOffDays = offDays.filter((date) => !previousSundays.has(date));
  const nextEndDate = shiftISODate(originalEndDate, dateDiffInDays(originalStartDate, nextStartDate));
  const nextSundays = getSundaysBetween(nextStartDate, nextEndDate)
    .filter((date) => !shiftedDisabledSundays.has(date));

  return [...new Set([...fixedOffDays, ...nextSundays])].sort();
}
