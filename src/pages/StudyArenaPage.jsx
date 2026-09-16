import { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import ProgressBar from '../components/ProgressBar';
import { getSubjectColor, getBranchColor } from '../utils/helpers';
import { getChapterStrategy } from '../data/chapterStrategy';
import { getChapterPairing } from '../data/chapterPairing';
import { Atom, Calculator, FlaskConical, ChevronDown, ChevronUp, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';

const SUBJECTS = [
  { key: 'Physics', label: 'Physics', icon: Atom, gradient: 'from-blue-500 to-blue-700' },
  { key: 'Mathematics', label: 'Mathematics', icon: Calculator, gradient: 'from-amber-500 to-orange-600' },
  { key: 'Chemistry', label: 'Chemistry', icon: FlaskConical, gradient: 'from-emerald-500 to-teal-600' },
];
const CHEM_TABS = ['Overall', 'Physical', 'Organic', 'Inorganic'];
const BRANCH_NAMES = { Physical: 'Physical Chemistry', Organic: 'Organic Chemistry', Inorganic: 'Inorganic Chemistry' };

export default function StudyArenaPage() {
  const { lectures, completions, currentPage } = useStore();
  const preferred = typeof window !== 'undefined' ? localStorage.getItem('jee-planner-arena-subject') : '';
  const legacyChemistryEntry = currentPage === 'chemistry' && !preferred;
  const initialSubject = legacyChemistryEntry ? 'Chemistry' : (SUBJECTS.some(s => s.key === preferred) ? preferred : 'Physics');
  const [subject, setSubject] = useState(initialSubject);
  const [chemTab, setChemTab] = useState(legacyChemistryEntry ? 'Overall' : 'Overall');
  const [expanded, setExpanded] = useState(null);

  const data = useMemo(() => {
    const base = lectures.filter(l => l.subject === subject);
    const filtered = subject === 'Chemistry' && chemTab !== 'Overall' ? base.filter(l => l.chemistryBranch === BRANCH_NAMES[chemTab]) : base;
    const names = [...new Set(filtered.map(l => l.chapterName))];
    const chapters = names.map(name => {
      const ls = filtered.filter(l => l.chapterName === name).sort((a,b) => (a.lectureNumber||0)-(b.lectureNumber||0) || a.id-b.id);
      const done = ls.filter(l => completions[l.id] === 'completed').length;
      return { name, lectures: ls, done, total: ls.length, pct: ls.length ? Math.round(done/ls.length*100) : 0, current: ls.find(l => completions[l.id] !== 'completed') };
    });
    const done = filtered.filter(l => completions[l.id] === 'completed').length;
    return { chapters, done, total: filtered.length, pct: filtered.length ? Math.round(done/filtered.length*100) : 0 };
  }, [lectures, completions, subject, chemTab]);

  const changeSubject = key => { setSubject(key); setExpanded(null); localStorage.setItem('jee-planner-arena-subject', key); if(key!=='Chemistry') setChemTab('Overall'); };
  const current = SUBJECTS.find(s=>s.key===subject) || SUBJECTS[0];
  const Icon = current.icon;
  const branchCounts = subject === 'Chemistry' ? CHEM_TABS.slice(1).map(tab => { const list=lectures.filter(l=>l.subject==='Chemistry'&&l.chemistryBranch===BRANCH_NAMES[tab]); const done=list.filter(l=>completions[l.id]==='completed').length; return {tab,total:list.length,done,pct:list.length?Math.round(done/list.length*100):0}; }) : [];

  return <div className="animate-fadeIn space-y-5 pb-8">
    <div><div className="flex items-center gap-3"><div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${current.gradient} text-white grid place-items-center shadow-lg`}><Icon size={22}/></div><div><h1 className="page-title">Study Arena</h1><p className="page-sub">Physics, Mathematics and Chemistry — one focused place.</p></div></div></div>
    <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-white/[.04] border border-gray-200 dark:border-white/5">
      {SUBJECTS.map(s=>{const I=s.icon;const active=subject===s.key;const total=lectures.filter(l=>l.subject===s.key).length;return <button key={s.key} onClick={()=>changeSubject(s.key)} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-bold transition-all ${active?'bg-white dark:bg-[#1a1c2b] shadow-sm text-gray-900 dark:text-white':'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}><I size={16}/><span>{s.label}</span><span className="hidden sm:inline text-[9px] opacity-50">{total}L</span></button>})}
    </div>
    {subject==='Chemistry'&&<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{CHEM_TABS.map(tab=><button key={tab} onClick={()=>{setChemTab(tab);setExpanded(null)}} className={`px-4 py-2 rounded-xl whitespace-nowrap text-xs font-bold border transition-all ${chemTab===tab?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30':'bg-white dark:bg-[#1a1c2b] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5'}`}>{tab}</button>)}</div>}
    <section className={`rounded-2xl overflow-hidden bg-gradient-to-br ${current.gradient} text-white shadow-xl`}><div className="p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] uppercase tracking-wider font-bold text-white/65">Overall {subject}</p><p className="text-3xl font-black mt-1">{data.pct}%</p><p className="text-[11px] text-white/65 mt-1">{data.done} of {data.total} lectures completed</p></div><div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 grid place-items-center"><Icon size={34}/></div></div><div className="mt-5 h-2 bg-white/15 rounded-full overflow-hidden"><ProgressBar value={data.pct} size="md" gradient="bg-white" trackClassName="h-full w-full bg-transparent"/></div></div></section>
    {subject==='Chemistry'&&<div className="grid grid-cols-3 gap-2.5">{branchCounts.map(b=>{const bc=getBranchColor(BRANCH_NAMES[b.tab]);return <button key={b.tab} onClick={()=>setChemTab(b.tab)} className={`text-left rounded-xl border p-3 transition-all hover:shadow-sm ${bc.bg} ${bc.dark}`}><div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{b.tab}</div><div className="text-lg font-black mt-1">{b.pct}%</div><div className="text-[10px] opacity-60">{b.done}/{b.total}</div><div className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-current opacity-70" style={{width:`${b.pct}%`}}/></div></button>})}</div>}
    <div className="grid grid-cols-3 gap-2.5"><MiniStat label="Chapters" value={data.chapters.length} icon={<BookOpen size={15}/>}/><MiniStat label="Completed" value={data.chapters.filter(c=>c.done===c.total).length} icon={<CheckCircle2 size={15}/>}/><MiniStat label="In progress" value={data.chapters.filter(c=>c.done>0&&c.done<c.total).length} icon={<Clock3 size={15}/>}/></div>
    <div className="space-y-2.5">{data.chapters.map((ch,idx)=>{const open=expanded===ch.name;const strat=getChapterStrategy(ch.name);const pair=getChapterPairing(ch.name);const allDone=ch.done===ch.total;return <div key={ch.name} className={`rounded-2xl border overflow-hidden transition-all ${open?'border-indigo-200 dark:border-indigo-700/40 shadow-sm':'border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1c2b]'}`}><button onClick={()=>setExpanded(open?null:ch.name)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/[.03] transition-colors"><div className="flex items-start gap-3"><div className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${allDone?'bg-green-100 text-green-600 dark:bg-green-900/25 dark:text-green-300':`${getSubjectColor(subject).bg} ${getSubjectColor(subject).dark}`}`}>{allDone?<CheckCircle2 size={17}/>:<span className="text-xs font-black">{idx+1}</span>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><h3 className="text-[13.5px] font-bold text-gray-900 dark:text-white">{ch.name}</h3>{strat&&<span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${strat.badge}`}>{strat.label}</span>}</div><div className="flex items-center gap-3 mt-1 text-[10.5px] text-gray-400"><span>{ch.done}/{ch.total} lectures</span>{ch.current&&<span className="truncate">Next: L{ch.current.lectureNumber}</span>}</div></div><div className="flex items-center gap-2 flex-shrink-0"><span className="text-xs font-black text-gray-500 dark:text-gray-300">{ch.pct}%</span>{open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</div></div><div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${allDone?'bg-green-500':subject==='Chemistry'?'bg-emerald-500':subject==='Mathematics'?'bg-amber-500':'bg-blue-500'}`} style={{width:`${ch.pct}%`}}/></div></button>{open&&<div className="px-4 pb-4 space-y-2 animate-fadeIn">{pair&&<div className="rounded-xl bg-gray-50 dark:bg-white/[.04] border border-gray-100 dark:border-white/5 p-3"><div className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400">11th base</div><div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">{pair.base}</div></div>}{ch.lectures.map(l=><LectureCard key={l.id} lecture={l} compact showDate showOriginal/>)}</div>}</div>})}</div>
  </div>;
}

function MiniStat({label,value,icon}){return <div className="card-surface rounded-xl p-3"><div className="flex items-center gap-2 text-gray-400"><span>{icon}</span><span className="text-[10px] uppercase tracking-wider font-bold">{label}</span></div><p className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</p></div>}
