import { useMemo, useState, useEffect } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import { getBranchColor, getSubjectColor, getSubjectMeta, detectChapterClass } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import { getChapterPairing } from '../data/chapterPairing';
import { getExtraLectureSeriesKey } from '../store/extraLectures';
import {
  Atom, Calculator, FlaskConical, Dna, Leaf, Code, BookOpen,
  GraduationCap, CheckCircle2, Clock3, ChevronDown, ChevronUp, X
} from 'lucide-react';

const getSubjectIcon = (name) => {
  const norm = (name || '').toLowerCase();
  if (norm.includes('physic')) return Atom;
  if (norm.includes('math')) return Calculator;
  if (norm.includes('chem')) return FlaskConical;
  if (norm.includes('bio') || norm.includes('zool')) return Dna;
  if (norm.includes('botan')) return Leaf;
  if (norm.includes('comp') || norm.includes('cs') || norm.includes('code')) return Code;
  if (norm.includes('eng') || norm.includes('lit')) return BookOpen;
  return GraduationCap;
};

export default function StudyArenaPage() {
  const {
    lectures, completions, currentPage, extraLectureCounts,
    setExtraLectureCount, chapterPairing: batchPairings, chapterProgress
  } = useStore();

  const availableSubjects = useMemo(() => {
    const list = [];
    const seen = new Set();
    lectures.forEach(l => {
      if (l.subject && !seen.has(l.subject)) {
        seen.add(l.subject);
        list.push(l.subject);
      }
    });
    if (list.length === 0) list.push('Physics', 'Mathematics', 'Chemistry');
    return list.map((name, i) => {
      const meta = getSubjectMeta(name, i);
      return {
        ...meta,
        icon: getSubjectIcon(name),
      };
    });
  }, [lectures]);

  const preferred = typeof window !== 'undefined' ? localStorage.getItem('jee-planner-arena-subject') : '';
  const legacyChemistryEntry = currentPage === 'chemistry' && !preferred;
  const initialSubject = availableSubjects.some(s => s.key === preferred)
    ? preferred
    : legacyChemistryEntry && availableSubjects.some(s => s.key === 'Chemistry')
    ? 'Chemistry'
    : (availableSubjects[0]?.key || 'Physics');

  const [subject, setSubject] = useState(initialSubject);
  const [chemTab, setChemTab] = useState('Overall');
  const [expanded, setExpanded] = useState(null);
  const [extraEditor, setExtraEditor] = useState(null);
  const [extraDraft, setExtraDraft] = useState('0');

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some(s => s.key === subject)) {
      setSubject(availableSubjects[0].key);
    }
  }, [availableSubjects, subject]);

  const style = useMemo(() => {
    return availableSubjects.find(s => s.key === subject) || getSubjectMeta(subject);
  }, [availableSubjects, subject]);

  const SubjectIcon = style.icon || getSubjectIcon(subject);

  // Distinct branches for active subject
  const distinctBranches = useMemo(() => {
    const branches = new Set();
    lectures.filter(l => l.subject === subject).forEach(l => {
      const b = l.chemistryBranch || l.branch;
      if (b) branches.add(b);
    });
    return Array.from(branches);
  }, [lectures, subject]);

  const branchTabs = useMemo(() => {
    if (distinctBranches.length === 0) return [];
    return ['Overall', ...distinctBranches];
  }, [distinctBranches]);

  const data = useMemo(() => {
    const subjectLectures = lectures.filter(l => l.subject === subject);
    const filteredLectures = distinctBranches.length > 0 && chemTab !== 'Overall'
      ? subjectLectures.filter(l => (l.chemistryBranch === chemTab || l.branch === chemTab))
      : subjectLectures;

    const chapterNames = [...new Set(filteredLectures.map(l => `${getExtraLectureSeriesKey(l)}\u0000${l.chapterName}`))];
    const chapters = chapterNames.map(groupKey => {
      const first = filteredLectures.find(l => `${getExtraLectureSeriesKey(l)}\u0000${l.chapterName}` === groupKey);
      const name = first?.chapterName || groupKey.split('\u0000')[1] || groupKey;
      const seriesKey = first ? getExtraLectureSeriesKey(first) : groupKey;
      const chapterLectures = filteredLectures
        .filter(l => getExtraLectureSeriesKey(l) === seriesKey)
        .sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0) || a.id - b.id);
      const done = chapterLectures.filter(l => completions[l.id] === 'completed').length;
      return {
        name,
        seriesKey,
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
  }, [lectures, completions, subject, chemTab, distinctBranches]);

  const branchStats = useMemo(() => {
    if (distinctBranches.length === 0) return [];
    return distinctBranches.map(branch => {
      const branchLectures = lectures.filter(l => l.subject === subject && (l.chemistryBranch === branch || l.branch === branch));
      const done = branchLectures.filter(l => completions[l.id] === 'completed').length;
      const tabLabel = branch.replace(/ Chemistry$/i, '');
      return {
        tab: tabLabel,
        rawName: branch,
        total: branchLectures.length,
        done,
        pct: branchLectures.length ? Math.round((done / branchLectures.length) * 100) : 0,
        color: getBranchColor(branch),
      };
    });
  }, [lectures, completions, subject, distinctBranches]);

  const changeSubject = key => {
    setSubject(key);
    setExpanded(null);
    setChemTab('Overall');
    if (typeof window !== 'undefined') localStorage.setItem('jee-planner-arena-subject', key);
  };

  const saveExtraCount = () => {
    const count = Math.max(0, Math.min(1000, Math.floor(Number(extraDraft) || 0)));
    setExtraLectureCount(extraEditor.seriesKey, count);
    setExtraEditor(null);
  };

  return (
    <div className="animate-fadeIn space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.iconBg} text-white flex items-center justify-center shadow-lg`}>
          <SubjectIcon size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Study Arena</h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">{subject} • {data.total} lectures • {data.pct}% complete</p>
        </div>
      </header>

      {/* Horizontally scrollable touch-friendly subject tabs for any number of subjects (3, 4, 5+) */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[.025] overflow-x-auto scrollbar-none">
        {availableSubjects.map(s => {
          const Icon = s.icon;
          const active = subject === s.key;
          const total = lectures.filter(l => l.subject === s.key).length;
          return (
            <button
              key={s.key}
              onClick={() => changeSubject(s.key)}
              className={`flex-1 min-w-[100px] sm:min-w-[130px] rounded-xl px-2.5 py-2.5 transition-all duration-200 border whitespace-nowrap ${
                active
                  ? `${s.active} shadow-sm`
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/[.04] hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 min-w-0">
                <Icon size={15} className="flex-shrink-0" />
                <span className="text-[11.5px] sm:text-[12px] font-semibold truncate">{s.label}</span>
                <span className="hidden sm:inline text-[9.5px] opacity-60 flex-shrink-0">{total}L</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Branch Tabs if active subject has branches */}
      {branchTabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          {branchTabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setChemTab(tab); setExpanded(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] whitespace-nowrap font-medium transition-all border ${
                chemTab === tab
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/30 shadow-sm'
                  : 'bg-white dark:bg-[#1a1c2b] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 border-gray-100 dark:border-white/5'
              }`}
            >
              {tab.replace(/ Chemistry$/i, '')}
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

      {branchStats.length > 0 && (
        <div className={`grid grid-cols-${Math.min(branchStats.length, 3)} gap-3`}>
          {branchStats.map(branch => (
            <button
              key={branch.rawName}
              onClick={() => { setChemTab(branch.rawName); setExpanded(null); }}
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
          <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center animate-fadeIn"><div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center"><SubjectIcon size={26} className="text-gray-400 dark:text-gray-500" /></div><h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">No chapters here yet</h3><p className="text-[12px] text-gray-400 dark:text-gray-500">Is section ke lectures abhi schedule me nahi hain.</p></div>
        )}

        {data.chapters.map((chapter, idx) => {
          const isOpen = expanded === chapter.seriesKey;
          const extraCount = extraLectureCounts[chapter.seriesKey] || 0;
          const isDone = chapter.done === chapter.total && chapter.total > 0;
          const current = chapter.lectures.find(l => completions[l.id] !== 'completed');
          const strategy = getChapterStrategy(chapter.name);

          // Dynamic 11th base resolution
          const cpMeta = (chapterProgress || []).find(cp => cp.chapter === chapter.name);
          const pairing = cpMeta?.base || cpMeta?.pairing
            ? { base: cpMeta.base || cpMeta.pairing?.base, treatment: cpMeta.treatment || cpMeta.pairing?.treatment || '' }
            : getChapterPairing(chapter.name, batchPairings);

          const branchColor = (chapter.lectures[0]?.chemistryBranch || chapter.lectures[0]?.branch)
            ? getBranchColor(chapter.lectures[0].chemistryBranch || chapter.lectures[0].branch)
            : null;

          return (
            <div key={chapter.seriesKey} className="relative">
              {idx < data.chapters.length - 1 && <div className="absolute left-[19px] top-[44px] bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />}
              <div className="relative flex gap-3 sm:gap-4 pb-4">
                <button type="button" className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all shadow-sm hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current ${isDone ? 'bg-green-500 border-green-500 text-white' : isOpen ? `${style.active} border-current` : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20'}`} onClick={(event) => { event.stopPropagation(); setExtraEditor({ seriesKey: chapter.seriesKey, name: chapter.name }); setExtraDraft(String(extraCount)); }} aria-label={`Set extra lectures for ${chapter.name}`} title="Set extra lectures">
                  {isDone ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </button>

                <div className={`flex-1 rounded-xl border transition-all duration-200 overflow-hidden ${isOpen ? 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 shadow-sm' : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm'}`}>
                  <button className="w-full text-left p-4" onClick={() => setExpanded(isOpen ? null : chapter.seriesKey)} aria-expanded={isOpen}>
                    <div className="flex items-start justify-between gap-3 mb-2"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {branchColor && <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${branchColor.badge} ${branchColor.dark}`}>{(chapter.lectures[0].chemistryBranch || chapter.lectures[0].branch || '').replace(/ Chemistry$/i, '')}</span>}
                      {strategy && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${strategy.badge}`}>{strategy.label}</span>}
                      {isDone && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Done</span>}
                    </div><h3 className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug truncate">{chapter.name}</h3></div>
                    <div className="flex items-center gap-2 flex-shrink-0"><span className="text-[12px] font-bold text-gray-500 dark:text-gray-400">{chapter.pct}%</span>{isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}</div></div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : style.bar}`} style={{ width: `${chapter.pct}%` }} /></div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500"><span className="flex items-center gap-1"><BookOpen size={11} />{chapter.total} lectures{extraCount > 0 ? ` • +${extraCount} extra` : ''}</span>{current && <span className="truncate">Next: L{current.lectureNumber}</span>}</div>
                    {pairing && pairing.base && <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-start gap-1.5 text-[11px]"><span className="text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap">11th base:</span><span className="text-gray-600 dark:text-gray-300 leading-snug truncate">{pairing.base}</span>{pairing.treatment && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500">{pairing.treatment}</span>}</div>}
                  </button>

                  {isOpen && <div className="px-4 pb-4 space-y-2 animate-fadeIn">{chapter.lectures.map(lecture => <LectureCard key={lecture.id} lecture={lecture} compact />)}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {extraEditor && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Extra lectures for ${extraEditor.name}`}>
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default" aria-label="Close extra lecture editor" onClick={() => setExtraEditor(null)} />
          <div className="relative w-full sm:max-w-[360px] bg-white dark:bg-[#1a1c2b] rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-4"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Extra Lectures</p><h3 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">{extraEditor.name}</h3></div><button type="button" className="btn-icon" aria-label="Close" onClick={() => setExtraEditor(null)}><X size={18} /></button></div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="extra-lecture-count">Number of extra lectures</label>
            <input id="extra-lecture-count" type="number" inputMode="numeric" min="0" max="1000" step="1" value={extraDraft} onChange={(event) => setExtraDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveExtraCount(); }} className="field text-lg font-bold" autoFocus />
            <p className="mt-2 text-[10.5px] text-gray-400 dark:text-gray-500">sirf number daalo — generated lectures ka naam automatically <b>Extra Lecture</b> hoga.</p>
            <div className="grid grid-cols-2 gap-2 mt-4"><button type="button" className="btn-secondary rounded-xl px-3 py-2.5 text-[12.5px] font-semibold" onClick={() => setExtraEditor(null)}>Cancel</button><button type="button" className="btn-primary rounded-xl px-3 py-2.5 text-[12.5px] font-semibold" onClick={saveExtraCount}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }) {
  return <div className="bg-white dark:bg-[#1a1c2b] rounded-xl border border-gray-100 dark:border-white/5 p-3"><div className="flex items-center gap-2 text-gray-400 dark:text-gray-500"><span>{icon}</span><span className="text-[10px] uppercase tracking-wider font-bold">{label}</span></div><p className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</p></div>;
}
