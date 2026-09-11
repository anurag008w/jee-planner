import { useState } from 'react';
import useStore from '../store/useStore';
import LectureCard from '../components/LectureCard';
import OffDayCatchUp from '../components/OffDayCatchUp';
import ProgressBar from '../components/ProgressBar';
import { getToday, formatDateFull, getGreeting, formatDate, formatDateShort } from '../utils/helpers';
import {
  Calendar, Clock, Target, TrendingUp, BookOpen, ChevronRight, Flame, Sparkles,
  Sun, Moon, Sunset, AlertTriangle, Settings2, CheckCircle2, PartyPopper, Download, Upload,
} from 'lucide-react';

export default function TodayPage() {
  const { lectures, completions, schedule, settings, commonHolidays, setPreviewDate, setAutoShift, setSundaysOff, setAllCommonHolidays, toggleOffDay, setPhaseRanges, resetPhaseRanges, exportBackup, importBackup } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jee-planner-backup-${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('Backup download ho gaya ✅');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importBackup(reader.result);
        setBackupMsg('Backup restore ho gaya ✅');
      } catch (err) {
        setBackupMsg('❌ ' + err.message);
      }
      setTimeout(() => setBackupMsg(''), 4000);
    };
    reader.onerror = () => setBackupMsg('❌ File padhne me error');
    reader.readAsText(file);
    e.target.value = '';
  };

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
  const todayPercent = todayPlan.length > 0 ? Math.round((todayCompleted / todayPlan.length) * 100) : 0;

  // Next study day (resolved plan)
  const futureDates = Object.keys(schedule.dayMap || {}).filter(d => d > today).sort();
  const tomorrow = futureDates[0] || '';
  const tomorrowLectures = tomorrow ? (schedule.dayMap[tomorrow] || []) : [];

  const currentPhase = todayPlan.length > 0 ? todayPlan[0].phase : 'Phase 4';
  const todaySubjects = [...new Set(todayPlan.map(l => l.subject))];

  // Week stats (original-dated lectures within this week, using resolved dayMap)
  const todayDate = new Date(today);
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  let weekPlanned = 0, weekDone = 0;
  weekDates.forEach(wd => {
    const list = (schedule.dayMap && schedule.dayMap[wd]) || [];
    weekPlanned += list.length;
    weekDone += list.filter(l => completions[l.id] === 'completed').length;
  });

  const hour = new Date().getHours();
  const GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const isPreviewing = settings.previewDate && settings.previewDate !== getToday();

  return (
    <div className="space-y-6 pb-4">
      {/* Header row */}
      <div className="animate-fadeIn">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <GreetingIcon size={22} className="text-amber-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}! <span className="text-indigo-600 dark:text-indigo-400">🎯</span>
            </h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-medium border transition-all ${
              showSettings
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300'
                : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Settings2 size={13} />
            Schedule Settings
          </button>
        </div>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 ml-[34px]">
          {formatDateFull(today)}
          {isPreviewing && (
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
              Preview mode — real date: {formatDateShort(getToday())}
            </span>
          )}
          {isOffDay && (
            <span className="ml-2 text-red-500 font-medium">
              {isSunday ? '— Off Day (Sunday)' : '— Off Day'}
            </span>
          )}
        </p>
      </div>

      {/* Schedule Settings panel */}
      {showSettings && (
        <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 animate-scaleIn space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Preview Date (testing)</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Simulate the app on any date to see backlog shift live.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={settings.previewDate || ''}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[12.5px] text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-300 dark:focus:border-indigo-600"
              />
              {settings.previewDate && (
                <button
                  onClick={() => setPreviewDate('')}
                  className="px-3 py-2 rounded-xl text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Auto-shift (cascade)</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Backlog khud aage shift ho (kal ka → aaj, aaj ka → agla din).</p>
            </div>
            <button
              onClick={() => setAutoShift(!settings.autoShift)}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoShift ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.autoShift ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Sundays = Off Day</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Sab Sundays holiday rahenge (calendar me change kar sakte ho).</p>
            </div>
            <button
              onClick={() => setSundaysOff(!settings.offDays.some(d => new Date(d).getDay() === 0))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.offDays.some(d => new Date(d).getDay() === 0) ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settings.offDays.some(d => new Date(d).getDay() === 0) ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Common (non-Sunday) holidays — toggle based */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Common Holidays (non-Sunday)</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Har holiday me toggle hai — OFF ho toh off-day, ON karo toh study day ban jaata hai.
                </p>
              </div>
              {(() => {
                const allOff = commonHolidays.every(h => settings.offDays.includes(h.date));
                return (
                  <button
                    onClick={() => setAllCommonHolidays(!allOff)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex-shrink-0 ${
                      allOff
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    }`}
                    title={allOff ? 'Saare holidays ko study day banao' : 'Saare holidays ko off day banao'}
                  >
                    {allOff ? 'All Study Day' : 'All Off Day'}
                  </button>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {commonHolidays.map(h => {
                const isOff = settings.offDays.includes(h.date);
                const wd = new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div
                    key={h.date}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                      isOff
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
                        : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-[12px] font-semibold truncate ${isOff ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-200'}`}>
                        {formatDateShort(h.date)}
                        <span className="ml-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">({wd})</span>
                      </p>
                      <p className={`text-[10px] ${isOff ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {isOff ? 'Off Day' : 'Study Day'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleOffDay(h.date)}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isOff ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isOff ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Phase Ranges — user decides "itne din tak yeh phase" */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Manual Phase Ranges</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Kisi phase ka sirf start+end date bharo — us window me wahi phase chalega (daily capacity wahi). Auto: chapters khud decide karte hain.
                </p>
              </div>
              <button
                onClick={resetPhaseRanges}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex-shrink-0 ${
                  settings.phaseRanges
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {settings.phaseRanges ? 'Reset to Auto' : 'Auto (chapters) ✓'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((p) => {
                const cur = settings.phaseRanges?.[p] || { start: '', end: '' };
                return (
                  <div key={p} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${settings.phaseRanges?.[p] ? 'bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/40' : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/10'}`}>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${p === 'Phase 1' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : p === 'Phase 2' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : p === 'Phase 3' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {p.replace('Phase ', 'P')}
                    </span>
                    <input
                      type="date"
                      value={cur.start || ''}
                      onChange={(e) => {
                        const next = { ...(settings.phaseRanges || {}) };
                        const n = { ...(next[p] || {}), start: e.target.value };
                        if (!n.start && !n.end) delete next[p]; else next[p] = n;
                        setPhaseRanges(Object.keys(next).length ? next : null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[11.5px] text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-300 dark:focus:border-indigo-600"
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">to</span>
                    <input
                      type="date"
                      value={cur.end || ''}
                      onChange={(e) => {
                        const next = { ...(settings.phaseRanges || {}) };
                        const n = { ...(next[p] || {}), end: e.target.value };
                        if (!n.start && !n.end) delete next[p]; else next[p] = n;
                        setPhaseRanges(Object.keys(next).length ? next : null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[11.5px] text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-300 dark:focus:border-indigo-600"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
              Sirf bharo jo phase boundaries chahiye — baaki phases auto rehte hain. Phase 1 = 2/day, 2 = 3/day, 3 = 4/day, 4 = 5/day.
            </p>
          </div>

          {/* Data Backup — localStorage browser me save hota hai; backup JSON file me rakho */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Data Backup</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
              Progress aur settings is browser ki localStorage me save rehti hai. Extra safety ke liye
              JSON backup download karo — kisi bhi browser me wapas restore kar sakte ho.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <Download size={13} /> Download Backup
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 cursor-pointer transition-colors">
                <Upload size={13} /> Restore Backup
                <input type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
              </label>
              {backupMsg && (
                <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">{backupMsg}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn stagger-1">
        <StatCard icon={isOffDay ? <PartyPopper size={18} /> : <Flame size={18} />} label="Today" value={isOffDay ? 'Off Day' : todayPlan.length ? `${todayPlan.length} lect.` : '—'} sub={isOffDay ? (isSunday ? 'Sunday' : 'Holiday') : currentPhase} color="from-indigo-500 to-purple-500" />
        <StatCard icon={<Target size={18} />} label="Overall" value={`${overallPercent}%`} sub={`${totalCompleted} / ${totalLectures}`} color="from-emerald-500 to-teal-500" />
        <StatCard
          icon={<BookOpen size={18} />}
          label="Backlog"
          value={backlog.length}
          sub={`${schedule.missedDates?.length || 0} red zone day${(schedule.missedDates?.length || 0) !== 1 ? 's' : ''}`}
          color={backlog.length > 0 ? 'from-red-500 to-rose-500' : 'from-gray-400 to-gray-500'}
        />
        <StatCard icon={<TrendingUp size={18} />} label="Finish By" value={schedule.estimatedEndDate ? formatDateShort(schedule.estimatedEndDate) : '—'} sub="estimated" color="from-blue-500 to-cyan-500" />
      </div>

      {/* OFF DAY → catch-up panel */}
      {isOffDay && (
        <div className="animate-fadeIn stagger-2">
          <div className="bg-white dark:bg-[#1a1c2b] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{isSunday ? '🎉' : '🌴'}</span>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {isSunday ? 'Sunday Off, but...' : 'Off Day, but...'}
              </h3>
            </div>
            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mb-4">
              {getGreeting()}! Aaj holiday hai — but agar backlog clear karna ho toh yeh mauka le lo. 😌
            </p>
            <OffDayCatchUp date={today} compact />
          </div>
        </div>
      )}

      {/* STUDY DAY → hero + plan */}
      {!isOffDay && todayPlan.length > 0 && (
        <div className="animate-fadeIn stagger-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 md:p-8 text-white shadow-2xl shadow-indigo-500/30 animate-shimmer">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />

            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-yellow-300" />
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-white/70">
                      Today's Study Plan
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold">
                    {todayPlan.length} Lecture{todayPlan.length > 1 ? 's' : ''} Today
                    {todayPlan.some(l => l.isBacklog) && (
                      <span className="ml-2 align-middle text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white">
                        includes {todayPlan.filter(l => l.isBacklog).length} backlog
                      </span>
                    )}
                  </h2>
                  <p className="text-white/70 text-[13px] mt-1">
                    {currentPhase} • {todaySubjects.join(' + ')}
                  </p>
                </div>

                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - todayPercent / 100)}`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{todayPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{ width: `${todayPercent}%` }} />
              </div>
              <p className="text-white/60 text-[11px] text-right">
                {todayCompleted} of {todayPlan.length} completed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STUDY DAY → today's lectures (backlog first, red) */}
      {!isOffDay && todayPlan.length > 0 && (
        <div className="animate-fadeIn stagger-3">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" />
            Today's Lectures
            {todayPlan.some(l => l.isBacklog) && (
              <span className="text-[10.5px] font-semibold text-red-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                backlog pehle
              </span>
            )}
            <span
              className="ml-auto text-[10.5px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 whitespace-nowrap"
              title="Effort units — ONE SHOT lecture = 0.5"
            >
              {todayPlan.length} L · {(schedule.dayLoad?.[today] || 0).toFixed(1)}/{schedule.dayCap?.[today] || 0} effort
            </span>
          </h3>
          <div className="space-y-3">
            {todayPlan.map((lecture, idx) => (
              <div key={lecture.id} className="relative pl-8">
                {idx < todayPlan.length - 1 && (
                  <div className="absolute left-[11px] top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />
                )}
                <div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  completions[lecture.id] === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : lecture.isBacklog
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-white dark:bg-[#1a1c2b] border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {lecture.slot}
                </div>
                <LectureCard lecture={lecture} showTimeline showOriginal />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No lectures day (non-off, e.g. before start or overflow-free finish) */}
      {!isOffDay && todayPlan.length === 0 && (
        <div className="animate-fadeIn stagger-2 text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nothing Scheduled Today</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {backlog.length > 0
              ? `${backlog.length} backlog lecture${backlog.length > 1 ? 's' : ''} pending — clear them from the backlog pool below!`
              : 'Sab plan ke hisaab se on-track hai. 💪'}
          </p>
        </div>
      )}

      {/* RED BACKLOG POOL */}
      {backlog.length > 0 && (
        <div className="animate-fadeIn stagger-4 bg-white dark:bg-[#1a1c2b] rounded-2xl border border-red-200 dark:border-red-900/30 overflow-hidden">
          <div className="px-5 py-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
                  <AlertTriangle size={15} />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-red-700 dark:text-red-300">Backlog Pool</h3>
                  <p className="text-[11px] text-red-500/80 dark:text-red-400/80">
                    {backlog.length} pending from {schedule.missedDates?.length || 0} missed day{schedule.missedDates?.length !== 1 ? 's' : ''} — inme se koi bhi complete karo
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300">
                RED ZONE
              </span>
            </div>

            {settings.autoShift && (
              <p className="text-[11px] text-red-500/70 dark:text-red-400/70 mt-2 flex items-center gap-1.5">
                <ChevronRight size={11} />
                Ye backlog plan me aage shift ho chuka hai — pehle inhe, phir naye lectures.
              </p>
            )}
            {!settings.autoShift && (
              <p className="text-[11px] text-red-500/70 dark:text-red-400/70 mt-2 flex items-center gap-1.5">
                <ChevronRight size={11} />
                Auto-shift band hai — ye backlog kahen shift nahi hua, sirf yahan red me dikh raha hai.
              </p>
            )}
          </div>

          <div className="p-4 space-y-2">
            {backlog.map(l => (
              <LectureCard key={l.id} lecture={{ ...l, isBacklog: true }} compact showDate showOriginal />
            ))}
          </div>
        </div>
      )}

      {/* Up next */}
      {tomorrowLectures.length > 0 && (
        <div className="animate-fadeIn stagger-5">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ChevronRight size={16} className="text-purple-500" />
            Up Next — {formatDateShort(tomorrow)}
            <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500 ml-1">
              {tomorrowLectures.length} lecture{tomorrowLectures.length > 1 ? 's' : ''}
              {tomorrowLectures.some(l => l.isBacklog) && ' • backlog'}
            </span>
          </h3>
          <div className="space-y-2">
            {tomorrowLectures.slice(0, 3).map(l => (
              <LectureCard key={l.id} lecture={l} compact showDate />
            ))}
          </div>
        </div>
      )}

      {/* Progress card */}
      <div className="animate-fadeIn stagger-6 bg-white dark:bg-[#1a1c2b] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">Overall Progress</h3>
          <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">{overallPercent}%</span>
        </div>
        <ProgressBar value={overallPercent} size="lg" showShimmer />
        <div className="flex justify-between mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span>{totalCompleted} completed</span>
          <span>{remaining} remaining • {Math.round(schedule.totalEffort || remaining)} effort units</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <SubjectMini label="Physics" total={139} completed={lectures.filter(l => l.subject === 'Physics' && completions[l.id] === 'completed').length} color="bg-blue-500" />
          <SubjectMini label="Math" total={135} completed={lectures.filter(l => l.subject === 'Mathematics' && completions[l.id] === 'completed').length} color="bg-amber-500" />
          <SubjectMini label="Chemistry" total={118} completed={lectures.filter(l => l.subject === 'Chemistry' && completions[l.id] === 'completed').length} color="bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card-surface rounded-xl p-4 card-hover transition-shadow duration-200">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function SubjectMini({ label, total, completed, color }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="text-center">
      <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-[10.5px] text-gray-400 dark:text-gray-500">{completed}/{total}</p>
    </div>
  );
}