import { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import { getBranchColor, getSubjectColor } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import { getChapterPairing } from '../data/chapterPairing';
import { Atom, Calculator, FlaskConical, CheckCircle2, BookOpen, Clock3, ChevronDown, ChevronUp } from 'lucide-react';

const SUBJECTS = [
  { key: 'Physics', label: 'Physics', icon: Atom, active: 'blue' },
  { key: 'Mathematics', label: 'Mathematics', icon: Calculator, active: 'amber' },
  { key: 'Chemistry', label: 'Chemistry', icon: FlaskConical, active: 'emerald' },
];

const CHEM_TABS = ['Overall', 'Physical', 'Organic', 'Inorganic'];
const BRANCH_NAMES = {
  Physical: 'Physical Chemistry',
  Organic: 'Organic Chemistry',
  Inorganic: 'Inorganic Chemistry',
};

const SUBJECT_STYLES = {
  Physics: {
    icon: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    hero: 'from-blue-600 to-indigo-600 shadow-blue-500/15',
    bar: 'bg-blue-500',
    active: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30',
  },
  Mathematics: {
    icon: 'from-amber-500 to-orange-600 shadow-amber-500/20',
    hero: 'from-amber-500 to-orange-600 shadow-amber-500/15',
    bar: 'bg-amber-500',
    active: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30',
  },
  Chemistry: {
    icon: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    hero: 'from-emerald-600 to-teal-600 shadow-emerald-500/15',
    bar: 'bg-emerald-500',
    active: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30',
  },
};

export default function StudyArenaPage() {
  const { lectures, completions, currentPage } = useStore();
  const preferred = typeof window !== 'undefined'
    ? localStorage.getItem('jee-planner-arena-subject')
    : '';
  const legacyChemistryEntry = currentPage === 'chemistry' && !preferred;
  const defaultSubject = SUBJECTS.some(s => s.key === preferred)
    ? preferred
    : legacyChemistryEntry
      ? 'Chemistry'
      : 'Physics';

  const [subject, setSubject] = useState(defaultSubject);
  const [chemTab, setChemTab] = useState('Overall');
  const [expanded, setExpanded] = useState(null);

  const style = SUBJECT_STYLES[subject];
  const SubjectIcon = SUBJECTS.find(s => s.key === subject)?.icon || Atom;

  const data = useMemo(() => {
    const subjectLectures = lectures.filter(l => l.subject === subject);
    const filteredLectures = subject === 'Chemistry' && chemTab !== 'Overall'
      ? subjectLectures.filter(l => l.chemistryBranch === BRANCH_NAMES[chemTab])
      : subjectLectures;

    const chapterNames = [...new Set(filteredLectures.map(l => l.chapterName))];
    const chapters = chapterNames.map(name => {
      const chapterLectures = filteredLectures
        .filter(l => l.chapterName === name)
        .sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0) || a.id - b.id);
      const done = chapterLectures.filter(l => completions[l.id] === 'completed').length;
      return {
        name,
        lectures: chapterLectures,
        done,
        total: chapterLectures.length,
        pct: chapterLectures.length ? Math.round((done / chapterLectures.length) * 100) : 0,
      };
    });

    const done = filteredLectures.filter(l => completions[l.id] === 'completed').length;
    return {
      chapters,
      done,
      total: filteredLectures.length,
      pct: filteredLectures.length ? Math.round((done / filteredLectures.length) * 100) : 0,
    };
  }, [lectures, completions, subject, chemTab]);

  const branchStats = useMemo(() => {
    if (subject !== 'Chemistry') return [];
    return CHEM_TABS.slice(1).map(tab => {
      const branch = BRANCH_NAMES[tab];
      const branchLectures = lectures.filter(l => l.subject === 'Chemistry' && l.chemistryBranch === branch);
      const done = branchLectures.filter(l => completions[l.id] === 'completed').length;
      return {
        tab,
        total: branchLectures.length,
        done,
        pct: branchLectures.length ? Math.round((done / branchLectures.length) * 100) : 0,
        color: getBranchColor(branch),
      };
    });
  }, [lectures, completions, subject]);

  const changeSubject = key => {
    setSubject(key);
    setExpanded(null);
    setChemTab('Overall');
    if (typeof window !== 'undefined') {
      localStorage.setItem('jee-planner-arena-subject', key);
    }
  };

  return (
    <div className="animate-fadeIn space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.icon} text-white flex items-center justify-center shadow-lg`}>
          <SubjectIcon size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Study Arena</h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">{subject} • {data.total} lectures • {data.pct}% complete</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[.025] p-1.5">
        {SUBJECTS.map(s => {
          const Icon = s.icon;
          const active = subject === s.key;
          const total = lectures.filter(l => l.subject === s.key).length;
          const sStyle = SUBJECT_STYLES[s.key];
          return (
            <button
              key={s.key}
              onClick={() => changeSubject(s.key)}
              className={`min-w-0 rounded-xl px-2 py-2.5 transition-all duration-200 border ${
                active
                  ? `${sStyle.active} shadow-sm`
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/[.04] hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 min-w-0">
                <Icon size={15} className="flex-shrink-0" />
                <span className="text-[11.5px] sm:text-[12px] font-semibold truncate">{s.label}</span>
                <span className="hidden sm:inline text-[9.5px] opacity-50 flex-shrink-0">{total}L</span>
              </span>
            </button>
          );
        })}
      </div>

      {subject === 'Chemistry' && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
          {CHEM_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setChemTab(tab); setExpanded(null); }}
              className={`px-4 py-2 rounded-xl text-[12px] whitespace-nowrap font-medium transition-all border ${
                chemTab === tab
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30 shadow-sm'
                  : 'bg-white dark:bg-[#1a1c2b] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 border-gray-100 dark:border-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <section className={`bg-gradient-to-br ${style.hero} rounded-2xl p-5 text-white shadow-lg`}>
        <div className="flex items-center justify-between mb-3 gap-4">
          <div>
            <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wider">Overall {subject}</p>
            <p className="text-[11px] text-white/55 mt-0.5">Keep the sequence moving, one chapter at a time.</p>
          </div>
          <p className="text-2xl font-bold flex-shrink-0">{data.pct}%</p>
        </div>
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${data.pct}%` }} />
        </div>
        <p className="text-white/60 text-[11px] mt-2 text-right">{data.done} of {data.total} completed</p>
      </section>

      {subject === 'Chemistry' && (
        <div className="grid grid-cols-3 gap-3">
          {branchStats.map(branch => (
            <button
              key={branch.tab}
              onClick={() => { setChemTab(branch.tab); setExpanded(null); }}
              className={`text-left rounded-xl p-3 border transition-all hover:shadow-sm ${branch.color.bg} ${branch.color.dark} ${branch.color.text || ''}`}
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-wider opacity-70">{branch.tab}</p>
              <p className="text-lg font-bold mt-1">{branch.pct}%</p>
              <p className="text-[11px] opacity-60">{branch.done}/{branch.total}</p>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Chapters" value={data.chapters.length} icon={<BookOpen size={14} />} />
        <MiniStat label="Completed" value={data.chapters.filter(c => c.done === c.total && c.total > 0).length} icon={<CheckCircle2 size={14} />} />
        <MiniStat label="In progress" value={data.chapters.filter(c => c.done > 0 && c.done < c.total).length} icon={<Clock3 size={14} />} />
      </div>

      <div className="relative">
        {data.chapters.length === 0 && (
          <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center animate-fadeIn">
            <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center`}>
              <SubjectIcon size={26} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">No chapters here yet</h3>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">Is section ke lectures abhi schedule me nahi hain.</p>
          </div>
        )}

        {data.chapters.map((chapter, idx) => {
          const isOpen = expanded === chapter.name;
          const isDone = chapter.done === chapter.total && chapter.total > 0;
          const current = chapter.lectures.find(l => completions[l.id] !== 'completed');
          const strategy = getChapterStrategy(chapter.name);
          const pairing = getChapterPairing(chapter.name);
          const subjectColor = getSubjectColor(subject);
          const branchColor = subject === 'Chemistry' && chapter.lectures[0]?.chemistryBranch
            ? getBranchColor(chapter.lectures[0].chemistryBranch)
            : null;

          return (
            <div key={chapter.name} className="relative">
              {idx < data.chapters.length - 1 && (
                <div className="absolute left-[19px] top-[44px] bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />
              )}

              <div className="relative flex gap-3 sm:gap-4 pb-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isOpen
                      ? `${style.active} border-current`
                      : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'
                }`}>
                  {isDone ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </div>

                <div className={`flex-1 rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 shadow-sm'
                    : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm'
                }`}>
                  <button
                    className="w-full text-left p-4"
                    onClick={() => setExpanded(isOpen ? null : chapter.name)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {branchColor && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${branchColor.badge} ${branchColor.dark}`}>
                              {chapter.lectures[0].chemistryBranch.replace(' Chemistry', '')}
                            </span>
                          )}
                          {strategy && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${strategy.badge}`}>
                              {strategy.label}
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Done
                            </span>
                          )}
                        </div>
                        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug truncate">
                          {chapter.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400">{chapter.pct}%</span>
                        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : style.bar}`} style={{ width: `${chapter.pct}%` }} />
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1"><BookOpen size={11} />{chapter.total} lectures</span>
                      {current && <span className="truncate">Next: L{current.lectureNumber}</span>}
                    </div>

                    {pairing && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-start gap-1.5 text-[11px]">
                        <span className="text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap">11th base:</span>
                        <span className="text-gray-600 dark:text-gray-300 leading-snug truncate">{pairing.base}</span>
                      </div>
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 animate-fadeIn">
                      {chapter.lectures.map(lecture => (
                        <LectureCard key={lecture.id} lecture={lecture} compact />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }) {
  return (
    <div className="bg-white dark:bg-[#1a1c2b] rounded-xl border border-gray-100 dark:border-white/5 p-3">
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
        <span>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
