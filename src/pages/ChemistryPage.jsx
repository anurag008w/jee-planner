import { useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import { getBranchColor, formatDateShort } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import { getChapterPairing } from '../data/chapterPairing';
import { FlaskConical, CheckCircle2, BookOpen, Clock } from 'lucide-react';

const BRANCH_TABS = ['All', 'Physical', 'Organic', 'Inorganic'];

export default function ChemistryPage() {
  const { lectures, completions, chapterProgress } = useStore();
  const [activeTab, setActiveTab] = useState('All');
  const [selectedChapter, setSelectedChapter] = useState(null);

  const chemLectures = lectures.filter(l => l.subject === 'Chemistry');
  const totalChem = chemLectures.length;
  const completedChem = chemLectures.filter(l => completions[l.id] === 'completed').length;
  const pct = Math.round((completedChem / totalChem) * 100);

  const chemChapters = chapterProgress.filter(c => c.subject === 'Chemistry');

  const branchMap = { 'Physical': 'Physical Chemistry', 'Organic': 'Organic Chemistry', 'Inorganic': 'Inorganic Chemistry' };
  const filteredChapters = activeTab === 'All'
    ? chemChapters
    : chemChapters.filter(c => c.chemistryBranch === branchMap[activeTab]);

  const branches = ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'];
  const branchStats = branches.map(b => {
    const bLectures = chemLectures.filter(l => l.chemistryBranch === b);
    const bCompleted = bLectures.filter(l => completions[l.id] === 'completed').length;
    return { branch: b, total: bLectures.length, completed: bCompleted, pct: Math.round((bCompleted / bLectures.length) * 100) };
  });

  const chapterLectures = selectedChapter
    ? chemLectures.filter(l => l.chapterName === selectedChapter).sort((a, b) => a.lectureNumber - b.lectureNumber)
    : [];

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <FlaskConical size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chemistry Flow</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{totalChem} lectures • {pct}% complete</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/15">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wider">Overall Chemistry</p>
          <p className="text-2xl font-bold">{pct}%</p>
        </div>
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-white/60 text-[11px] mt-2 text-right">{completedChem} of {totalChem} completed</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {branchStats.map(bs => {
          const color = getBranchColor(bs.branch);
          return (
            <div key={bs.branch} className={`rounded-xl p-3 border ${color.bg} ${color.dark} ${color.text}`}>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider opacity-70">{bs.branch.replace(' Chemistry', '')}</p>
              <p className="text-lg font-bold mt-1">{bs.pct}%</p>
              <p className="text-[11px] opacity-60">{bs.completed}/{bs.total}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {BRANCH_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedChapter(null); }}
            className={`px-4 py-2 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'bg-white dark:bg-[#1a1c2b] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative">
        {filteredChapters.length === 0 && (
          <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center animate-fadeIn">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
              <FlaskConical size={26} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">No chapters here yet</h3>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">Is branch ke lectures abhi schedule me nahi hain.</p>
          </div>
        )}
        {filteredChapters.map((chapter, idx) => {
          const branchColor = getBranchColor(chapter.chemistryBranch);
          const chapterLects = chemLectures.filter(l => l.chapterName === chapter.chapter);
          const chapterCompleted = chapterLects.filter(l => completions[l.id] === 'completed').length;
          const chapterPct = Math.round((chapterCompleted / chapterLects.length) * 100);
          const isAllDone = chapterCompleted === chapterLects.length;
          const isSelected = selectedChapter === chapter.chapter;

          return (
            <div key={chapter.chapter} className="relative">
              {idx < filteredChapters.length - 1 && (
                <div className="absolute left-[19px] top-[44px] bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />
              )}

              <div
                className={`relative flex gap-4 pb-4 cursor-pointer group`}
                onClick={() => setSelectedChapter(isSelected ? null : chapter.chapter)}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                  isAllDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isSelected
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 group-hover:border-emerald-300'
                }`}>
                  {isAllDone ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </div>

                <div className={`flex-1 rounded-xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 shadow-sm'
                    : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${branchColor.badge} ${branchColor.dark}`}>
                          {chapter.chemistryBranch.replace(' Chemistry', '')}
                        </span>
                        {(() => {
                          const strat = getChapterStrategy(chapter.chapter);
                          return strat ? (
                            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${strat.badge}`}>
                              {strat.label}
                            </span>
                          ) : null;
                        })()}
                        {isAllDone && (
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Done
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                        {chapter.chapter}
                      </h3>
                    </div>
                    <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400">{chapterPct}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isAllDone ? 'bg-green-500' : 'bg-emerald-500'}`}
                      style={{ width: `${chapterPct}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1"><BookOpen size={11} />{chapterLects.length} lectures</span>
                    {chapter.startDate && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDateShort(chapter.startDate)} — {formatDateShort(chapter.endDate)}
                      </span>
                    )}
                  </div>

                  {(() => {
                    const pairing = getChapterPairing(chapter.chapter);
                    return pairing ? (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-start gap-1.5 text-[11px]">
                        <span className="text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap">11th base:</span>
                        <span className="text-gray-600 dark:text-gray-300 leading-snug">{pairing.base}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {isSelected && (
                <div className="ml-14 mb-4 space-y-2 animate-fadeIn">
                  {chapterLectures.map(l => (
                    <LectureCard key={l.id} lecture={l} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}