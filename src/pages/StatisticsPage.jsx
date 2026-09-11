import useStore from '../store/useStore';
import { getSubjectColor, getBranchColor, getPhaseColor, formatDateFull } from '../utils/helpers';
import { differenceInDays, parseISO } from 'date-fns';
import ProgressBar from '../components/ProgressBar';
import { BarChart3, Target, Calendar, BookOpen, Zap, TrendingUp, Clock, CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react';

export default function StatisticsPage() {
  const { lectures, completions, chapterProgress, schedule, settings } = useStore();

  const totalLectures = lectures.length;
  const totalCompleted = Object.values(completions).filter(v => v === 'completed').length;
  const totalRemaining = totalLectures - totalCompleted;
  const overallPct = Math.round((totalCompleted / totalLectures) * 100);

  const allDates = [...new Set(lectures.map(l => l.newStudyDate))];
  const totalStudyDays = allDates.length;
  const daysUntilFinal = schedule.estimatedEndDate
    ? Math.max(0, differenceInDays(parseISO(schedule.estimatedEndDate), parseISO(schedule.today)))
    : 0;

  const backlogCount = (schedule.backlogList || []).length;
  const missedDays = (schedule.missedDates || []).length;
  const offDaysCount = (settings.offDays || []).length;

  const subjects = ['Physics', 'Mathematics', 'Chemistry'].map(s => {
    const sLectures = lectures.filter(l => l.subject === s);
    const sCompleted = sLectures.filter(l => completions[l.id] === 'completed').length;
    return {
      name: s,
      total: sLectures.length,
      completed: sCompleted,
      remaining: sLectures.length - sCompleted,
      pct: Math.round((sCompleted / sLectures.length) * 100),
      color: getSubjectColor(s),
    };
  });

  const branches = ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'].map(b => {
    const bLectures = lectures.filter(l => l.chemistryBranch === b);
    const bCompleted = bLectures.filter(l => completions[l.id] === 'completed').length;
    return {
      name: b,
      shortName: b.replace(' Chemistry', ''),
      total: bLectures.length,
      completed: bCompleted,
      pct: Math.round((bCompleted / bLectures.length) * 100),
      color: getBranchColor(b),
    };
  });

  const phaseNames = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
  const phaseStats = phaseNames.map(p => {
    const pLectures = lectures.filter(l => l.phase === p);
    const pCompleted = pLectures.filter(l => completions[l.id] === 'completed').length;
    const pDates = [...new Set(pLectures.map(l => l.newStudyDate))];
    return {
      name: p,
      total: pLectures.length,
      completed: pCompleted,
      pct: Math.round((pCompleted / pLectures.length) * 100),
      studyDays: pDates.length,
      color: getPhaseColor(p),
    };
  });

  const facultyMap = {};
  lectures.forEach(l => {
    if (!facultyMap[l.facultyName]) facultyMap[l.facultyName] = { total: 0, completed: 0 };
    facultyMap[l.facultyName].total++;
    if (completions[l.id] === 'completed') facultyMap[l.facultyName].completed++;
  });
  const facultyList = Object.entries(facultyMap)
    .map(([name, data]) => ({ name, ...data, pct: Math.round((data.completed / data.total) * 100) }))
    .sort((a, b) => b.total - a.total);

  const totalChapters = chapterProgress.length;
  const completedChapters = chapterProgress.filter(cp => {
    const cl = lectures.filter(l => l.chapterName === cp.chapter);
    return cl.every(l => completions[l.id] === 'completed');
  }).length;

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Statistics</h2>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">Your JEE 2027 study analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<BarChart3 size={18} />} label="Total Lectures" value={totalLectures} sub={`${totalCompleted} done, ${totalRemaining} left`} gradient="from-indigo-500 to-purple-500" />
        <StatCard icon={<Target size={18} />} label="Completion" value={`${overallPct}%`} sub={`${totalCompleted} of ${totalLectures}`} gradient="from-emerald-500 to-teal-500" />
        <StatCard icon={<Calendar size={18} />} label="Study Days" value={totalStudyDays} sub={`${daysUntilFinal} days to finish`} gradient="from-amber-500 to-orange-500" />
        <StatCard icon={<BookOpen size={18} />} label="Chapters" value={`${completedChapters}/${totalChapters}`} sub="Done" gradient="from-blue-500 to-cyan-500" />
        <StatCard
          icon={backlogCount > 0 ? <AlertTriangle size={18} /> : <PartyPopper size={18} />}
          label="Backlog"
          value={backlogCount}
          sub={`${missedDays} red-zone day${missedDays !== 1 ? 's' : ''}`}
          gradient={backlogCount > 0 ? 'from-red-500 to-rose-500' : 'from-gray-400 to-gray-500'}
        />
        <StatCard icon={<Clock size={18} />} label="Off Days Taken" value={offDaysCount} sub="holidays in plan" gradient="from-fuchsia-500 to-pink-500" />
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Estimated Final Completion</p>
          <p className="text-xl font-bold mt-1">
            {schedule.estimatedEndDate ? formatDateFull(schedule.estimatedEndDate) : '—'}
          </p>
          {backlogCount > 0 && (
            <p className="text-white/70 text-[11px] mt-1">
              Backlog shift hone ki wajah se date aage badh sakti hai
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Days Remaining</p>
          <p className="text-3xl font-bold mt-1">{daysUntilFinal}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          Lectures by Subject
        </h3>
        <div className="space-y-4">
          {subjects.map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${s.color.badge} ${s.color.dark}`}>{s.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="text-gray-500 dark:text-gray-400">{s.completed}/{s.total}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{s.pct}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, backgroundColor: s.color.hex }} />
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 w-12 text-right">{s.remaining} left</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" />
          Chemistry Branches
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {branches.map(b => (
            <div key={b.name} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="5" className="dark:stroke-white/5" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={b.color.hex} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - b.pct / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] font-bold text-gray-900 dark:text-white">{b.pct}%</span>
                </div>
              </div>
              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{b.shortName}</p>
              <p className="text-[10.5px] text-gray-400 dark:text-gray-500">{b.completed}/{b.total}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-purple-500" />
          Phase Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {phaseStats.map(p => (
            <div key={p.name} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-center">
              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-[12px] font-bold`} style={{ backgroundColor: p.color.hex }}>
                {p.name.replace('Phase ', 'P')}
              </div>
              <p className="text-[13px] font-bold text-gray-900 dark:text-white">{p.pct}%</p>
              <p className="text-[10.5px] text-gray-400 dark:text-gray-500">{p.total} lectures</p>
              <p className="text-[10.5px] text-gray-400 dark:text-gray-500">{p.studyDays} days</p>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, backgroundColor: p.color.hex }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1f32] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-500" />
          Faculty Overview
        </h3>
        <div className="space-y-3">
          {facultyList.map(f => (
            <div key={f.name} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                {f.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] font-medium text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{f.completed}/{f.total}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, gradient }) {
  return (
    <div className="card-surface rounded-xl p-4 card-hover transition-shadow">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-[10.5px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}