import { useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import OffDayCatchUp from '../components/OffDayCatchUp';
import { formatDateFull, formatDateShort } from '../utils/helpers';
import { ChevronLeft, ChevronRight, Calendar, X, CalendarOff, CalendarCheck2, AlertTriangle, PartyPopper } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Color each lecture's dot: Physics=blue, Math=amber, Chemistry branch colors (PC=cyan, OC=violet, IC=pink)
const dotForLecture = (l) => {
  if (l.subject === 'Physics') return 'bg-blue-500';
  if (l.subject === 'Mathematics') return 'bg-amber-500';
  if (l.chemistryBranch === 'Physical Chemistry') return 'bg-cyan-500';
  if (l.chemistryBranch === 'Organic Chemistry') return 'bg-violet-500';
  if (l.chemistryBranch === 'Inorganic Chemistry') return 'bg-pink-500';
  return 'bg-emerald-500';
};

const dotTitle = (l) => {
  return l.chemistryBranch ? `${l.subject} — ${l.chemistryBranch}` : l.subject;
};

export default function CalendarPage() {
  const { completions, schedule, settings, commonHolidays, toggleOffDay, setSundaysOff, setAllCommonHolidays } = useStore();
  const today = schedule.today;
  const dayMap = schedule.dayMap || {};
  const offSet = new Set(settings.offDays || []);
  const missedSet = new Set(schedule.missedDates || []);

  const sundaysOff = settings.offDays.some(d => new Date(d).getDay() === 0);
  const allHolidaysOff = commonHolidays.every(h => settings.offDays.includes(h.date));

  const [viewDate, setViewDate] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startPadding; i++) {
    cells.push({ type: 'empty' });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const lectures = dayMap[dateStr] || [];
    const isSunday = new Date(year, month, d).getDay() === 0;
    const isToday = dateStr === today;
    const isOff = offSet.has(dateStr);
    const isMissed = missedSet.has(dateStr);
    const completedCount = lectures.filter(l => completions[l.id] === 'completed').length;
    const allCompleted = lectures.length > 0 && completedCount === lectures.length;

    cells.push({
      type: 'day',
      date: d,
      dateStr,
      lectures,
      isSunday,
      isToday,
      isOff,
      isMissed,
      completedCount,
      allCompleted,
    });
  }

  const selectedDayLectures = selectedDate ? (dayMap[selectedDate] || []) : [];
  const selectedIsOff = selectedDate ? offSet.has(selectedDate) : false;
  const selectedIsMissed = selectedDate ? missedSet.has(selectedDate) : false;
  const selectedIsSunday = selectedDate ? new Date(selectedDate).getDay() === 0 : false;

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate(new Date(year, month - 1))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setViewDate(new Date(2026, 8, 1))}
            className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            Sep 2026
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" />Physics</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" />Math</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-500" />Physical Chem</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500" />Organic Chem</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-500" />Inorganic Chem</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" />Completed</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-red-400" />Red Zone (missed)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(251,191,36,0.5) 2px, rgba(251,191,36,0.5) 4px)' }} />
          Off Day
        </span>
      </div>

      {/* Quick toggles — Sundays & Common Holidays */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSundaysOff(!sundaysOff)}
          aria-pressed={sundaysOff}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold border transition-all ${
            sundaysOff
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
          title={sundaysOff ? 'Sundays ko study day banao' : 'Sundays ko off day banao'}
        >
          {sundaysOff ? 'Sundays: Off' : 'Sundays: Study'}
        </button>
        <button
          onClick={() => setAllCommonHolidays(!allHolidaysOff)}
          aria-pressed={allHolidaysOff}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold border transition-all ${
            allHolidaysOff
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
          title={allHolidaysOff ? 'Saare common holidays ko study day banao' : 'Saare common holidays ko off day banao'}
        >
          {allHolidaysOff ? 'Holidays: All Off' : 'Holidays: All Study'}
        </button>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Kisi bhi date pe click karke usse Mark Off / Study Day kar sakte ho.
        </span>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
              {DAYS.map(d => (
                <div key={d} className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${d === 'Sun' ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (cell.type === 'empty') {
                  return <div key={`e-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-gray-50 dark:border-white/[0.02] bg-gray-50/30 dark:bg-white/[0.01]" />;
                }

                const isSelected = selectedDate === cell.dateStr;
                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : cell.dateStr)}
                    aria-label={`${cell.dateStr}: ${cell.isOff ? 'off day' : cell.lectures.length + ' lectures, ' + cell.completedCount + ' completed'}`}
                    aria-pressed={isSelected}
                    className={`
                      relative min-h-[64px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-1.5 md:p-2 border-b border-r border-gray-50 dark:border-white/[0.02]
                      transition-all duration-150 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] active:bg-gray-100 dark:active:bg-white/[0.04]
                      ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/10 ring-2 ring-inset ring-indigo-500' : ''}
                      ${cell.isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}
                      ${cell.isOff ? 'bg-amber-50/60 dark:bg-amber-900/[0.08]' : ''}
                      ${cell.isMissed && !cell.isOff ? 'ring-1 ring-inset ring-red-300 dark:ring-red-800/60' : ''}
                    `}
                  >
                    {/* date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`
                        text-[12px] md:text-[13px] font-semibold w-6 h-6 rounded-full flex items-center justify-center
                        ${cell.isToday ? 'bg-indigo-600 text-white' : ''}
                        ${cell.isMissed && !cell.isToday ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' : ''}
                        ${cell.isOff && !cell.isToday && !cell.isMissed ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : ''}
                        ${!cell.isOff && !cell.isToday && !cell.isMissed && cell.lectures.length === 0 ? 'text-gray-400 dark:text-gray-500' : ''}
                        ${!cell.isOff && !cell.isToday && !cell.isMissed && cell.lectures.length > 0 ? 'text-gray-700 dark:text-gray-300' : ''}
                      `}>
                        {cell.date}
                      </span>
                      {cell.allCompleted && cell.lectures.length > 0 && (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {cell.isOff && (
                      <div className="text-[9px] md:text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        OFF
                      </div>
                    )}
{cell.isOff && cell.isSunday && (
  <div className="text-[9px] md:text-[10px] text-red-500 dark:text-red-300 font-medium mt-0.5">
    Holiday
  </div>
)}
                    {cell.isMissed && (
                      <div className="flex items-center gap-0.5 text-[9px] md:text-[10px] text-red-500 font-semibold mt-0.5">
                        <AlertTriangle size={9} />
                        missed
                      </div>
                    )}

                    {cell.lectures.length > 0 && !cell.isOff && (
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          {cell.lectures.length} lect.
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {cell.lectures.map((l) => (
                            <div
                              key={l.id}
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm ${dotForLecture(l)} ${l.isBacklog ? 'ring-1 ring-red-400' : ''}`}
                              title={`${dotTitle(l)}${l.isBacklog ? ' (backlog)' : ''}`}
                            />
                          ))}
                        </div>
                        <div className={`w-full h-1 rounded-full overflow-hidden ${cell.completedCount > 0 ? '' : 'bg-gray-200 dark:bg-white/10'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${cell.completedCount > 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/20'}`}
                            style={{ width: `${(cell.completedCount / cell.lectures.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Date Panel */}
        <div className="xl:w-[400px] flex-shrink-0">
          {selectedDate ? (
            <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5 animate-scaleIn">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                    {formatDateFull(selectedDate)}
                  </h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    {selectedIsOff ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Off Day</span>
                    ) : (
                      `${selectedDayLectures.length} lecture${selectedDayLectures.length !== 1 ? 's' : ''}`
                    )}
                    {selectedIsMissed && !selectedIsOff && (
                      <span className="text-red-500 font-medium flex items-center gap-0.5">
                        <AlertTriangle size={11} /> red zone
                      </span>
                    )}
                    {selectedIsSunday && <span className="text-red-400">Sunday</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mark off / study toggle for ANY date */}
                  <button
                    onClick={() => toggleOffDay(selectedDate)}
                    aria-pressed={selectedIsOff}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all
                      ${selectedIsOff
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}
                    `}
                    title={selectedIsOff ? 'Make it a study day again' : 'Mark this day as OFF'}
                  >
                    {selectedIsOff ? <CalendarCheck2 size={12} /> : <CalendarOff size={12} />}
                    {selectedIsOff ? 'Study Day' : 'Mark Off'}
                  </button>
                  <button
                    onClick={() => setSelectedDate(null)}
                    aria-label="Close day details"
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 transition-colors text-gray-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {selectedIsOff ? (
                <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                  <OffDayCatchUp date={selectedDate} compact />
                </div>
              ) : selectedDayLectures.length === 0 ? (
                <div className="py-8 text-center">
                  {selectedIsSunday && selectedIsOff ? (
                    <>
                      <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <PartyPopper size={24} className="text-amber-500" />
                      </div>
                      <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300">Sunday — Holiday!</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Rest and recharge 🧘</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                        <Calendar size={22} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">No lectures scheduled</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        {selectedDate < today ? 'Koi backlog nahi — sab clear! 🎉' : 'Relax, aaj ka plan khali hai'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-2">
                  {selectedDayLectures.map(l => (
                    <LectureCard key={l.id} lecture={l} compact showTimeline showOriginal />
                  ))}
                  {selectedDayLectures.some(l => l.isBacklog) && (
                    <p className="text-[10.5px] text-red-500/80 flex items-center gap-1 pt-1">
                      <AlertTriangle size={10} />
                      Red = backlog jo aaj par shift hua hai (original date card me dikhi hai)
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5 text-center">
              <Calendar size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-[13px] text-gray-400 dark:text-gray-500">
                Click any date to see details
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Off Day par backlog complete kar sakte ho
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}