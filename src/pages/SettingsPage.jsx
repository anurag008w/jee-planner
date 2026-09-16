import { useEffect, useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { formatDateShort } from '../utils/helpers';
import {
  Settings2, CalendarDays, RefreshCw, Download, Upload, Palette, RotateCcw,
  Github, CheckCircle2, AlertCircle, ExternalLink, Sparkles, MonitorCog,
} from 'lucide-react';

const CURRENT_VERSION = '1.0.0';
const RELEASE_API = 'https://api.github.com/repos/anurag008w/jee-planner/releases/latest';
const RELEASES_URL = 'https://github.com/anurag008w/jee-planner/releases';
const AUTO_UPDATE_KEY = 'jee-planner-auto-updates';
const LAST_CHECK_KEY = 'jee-planner-last-update-check';
const LAST_RELEASE_KEY = 'jee-planner-latest-release';

export default function SettingsPage() {
  const {
    theme, toggleTheme, settings, commonHolidays,
    setPreviewDate, setStartDate, setAutoShift, setSundaysOff,
    setAllCommonHolidays, toggleOffDay, setPhaseRanges, resetPhaseRanges,
    exportBackup, importBackup,
  } = useStore();
  const [backupMsg, setBackupMsg] = useState('');
  const [autoUpdates, setAutoUpdates] = useState(() => localStorage.getItem(AUTO_UPDATE_KEY) !== 'false');
  const [latest, setLatest] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LAST_RELEASE_KEY) || 'null'); } catch { return null; }
  });
  const [lastChecked, setLastChecked] = useState(() => localStorage.getItem(LAST_CHECK_KEY) || '');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  const sundayOn = settings.offDays.some(d => new Date(d).getDay() === 0);
  const allHolidaysOff = commonHolidays.length > 0 && commonHolidays.every(h => settings.offDays.includes(h.date));

  const updateAvailable = useMemo(() => {
    const v = latest?.tag_name?.replace(/^v/, '');
    if (!v) return false;
    const a = v.split('.').map(Number), b = CURRENT_VERSION.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    return false;
  }, [latest]);

  const handleCheck = async () => {
    setChecking(true); setCheckError('');
    try {
      const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
      const data = await res.json();
      setLatest(data);
      const now = new Date().toISOString();
      setLastChecked(now);
      localStorage.setItem(LAST_RELEASE_KEY, JSON.stringify(data));
      localStorage.setItem(LAST_CHECK_KEY, now);
    } catch (err) {
      setCheckError('Update check failed. Internet/GitHub connection check karo.');
    } finally { setChecking(false); }
  };

  const toggleAutoUpdates = () => {
    const next = !autoUpdates;
    setAutoUpdates(next);
    localStorage.setItem(AUTO_UPDATE_KEY, String(next));
  };

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `jee-planner-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setBackupMsg('Backup downloaded successfully.');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importBackup(reader.result); setBackupMsg('Backup restored successfully.'); }
      catch (err) { setBackupMsg(`Restore failed: ${err.message}`); }
      setTimeout(() => setBackupMsg(''), 4000);
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white grid place-items-center shadow-lg shadow-indigo-500/20">
              <Settings2 size={21} />
            </div>
            <div>
              <h1 className="page-title">Settings</h1>
              <p className="page-sub">Everything for your schedule, appearance, backup and app updates.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={CalendarDays} title="Schedule" subtitle="Control how your lecture plan is resolved day by day." />
        <div className="mt-5 space-y-4">
          <Row title="Schedule start date" desc="Day 1 se poora lecture plan recalculate hoga. Lectures/topics unchanged rahenge.">
            <div className="flex items-center gap-2">
              <input type="date" value={settings.startDate || ''} onChange={e => setStartDate(e.target.value)} className="field w-auto" />
              <button className="btn btn-secondary px-3 py-2 text-xs" onClick={() => setStartDate('2026-09-11')}><RotateCcw size={13}/> Reset</button>
            </div>
          </Row>
          <Row title="Preview date" desc="Testing ke liye kisi bhi date par backlog behaviour simulate karo.">
            <div className="flex items-center gap-2">
              <input type="date" value={settings.previewDate || ''} onChange={e => setPreviewDate(e.target.value)} className="field w-auto" />
              {settings.previewDate && <button className="btn btn-ghost px-2 py-2 text-xs" onClick={() => setPreviewDate('')}>Clear</button>}
            </div>
          </Row>
          <ToggleRow title="Auto-shift / cascade" desc="Missed lectures ko next available study day par automatically shift karo." on={settings.autoShift} onClick={() => setAutoShift(!settings.autoShift)} />
          <ToggleRow title="Sundays are off days" desc="Calendar me Sundays automatically free rakho." on={sundayOn} onClick={() => setSundaysOff(!sundayOn)} />
        </div>
      </section>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={CalendarDays} title="Holidays" subtitle="Per-holiday control, plus one-tap bulk action." />
        <div className="flex justify-end mt-4">
          <button onClick={() => setAllCommonHolidays(!allHolidaysOff)} className="btn btn-secondary px-3 py-2 text-xs">
            {allHolidaysOff ? 'Make all study days' : 'Make all off days'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
          {commonHolidays.map(h => {
            const off = settings.offDays.includes(h.date);
            return <div key={h.date} className={`flex items-center justify-between p-3 rounded-xl border ${off ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' : 'bg-gray-50 dark:bg-white/[.03] border-gray-200 dark:border-white/10'}`}>
              <div><div className="text-xs font-semibold">{formatDateShort(h.date)}</div><div className="text-[10px] text-gray-400">{off ? 'Off day' : 'Study day'}</div></div>
              <MiniSwitch on={off} onClick={() => toggleOffDay(h.date)} />
            </div>;
          })}
        </div>
      </section>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={Sparkles} title="Phase planning" subtitle="Auto chapters by default; manual date windows when you need them." />
        <div className="flex justify-end mt-4">
          <button onClick={resetPhaseRanges} className="btn btn-secondary px-3 py-2 text-xs"><RefreshCw size={13}/> Reset to Auto</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {['Phase 1','Phase 2','Phase 3','Phase 4'].map(p => {
            const cur = settings.phaseRanges?.[p] || {start:'',end:''};
            return <div key={p} className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[.03]">
              <div className="text-xs font-bold mb-2">{p}</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input type="date" value={cur.start} onChange={e => updatePhase(p,'start',e.target.value,settings.phaseRanges,setPhaseRanges)} className="field text-xs" />
                <span className="text-[10px] text-gray-400">to</span>
                <input type="date" value={cur.end} onChange={e => updatePhase(p,'end',e.target.value,settings.phaseRanges,setPhaseRanges)} className="field text-xs" />
              </div>
            </div>;
          })}
        </div>
        <p className="text-[10.5px] text-gray-400 mt-3">Daily caps remain Phase 1 = 2, Phase 2 = 3, Phase 3 = 4, Phase 4 = 5.</p>
      </section>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={Palette} title="Appearance" subtitle="Quickly control the app surface without cluttering the sidebar." />
        <div className="mt-4">
          <ToggleRow title={theme === 'dark' ? 'Dark mode' : 'Light mode'} desc="Theme is saved locally on this device." on={theme === 'dark'} onClick={toggleTheme} />
        </div>
      </section>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={RefreshCw} title="Updates" subtitle="Real release checks against the JEE Planner GitHub Releases feed." />
        <div className="mt-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/[.06] p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Github size={16}/><span className="text-sm font-bold">JEE Planner {CURRENT_VERSION}</span>{updateAvailable && <span className="pill bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Update available</span>}</div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Source: GitHub Releases · no third-party updater.</p>
              {latest && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">Latest release: <b>{latest.tag_name}</b>{latest.published_at ? ` · ${new Date(latest.published_at).toLocaleDateString()}` : ''}</p>}
              {lastChecked && <p className="text-[10px] text-gray-400 mt-1">Last checked: {new Date(lastChecked).toLocaleString()}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-secondary px-3 py-2 text-xs" disabled={checking} onClick={handleCheck}>{checking ? <RefreshCw size={13} className="animate-spin"/> : <RefreshCw size={13}/>} Check now</button>
              <a className="btn btn-secondary px-3 py-2 text-xs" href={latest?.html_url || RELEASES_URL} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Releases</a>
              {latest?.assets?.find(a => a.name?.toLowerCase().endsWith('.apk')) && <a className="btn btn-primary px-3 py-2 text-xs" href={latest.assets.find(a => a.name.toLowerCase().endsWith('.apk')).browser_download_url}><Download size={13}/> Download APK</a>}
            </div>
          </div>
          {checkError && <div className="mt-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-300"><AlertCircle size={14}/>{checkError}</div>}
          {updateAvailable && <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14}/> A newer GitHub release is available. Android APK download yahin se start kar sakte ho.</div>}
        </div>
        <div className="mt-4"><ToggleRow title="Automatic update checks" desc="Background/PWA update checks ko yahin se ON/OFF karo. OFF karne par app periodic GitHub/SW checks nahi karega." on={autoUpdates} onClick={toggleAutoUpdates} /></div>
      </section>

      <section className="card-surface p-5 md:p-6">
        <SectionTitle icon={MonitorCog} title="Data & backup" subtitle="Keep a portable copy of progress and schedule settings." />
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={handleExport} className="btn btn-primary px-3.5 py-2.5 text-xs"><Download size={14}/> Download backup</button>
          <label className="btn btn-secondary px-3.5 py-2.5 text-xs cursor-pointer"><Upload size={14}/> Restore backup<input type="file" accept="application/json,.json" className="hidden" onChange={handleImport}/></label>
          {backupMsg && <span className="text-xs text-emerald-600 dark:text-emerald-400">{backupMsg}</span>}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({icon: Icon,title,subtitle}) { return <div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 grid place-items-center"><Icon size={17}/></div><div><h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2><p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p></div></div>; }
function Row({title,desc,children}) { return <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-0"><div><div className="text-xs font-semibold">{title}</div><p className="text-[10.5px] text-gray-400 mt-0.5 max-w-2xl">{desc}</p></div>{children}</div>; }
function ToggleRow({title,desc,on,onClick}) { return <div className="flex items-center justify-between gap-4 py-3"><div><div className="text-xs font-semibold">{title}</div><p className="text-[10.5px] text-gray-400 mt-0.5">{desc}</p></div><MiniSwitch on={on} onClick={onClick}/></div>; }
function MiniSwitch({on,onClick}) { return <button type="button" aria-pressed={on} onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}/></button>; }
function updatePhase(phase,key,value,current,setter) { const next={...(current||{})}; const row={...(next[phase]||{})}; row[key]=value; if(!row.start&&!row.end) delete next[phase]; else next[phase]=row; setter(Object.keys(next).length?next:null); }
