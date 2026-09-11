import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { getSubjectColor, getBranchColor, formatDateShort } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import { getChapterPairing, SUBJECT_FOUNDATIONS } from '../data/chapterPairing';
import { ArrowUpDown, ChevronDown, ChevronUp, GraduationCap, Inbox, SlidersHorizontal } from 'lucide-react';

const STRATEGY_FILTERS = ['All', 'FULL', 'ONE SHOT', 'ONE SHOT + PYQ', 'ONE SHOT + NCERT + PYQ'];

export default function ChapterProgressPage() {
  const { lectures, completions, chapterProgress, settings, setChapterPhase, resetChapterPhases } = useStore();
  const [sortBy, setSortBy] = useState('current');
  const [sortDir, setSortDir] = useState('asc');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStrategy, setFilterStrategy] = useState('All');
  const [foundationOpen, setFoundationOpen] = useState(false);

  const planSummary = useMemo(() => {
    const full = chaptersOnly().filter(c => c.strategy?.label === 'FULL');
    const one = chaptersOnly().filter(c => c.strategy?.label === 'ONE SHOT');
    const pyq = chaptersOnly().filter(c => c.strategy?.label?.includes('PYQ'));
    return {
      fullLec: full.reduce((n, c) => n + c.total, 0),
      oneLec: one.reduce((n, c) => n + c.total, 0),
      pyqLec: pyq.reduce((n, c) => n + c.total, 0),
    };
    function chaptersOnly() {
      return chapterProgress.map(cp => {
        const chL = lectures.filter(l => l.chapterName === cp.chapter);
        return { ...cp, total: chL.length, strategy: getChapterStrategy(cp.chapter) };
      });
    }
  }, [chapterProgress, lectures]);

  const chapters = useMemo(() => {
    return chapterProgress.map(cp => {
      const chapterLectures = lectures.filter(l => l.chapterName === cp.chapter);
      const completed = chapterLectures.filter(l => completions[l.id] === 'completed').length;
      const remaining = chapterLectures.length - completed;
      const pct = Math.round((completed / chapterLectures.length) * 100);
      const isAllDone = completed === chapterLectures.length;

      const sorted = [...chapterLectures].sort((a, b) => a.lectureNumber - b.lectureNumber);
      const currentLecture = sorted.find(l => completions[l.id] !== 'completed');
      const startDate = cp.startDate || (sorted[0]?.newStudyDate || '');

      return {
        ...cp,
        total: chapterLectures.length,
        completed,
        remaining,
        pct,
        isAllDone,
        currentLecture,
        startDate,
        sortOrder: startDate,
        strategy: getChapterStrategy(cp.chapter),
        pairing: getChapterPairing(cp.chapter),
      };
    });
  }, [chapterProgress, lectures, completions]);

  const filtered = useMemo(() => {
    let arr = chapters;
    if (filterSubject !== 'All') {
      arr = filterSubject === 'Chemistry'
        ? arr.filter(c => c.subject === 'Chemistry')
        : arr.filter(c => c.subject === filterSubject);
    }
    if (filterStrategy !== 'All') {
      arr = arr.filter(c => c.strategy?.label === filterStrategy);
    }
    return arr;
  }, [chapters, filterSubject, filterStrategy]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'current':
        arr.sort((a, b) => (a.isAllDone ? 1 : 0) - (b.isAllDone ? 1 : 0) || a.sortOrder.localeCompare(b.sortOrder));
        break;
      case 'completion':
        arr.sort((a, b) => sortDir === 'asc' ? a.pct - b.pct : b.pct - a.pct);
        break;
      case 'name':
        arr.sort((a, b) => sortDir === 'asc' ? a.chapter.localeCompare(b.chapter) : b.chapter.localeCompare(a.chapter));
        break;
      case 'subject':
        arr.sort((a, b) => a.subject.localeCompare(b.subject) || a.sortOrder.localeCompare(b.sortOrder));
        break;
      default:
        break;
    }
    return arr;
  }, [filtered, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span className="ml-1 inline-flex">
      {sortBy === field
        ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
        : <ArrowUpDown size={12} className="opacity-30" />}
    </span>
  );

  const totalChapters = filtered.length;
  const completedChapters = filtered.filter(c => c.isAllDone).length;
  const inProgress = filtered.filter(c => !c.isAllDone && c.completed > 0).length;
  const notStarted = filtered.filter(c => c.completed === 0).length;

  return (
    <div className="animate-fadeIn space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Chapter Progress</h2>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
          {totalChapters} chapters • {completedChapters} done • {inProgress} in progress • {notStarted} not started
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-semibold">
        <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">FULL · {planSummary.fullLec} L</span>
        <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ONE SHOT · {planSummary.oneLec} L</span>
        <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">ONE SHOT + PYQ · {planSummary.pyqLec} L</span>
        <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">koi chapter full ki jagah one-shot se bhi ho sakta hai — strategy pehle se set hai</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-md border ${Object.keys(settings.chapterPhases || {}).length ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/10 text-gray-400 dark:text-gray-500'}`}>
            Phase overrides: {Object.keys(settings.chapterPhases || {}).length}
          </span>
          {Object.keys(settings.chapterPhases || {}).length > 0 && (
            <button
              onClick={resetChapterPhases}
              className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Clear all
            </button>
          )}
        </span>
      </div>

      <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
        <button
          onClick={() => setFoundationOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
            <GraduationCap size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-gray-900 dark:text-white">11th Foundation Plan</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              {filterSubject === 'All'
                ? 'Physics · Maths · Chemistry — 11th ko 12th ke saath kaise pair karo'
                : `${filterSubject} — 11th priority + base pairing`}
            </p>
          </div>
          {foundationOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {foundationOpen && (
          <div className="px-4 pb-4 space-y-3 animate-fadeIn">
            {Object.entries(SUBJECT_FOUNDATIONS)
              .filter(([subj]) => filterSubject === 'All' || filterSubject === subj)
              .map(([subj, f]) => (
                <div key={subj} className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getSubjectColor(subj).badge} ${getSubjectColor(subj).dark}`}>
                      {subj}
                    </span>
                    <p className="text-[11.5px] font-semibold text-gray-700 dark:text-gray-300">{f.title}</p>
                  </div>
                  <div className="space-y-1.5">
                    {f.lists.map((list, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className={`flex-shrink-0 mt-px px-1.5 py-0.5 rounded font-bold ${
                          list.tone === 'red'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : list.tone === 'amber'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {list.label}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 leading-snug">{list.items.join(', ')}</span>
                      </div>
                    ))}
                    {f.note && (
                      <p className="text-[10.5px] text-gray-400 dark:text-gray-500 italic pl-0.5 leading-snug">{f.note}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-center border border-green-100 dark:border-green-800/20">
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedChapters}</p>
          <p className="text-[10.5px] text-green-600/70 dark:text-green-400/70 font-medium">Completed</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800/20">
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{inProgress}</p>
          <p className="text-[10.5px] text-amber-600/70 dark:text-amber-400/70 font-medium">In Progress</p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-100 dark:border-white/5">
          <p className="text-xl font-bold text-gray-500 dark:text-gray-400">{notStarted}</p>
          <p className="text-[10.5px] text-gray-400 dark:text-gray-500 font-medium">Not Started</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase">Sort:</span>
        {['current', 'completion', 'name', 'subject'].map(f => (
          <button
            key={f}
            onClick={() => toggleSort(f)}
            aria-label={`Sort by ${f === 'current' ? 'current' : f}`}
            aria-pressed={sortBy === f}
            className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium capitalize transition-all flex items-center ${
              sortBy === f
                ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-[#1a1c2b] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            {f === 'current' ? 'Current First' : f}
            <SortIcon field={f} />
          </button>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={filterStrategy}
            onChange={(e) => setFilterStrategy(e.target.value)}
            aria-label="Filter by strategy"
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium bg-white dark:bg-[#1a1c2b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 outline-none cursor-pointer"
          >
            {STRATEGY_FILTERS.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Strategies' : s}</option>
            ))}
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            aria-label="Filter by subject"
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium bg-white dark:bg-[#1a1c2b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 outline-none cursor-pointer"
          >
            <option value="All">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Chemistry">Chemistry</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center animate-fadeIn">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
              <Inbox size={26} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">No chapters match your filters</h3>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 max-w-xs mx-auto mb-4">
              Koi chapter is subject + strategy combination me nahi mila.
            </p>
            <button
              onClick={() => { setFilterSubject('All'); setFilterStrategy('All'); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <SlidersHorizontal size={13} /> Clear Filters
            </button>
          </div>
        )}
        {sorted.map((chapter) => {
          const subjectColor = getSubjectColor(chapter.subject);
          const branchColor = chapter.chemistryBranch ? getBranchColor(chapter.chemistryBranch) : null;

          return (
            <div
              key={chapter.chapter}
              className={`bg-white dark:bg-[#1a1c2b] rounded-xl border p-4 transition-all duration-200 ${
                chapter.isAllDone
                  ? 'border-green-200/60 dark:border-green-800/20'
                  : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${subjectColor.badge} ${subjectColor.dark}`}>
                      {chapter.subject}
                    </span>
                    {chapter.chemistryBranch && (
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${branchColor.badge} ${branchColor.dark}`}>
                        {chapter.chemistryBranch.replace(' Chemistry', '')}
                      </span>
                    )}
                    {chapter.strategy && (
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${chapter.strategy.badge}`}>
                        {chapter.strategy.label}
                      </span>
                    )}
                    {chapter.isAllDone && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Done
                      </span>
                    )}
                  </div>
                  <h3 className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">{chapter.chapter}</h3>
                </div>
                <span className={`text-[14px] font-bold flex-shrink-0 ${chapter.isAllDone ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {chapter.pct}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${chapter.isAllDone ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${chapter.pct}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                <span>{chapter.completed}/{chapter.total} lectures</span>
                {chapter.startDate && (
                  <span>{formatDateShort(chapter.startDate)} — {formatDateShort(chapter.endDate)}</span>
                )}
                {chapter.currentLecture && (
                  <span className="text-indigo-500 dark:text-indigo-400 font-medium">
                    Next: L{chapter.currentLecture.lectureNumber}
                  </span>
                )}
              </div>

              {chapter.pairing && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-start gap-1.5 text-[11px]">
                  <span className="text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap">11th base:</span>
                  <span className="text-gray-600 dark:text-gray-300 leading-snug">{chapter.pairing.base}</span>
                  {chapter.pairing.treatment && (
                    <span className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 font-semibold whitespace-nowrap">
                      {chapter.pairing.treatment}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center gap-2 text-[11px] flex-wrap">
                <span className="text-gray-400 dark:text-gray-500 font-semibold">Phase:</span>
                <select
                  value={settings.chapterPhases?.[chapter.chapter] || 'auto'}
                  onChange={(e) => setChapterPhase(chapter.chapter, e.target.value)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold outline-none border transition-colors cursor-pointer ${
                    settings.chapterPhases?.[chapter.chapter]
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-300'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                  title="Is chapter ko kisi phase me treat karo (us phase ki daily capacity) — manual override"
                >
                  <option value="auto">Auto</option>
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                </select>
                {settings.chapterPhases?.[chapter.chapter] && (
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400">
                    is phase ki capacity se chalega
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}