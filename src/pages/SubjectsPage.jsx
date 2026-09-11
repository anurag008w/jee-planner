import useStore from '../store/useStore';
import { getSubjectColor, formatDate } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import ProgressBar from '../components/ProgressBar';
import { ChevronRight, Atom, Calculator, FlaskConical } from 'lucide-react';

export default function SubjectsPage() {
  const { lectures, completions, setPage } = useStore();

  const subjects = [
    { name: 'Physics', icon: Atom, iconBg: 'from-blue-500 to-blue-600', total: 139, lectures: lectures.filter(l => l.subject === 'Physics') },
    { name: 'Mathematics', icon: Calculator, iconBg: 'from-amber-500 to-amber-600', total: 135, lectures: lectures.filter(l => l.subject === 'Mathematics') },
    { name: 'Chemistry', icon: FlaskConical, iconBg: 'from-emerald-500 to-emerald-600', total: 118, lectures: lectures.filter(l => l.subject === 'Chemistry') },
  ];

  const totalCompleted = Object.values(completions).filter(v => v === 'completed').length;
  const grandPct = Math.round((totalCompleted / 392) * 100);

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Subjects Overview</h2>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">392 total lectures across 3 subjects</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Total Lectures</p>
            <p className="text-3xl font-bold mt-1">392</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-bold mt-1">{grandPct}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
          <ProgressBar value={grandPct} size="md" gradient="bg-white" trackClassName="h-full w-full bg-transparent" />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-white/60">
          <span>{totalCompleted} completed</span>
          <span>{392 - totalCompleted} remaining</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          const Icon = subject.icon;
          const color = getSubjectColor(subject.name);
          const completed = subject.lectures.filter(l => completions[l.id] === 'completed').length;
          const remaining = subject.total - completed;
          const pct = Math.round((completed / subject.total) * 100);

          const sortedByDate = [...subject.lectures].sort((a, b) => a.newStudyDate.localeCompare(b.newStudyDate));
          const nextIncomplete = sortedByDate.find(l => completions[l.id] !== 'completed');
          const currentChapter = nextIncomplete ? nextIncomplete.chapterName : 'All Done!';

          const chapters = [...new Set(subject.lectures.map(l => l.chapterName))];
          const completedChapters = chapters.filter(ch =>
            subject.lectures.filter(l => l.chapterName === ch).every(l => completions[l.id] === 'completed')
          ).length;

          return (
            <div
              key={subject.name}
              className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => subject.name === 'Chemistry' ? setPage('chemistry') : setPage('chapters')}
            >
              <div className={`bg-gradient-to-br ${subject.iconBg} p-5 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{subject.name}</h3>
                    <p className="text-white/70 text-[12px]">{subject.total} lectures</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{pct}% Complete</span>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{completed}/{subject.total}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <ProgressBar value={pct} size="md" gradient={`bg-gradient-to-r ${subject.iconBg}`} trackClassName="h-full w-full bg-transparent" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-[10.5px] text-gray-400 dark:text-gray-500 uppercase font-medium">Chapters</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-0.5">{completedChapters}/{chapters.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-[10.5px] text-gray-400 dark:text-gray-500 uppercase font-medium">Remaining</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-0.5">{remaining}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                  <p className="text-[10.5px] text-gray-400 dark:text-gray-500 uppercase font-medium mb-1">Current Chapter</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">{currentChapter}</p>
                    {(() => {
                      const strat = getChapterStrategy(currentChapter);
                      return strat ? (
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${strat.badge}`}>
                          {strat.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[12px] font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  <span>{subject.name === 'Chemistry' ? 'View Chemistry Flow' : 'View Chapters'}</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}