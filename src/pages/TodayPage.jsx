import { useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import OffDayCatchUp from '../components/OffDayCatchUp';
import ProgressBar from '../components/ProgressBar';
import { getToday, formatDateFull, getGreeting, formatDateShort } from '../utils/helpers';
import {
  Calendar, Target, TrendingUp, BookOpen, ChevronRight, Flame, Sparkles,
  Sun, Moon, Sunset, AlertTriangle, CheckCircle2, PartyPopper,
} from 'lucide-react';

export default function TodayPage() {
  const { lectures, completions, schedule, settings } = useStore();
  const [backlogOpen, setBacklogOpen] = useState(false);

  const today = schedule.today;
  const todayPlan = (schedule.dayMap && schedule.dayMap[today]) || [];
  const backlog = schedule.backlogList || [];
  const isOffDay = settings.offDays.includes(today);
  const isSunday = new Date(today).getDay() === 0;
  const todayCompleted = todayPlan.filter(l => completions[l.id] === 'completed').length;
  const totalCompleted = Object.values(completions).filter(v => v === 'completed').length;
  const totalLectures = lectures.length;
  const remaining = totalLectures - totalCompleted;
  const overallPercent = totalLectures ? Math.round((totalCompleted / totalLectures) * 100) : 0;
  const todayPercent = todayPlan.length ? Math.round((todayCompleted / todayPlan.length) * 100) : 0;
  const futureDates = Object.keys(schedule.dayMap || {}).filter(d => d > today).sort();
  const tomorrow = futureDates[0] || '';
  const tomorrowLectures = tomorrow ? (schedule.dayMap[tomorrow] || []) : [];
  const currentPhase = todayPlan.length > 0 ? todayPlan[0].phase : 'Phase 4';
  const todaySubjects = [...new Set(todayPlan.map(l => l.subject))];
  const hour = new Date().getHours();
  const GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const isPreviewing = settings.previewDate && settings.previewDate !== getToday();

  return (
    <div className="space-y-6 pb-4">
      <div className="animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <GreetingIcon size={22} className="text-amber-500 shrink-0" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {getGreeting()}! <span className="text-indigo-600 dark:text-indigo-400">🎯</span>
            </h1>
          </div>
        </div>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 ml-[34px]">
          {formatDateFull(today)}
          {isPreviewing && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">Preview mode — real date: {formatDateShort(getToday())}</span>}
          {isOffDay && <span className="ml-2 text-red-500 font-medium">{isSunday ? '— Off Day (Sunday)' : '— Off Day'}</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn stagger-1">
        <StatCard icon={isOffDay ? <PartyPopper size={18} /> : <Flame size={18} />} label="Today" value={isOffDay ? 'Off Day' : todayPlan.length ? `${todayPlan.length} lect.` : '—'} sub={isOffDay ? (isSunday ? 'Sunday' : 'Holiday') : currentPhase} color="from-indigo-500 to-purple-500" />
        <StatCard icon={<Target size={18} />} label="Overall" value={`${overallPercent}%`} sub={`${totalCompleted} / ${totalLectures}`} color="from-emerald-500 to-teal-500" />
        <StatCard icon={<BookOpen size={18} />} label="Backlog" value={backlog.length} sub={`${schedule.missedDates?.length || 0} red zone day${(schedule.missedDates?.length || 0) !== 1 ? 's' : ''}`} color={backlog.length > 0 ? 'from-red-500 to-rose-500' : 'from-gray-400 to-gray-500'} />
        <StatCard icon={<TrendingUp size={18} />} label="Finish By" value={schedule.estimatedEndDate ? formatDateShort(schedule.estimatedEndDate) : '—'} sub="estimated" color="from-blue-500 to-cyan-500" />
      </div>

      {isOffDay && (
        <div className="animate-fadeIn stagger-2">
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{isSunday ? '🎉' : '🌴'}</span><h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{isSunday ? 'Sunday Off, but...' : 'Off Day, but...'}</h3></div>
            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mb-4">{getGreeting()}! Aaj holiday hai — but agar backlog clear karna ho toh yeh mauka le lo. 😌</p>
            <OffDayCatchUp date={today} compact />
          </div>
        </div>
      )}

      {!isOffDay && todayPlan.length > 0 && (
        <>
          <div className="animate-fadeIn stagger-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 md:p-8 text-white shadow-2xl shadow-indigo-500/30 animate-shimmer">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-yellow-300" /><span className="text-[12px] font-semibold uppercase tracking-wider text-white/70">Today's Study Plan</span></div>
                    <h2 className="text-xl md:text-2xl font-bold">{todayPlan.length} Lecture{todayPlan.length > 1 ? 's' : ''} Today{todayPlan.some(l => l.isBacklog) && <span className="ml-2 align-middle text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white">includes {todayPlan.filter(l => l.isBacklog).length} backlog</span>}</h2>
                    <p className="text-white/70 text-[13px] mt-1">{currentPhase} • {todaySubjects.join(' + ')}</p>
                  </div>
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6"/><circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - todayPercent / 100)}`} className="transition-all duration-700 ease-out"/></svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold">{todayPercent}%</span></div>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mb-1"><div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{width:`${todayPercent}%`}}/></div>
                <p className="text-white/60 text-[11px] text-right">{todayCompleted} of {todayPlan.length} completed</p>
              </div>
            </div>
          </div>

          <div className="animate-fadeIn stagger-3">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Calendar size={16} className="text-indigo-500"/>Today's Lectures{todayPlan.some(l => l.isBacklog) && <span className="text-[10.5px] font-semibold text-red-500 flex items-center gap-1"><AlertTriangle size={12}/>backlog pehle</span>}<span className="ml-auto text-[10.5px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 whitespace-nowrap">{todayPlan.length} L · {(schedule.dayLoad?.[today] || 0).toFixed(1)}/{schedule.dayCap?.[today] || 0} effort</span></h3>
            <div className="space-y-3">
              {todayPlan.map((lecture, idx) => <div key={lecture.id} className="relative pl-8">{idx < todayPlan.length - 1 && <div className="absolute left-[11px] top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10"/>}<div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${completions[lecture.id]==='completed'?'bg-green-500 border-green-500 text-white':lecture.isBacklog?'bg-red-500 border-red-500 text-white':'bg-white dark:bg-[#1a1c2b] border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'}`}>{lecture.slot}</div><LectureCard lecture={lecture} showTimeline showOriginal/></div>)}
            </div>
          </div>
        </>
      )}

      {!isOffDay && todayPlan.length === 0 && <div className="animate-fadeIn stagger-2 text-center py-12"><div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center"><CheckCircle2 size={32} className="text-indigo-500"/></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nothing Scheduled Today</h3><p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{backlog.length > 0 ? `${backlog.length} backlog lecture${backlog.length > 1 ? 's' : ''} pending — clear them from the backlog pool below!` : 'Sab plan ke hisaab se on-track hai. 💪'}</p></div>}

      {backlog.length > 0 && <div className="animate-fadeIn stagger-4 card-surface overflow-hidden"><button onClick={() => setBacklogOpen(o => !o)} aria-expanded={backlogOpen} className="w-full px-4 py-3 text-left"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"/><span className="flex-1 min-w-0 text-[13.5px] font-bold text-gray-900 dark:text-white truncate">Backlog</span><ChevronRight size={16} className={`text-gray-400 shrink-0 transition-transform ${backlogOpen ? 'rotate-90' : ''}`}/></span><span className="flex items-center gap-2 mt-1 pl-[14px]"><span className="flex-1 text-[11px] text-gray-400 truncate">{backlog.length} pending · {backlog.length} lecture{backlog.length !== 1 ? 's' : ''}</span><span className="inline-flex items-center gap-1 px-1.5 py-px rounded-md border border-red-200 dark:border-red-500/30 text-[9px] font-bold tracking-wider text-red-500"><span className="w-1 h-1 rounded-full bg-red-500"/>RED ZONE</span></span></button><div className={`grid transition-all duration-200 ${backlogOpen?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-gray-100 dark:border-white/5"><p className="px-1 pt-2 text-[10.5px] text-gray-400">Oldest lectures first</p>{backlog.map(l=><LectureCard key={l.id} lecture={{...l,isBacklog:true}} compact showDate showOriginal/>)}</div></div></div></div>}

      {tomorrowLectures.length > 0 && <div className="animate-fadeIn stagger-5"><h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><ChevronRight size={16} className="text-purple-500"/>Up Next — {formatDateShort(tomorrow)}<span className="text-[11px] font-normal text-gray-400 ml-1">{tomorrowLectures.length} lecture{tomorrowLectures.length > 1 ? 's' : ''}{tomorrowLectures.some(l=>l.isBacklog) && ' • backlog'}</span></h3><div className="space-y-2">{tomorrowLectures.slice(0,3).map(l=><LectureCard key={l.id} lecture={l} compact showDate/>)}</div></div>}

      <div className="animate-fadeIn stagger-6 card-surface p-5"><div className="flex items-center justify-between mb-3"><h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">Overall Progress</h3><span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">{overallPercent}%</span></div><ProgressBar value={overallPercent} size="lg" showShimmer/><div className="flex justify-between mt-2 text-[11px] text-gray-500 dark:text-gray-400"><span>{totalCompleted} completed</span><span>{remaining} remaining • {Math.round(schedule.totalEffort || remaining)} effort units</span></div><div className="mt-4 grid grid-cols-3 gap-3"><SubjectMini label="Physics" total={139} completed={lectures.filter(l=>l.subject==='Physics'&&completions[l.id]==='completed').length} color="bg-blue-500"/><SubjectMini label="Math" total={135} completed={lectures.filter(l=>l.subject==='Mathematics'&&completions[l.id]==='completed').length} color="bg-amber-500"/><SubjectMini label="Chemistry" total={118} completed={lectures.filter(l=>l.subject==='Chemistry'&&completions[l.id]==='completed').length} color="bg-emerald-500"/></div></div>
    </div>
  );
}

function StatCard({icon,label,value,sub,color}) { return <div className="card-surface rounded-xl p-4 card-hover transition-shadow duration-200"><div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-lg`}>{icon}</div><p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p><p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p></div> }
function SubjectMini({label,total,completed,color}) { const pct=total?Math.round((completed/total)*100):0; return <div className="text-center"><div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-1.5"><div className={`h-full rounded-full ${color} transition-all duration-500`} style={{width:`${pct}%`}}/></div><p className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400">{label}</p><p className="text-[10.5px] text-gray-400 dark:text-gray-500">{completed}/{total}</p></div> }
