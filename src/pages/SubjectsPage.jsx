import useStore from '../store/useStore';
import { getSubjectColor } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import ProgressBar from '../components/ProgressBar';
import { ChevronRight, Atom, Calculator, FlaskConical } from 'lucide-react';

const SUBJECTS = [
  { name: 'Physics', icon: Atom, iconBg: 'from-blue-500 to-blue-600' },
  { name: 'Mathematics', icon: Calculator, iconBg: 'from-amber-500 to-amber-600' },
  { name: 'Chemistry', icon: FlaskConical, iconBg: 'from-emerald-500 to-emerald-600' },
];

export default function SubjectsPage() {
  const { lectures, completions, setPage } = useStore();
  const totalCompleted = Object.values(completions).filter(v => v === 'completed').length;
  const grandPct = Math.round((totalCompleted / Math.max(1, lectures.length)) * 100);

  const openSubject = (name) => {
    localStorage.setItem('jee-planner-arena-subject', name);
    setPage('arena');
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Subjects Overview</h2>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">Physics, Mathematics and Chemistry — live plan overview</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="flex items-center justify-between mb-4"><div><p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Total Lectures</p><p className="text-3xl font-bold mt-1">{lectures.length}</p></div><div className="text-right"><p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Completed</p><p className="text-3xl font-bold mt-1">{grandPct}%</p></div></div>
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden"><ProgressBar value={grandPct} size="md" gradient="bg-white" trackClassName="h-full w-full bg-transparent" /></div>
        <div className="flex justify-between mt-2 text-[11px] text-white/60"><span>{totalCompleted} completed</span><span>{lectures.length-totalCompleted} remaining</span></div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {SUBJECTS.map((subject) => {
          const Icon = subject.icon;
          const list = lectures.filter(l => l.subject === subject.name);
          const total = list.length;
          const completed = list.filter(l => completions[l.id] === 'completed').length;
          const remaining = total - completed;
          const pct = Math.round((completed / Math.max(1,total)) * 100);
          const chapters = [...new Set(list.map(l => l.chapterName))];
          const completedChapters = chapters.filter(ch => list.filter(l => l.chapterName === ch).every(l => completions[l.id] === 'completed')).length;
          const next = [...list].sort((a,b)=>a.newStudyDate.localeCompare(b.newStudyDate)).find(l=>completions[l.id]!=='completed');
          const color = getSubjectColor(subject.name);
          return (
            <button key={subject.name} type="button" onClick={()=>openSubject(subject.name)} className="text-left bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <div className={`bg-gradient-to-br ${subject.iconBg} p-5 text-white relative overflow-hidden`}><div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"/><div className="relative flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm"><Icon size={24}/></div><div><h3 className="text-lg font-bold">{subject.name}</h3><p className="text-white/70 text-[12px]">{total} lectures</p></div></div></div>
              <div className="p-5 space-y-4">
                <div><div className="flex items-center justify-between mb-2"><span className="text-[13px] font-semibold text-gray-900 dark:text-white">{pct}% Complete</span><span className="text-[12px] text-gray-500 dark:text-gray-400">{completed}/{total}</span></div><div className="w-full h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><ProgressBar value={pct} size="md" gradient={`bg-gradient-to-r ${subject.iconBg}`} trackClassName="h-full w-full bg-transparent"/></div></div>
                <div className="grid grid-cols-2 gap-3"><div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3"><p className="text-[10.5px] text-gray-400 uppercase font-medium">Chapters</p><p className="text-[15px] font-bold text-gray-900 dark:text-white mt-0.5">{completedChapters}/{chapters.length}</p></div><div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3"><p className="text-[10.5px] text-gray-400 uppercase font-medium">Remaining</p><p className="text-[15px] font-bold text-gray-900 dark:text-white mt-0.5">{remaining}</p></div></div>
                <div className="pt-3 border-t border-gray-100 dark:border-white/5"><p className="text-[10.5px] text-gray-400 uppercase font-medium mb-1">Current Chapter</p><div className="flex items-center gap-2"><p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">{next?.chapterName || 'All Done!'}</p>{next && (()=>{const s=getChapterStrategy(next.chapterName);return s?<span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${s.badge}`}>{s.label}</span>:null})()}</div></div>
                <div className={`flex items-center justify-between pt-1 text-[12px] font-medium ${color.text} dark:${color.text} group-hover:translate-x-0.5 transition-transform`}><span>Open in Study Arena</span><ChevronRight size={14}/></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
