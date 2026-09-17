import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import dataset from '../data/dataset.json';
import { shiftLecturesToStartDate } from '../store/scheduleDateUtils';
import LectureCard from '../components/LectureCard';
import { formatDate } from '../utils/helpers';
import { Filter, Search, X, ListOrdered, CalendarClock, Inbox, SlidersHorizontal } from 'lucide-react';

const ORIGINAL_START_DATE = [...new Set(dataset.lectures.map(l => l.newStudyDate))].sort()[0];

export default function MasterSchedulePage() {
  const { lectures, completions, filters, setFilters, resetFilters, schedule, settings } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState('resolved'); // 'resolved' | 'original'

  // Current view must use the active start date, while Original keeps the
  // immutable dataset dates. This also makes date filters match what the user
  // actually sees on the current calendar.
  const viewBaseLectures = useMemo(() => {
    if (view === 'original') return lectures;
    return shiftLecturesToStartDate(
      lectures,
      ORIGINAL_START_DATE,
      settings.startDate || ORIGINAL_START_DATE,
    );
  }, [lectures, view, settings.startDate]);

  const uniqueDates = [...new Set(viewBaseLectures.map(l => l.newStudyDate))].sort();
  const uniquePhases = [...new Set(viewBaseLectures.map(l => l.phase))];
  const uniqueSubjects = [...new Set(viewBaseLectures.map(l => l.subject))];
  const uniqueBranches = [...new Set(viewBaseLectures.filter(l => l.chemistryBranch).map(l => l.chemistryBranch))];
  const uniqueChapters = [...new Set(viewBaseLectures.map(l => l.chapterName))].sort();
  const uniqueFaculty = [...new Set(viewBaseLectures.map(l => l.facultyName))].sort();

  const filteredLectures = useMemo(() => {
    let result = [...viewBaseLectures];

    if (filters.date) result = result.filter(l => l.newStudyDate === filters.date);
    if (filters.phase) result = result.filter(l => l.phase === filters.phase);
    if (filters.subject) result = result.filter(l => l.subject === filters.subject);
    if (filters.chemistryBranch) result = result.filter(l => l.chemistryBranch === filters.chemistryBranch);
    if (filters.chapter) result = result.filter(l => l.chapterName === filters.chapter);
    if (filters.faculty) result = result.filter(l => l.facultyName === filters.faculty);
    if (filters.status === 'completed') result = result.filter(l => completions[l.id] === 'completed');
    else if (filters.status === 'pending') result = result.filter(l => completions[l.id] !== 'completed');

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.chapterName.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) ||
        l.facultyName.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        (l.chemistryBranch || '').toLowerCase().includes(q) ||
        String(l.lectureNumber).includes(q)
      );
    }

    return result;
  }, [viewBaseLectures, filters, searchQuery, completions]);

  // For the RESOLVED view each lecture carries its current calendar position + flags.
  // Completed lectures are not in schedule.resolved because the scheduler removes
  // completed work from the active pool, so retain the current shifted date here.
  const viewLectures = useMemo(() => {
    if (view === 'original') {
      return filteredLectures.map(l => ({ ...l, isBacklog: false }));
    }
    return filteredLectures.map(l => {
      const r = schedule.resolved[l.id];
      if (r) return { ...l, isBacklog: r.isBacklog, resolvedDate: r.resolvedDate };
      if (completions[l.id] === 'completed') {
        return { ...l, isBacklog: false, resolvedDate: l.newStudyDate };
      }
      return { ...l, isBacklog: false };
    });
  }, [filteredLectures, view, completions, schedule.resolved]);

  const groupedByDate = {};
  viewLectures.forEach(l => {
    const key = l.resolvedDate || l.newStudyDate;
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(l);
  });
  const sortedDates = Object.keys(groupedByDate).sort();

  const activeFilterCount = Object.values(filters).filter(v => v).length;
  const overdueCount = sortedDates.filter(d => d < schedule.today).length;
  const backlogItems = viewLectures.filter(l => l.isBacklog).length;

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">
            <CalendarClock size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Master Schedule</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {filteredLectures.length} lectures
              {activeFilterCount > 0 && ` (filtered from ${lectures.length})`}
              {view === 'resolved' && backlogItems > 0 && (
                <span className="text-red-500 font-medium"> • {backlogItems} backlog</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
            <button
              onClick={() => setView('resolved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                view === 'resolved'
                  ? 'bg-white dark:bg-[#1a1c2b] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <CalendarClock size={13} />
              Current
            </button>
            <button
              onClick={() => setView('original')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                view === 'original'
                  ? 'bg-white dark:bg-[#1a1c2b] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <ListOrdered size={13} />
              Original
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="px-3 py-2 rounded-xl text-[12.5px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#1a1c2b] rounded-xl border border-gray-200 dark:border-white/10 focus-within:border-indigo-300 dark:focus-within:border-indigo-600 transition-colors">
        <Search size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by chapter, topic, faculty, lecture..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 animate-scaleIn">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FilterSelect label="Phase" value={filters.phase} onChange={(v) => setFilters({ phase: v })} options={uniquePhases.map(p => ({ value: p, label: p }))} />
            <FilterSelect label="Subject" value={filters.subject} onChange={(v) => setFilters({ subject: v, chemistryBranch: '' })} options={uniqueSubjects.map(s => ({ value: s, label: s }))} />
            {filters.subject === 'Chemistry' && (
              <FilterSelect label="Branch" value={filters.chemistryBranch} onChange={(v) => setFilters({ chemistryBranch: v })} options={uniqueBranches.map(b => ({ value: b, label: b }))} />
            )}
            <FilterSelect label="Faculty" value={filters.faculty} onChange={(v) => setFilters({ faculty: v })} options={uniqueFaculty.map(f => ({ value: f, label: f }))} />
            <FilterSelect label="Chapter" value={filters.chapter} onChange={(v) => setFilters({ chapter: v })} options={uniqueChapters.map(c => ({ value: c, label: c }))} />
            <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ status: v })} options={[
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
            ]} />
          </div>
        </div>
      )}

      {view === 'resolved' && overdueCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 text-[12px] text-red-600 dark:text-red-300">
          {overdueCount} day{overdueCount !== 1 ? 's' : ''} red zone me hain — unke lectures backlog ban ke aage shift hue hain
        </div>
      )}

      {sortedDates.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-12 text-center animate-fadeIn">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
            <Inbox size={26} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">No lectures match your filters</h3>
          <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mb-4">Filters hatao ya kuch aur try karo — poora schedule wapas dikh jayega.</p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <SlidersHorizontal size={13} /> Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date, gi) => (
            <div key={date} className="animate-fadeIn" style={{ animationDelay: `${Math.min(gi, 12) * 40}ms` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm min-w-0 ${
                  date === schedule.today
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/60 ring-1 ring-indigo-300 dark:ring-indigo-700'
                    : date < schedule.today && groupedByDate[date].some(l => l.isBacklog)
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
                    : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/5'
                }`}>
                  <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatDate(date)}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                    {groupedByDate[date].length} lecture{groupedByDate[date].length > 1 ? 's' : ''}
                  </span>
                  {date < schedule.today && groupedByDate[date].some(l => l.isBacklog) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">RED</span>
                  )}
                  {groupedByDate[date].every(l => completions[l.id] === 'completed') && (
                    <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 ml-0 md:ml-2">
                {groupedByDate[date].map((lecture) => (
                  <LectureCard
                    key={lecture.id}
                    lecture={lecture}
                    compact
                    showTimeline
                    showDate={view === 'resolved'}
                    showOriginal={view === 'resolved'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[12.5px] text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-300 dark:focus:border-indigo-600 transition-colors appearance-none cursor-pointer"
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}