import { useState } from 'react';
import useStore from '../store/useStore';
import {
  fetchRemote, pushRemote, buildPayload, snapshotOf, mergePull,
} from '../lib/githubSync';
import {
  X, Download, Upload, AlertTriangle, KeyRound, Check, Loader2, ShieldCheck,
} from 'lucide-react';

function shortSha(sha) {
  return sha ? sha.slice(0, 7) : '—';
}

function fmtTime(iso) {
  if (!iso) return 'kabhi nahi';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function SyncModal() {
  const {
    sync, setSyncOpen, setSyncConfig, markSynced, importBackup,
    completions, settings, theme, extraLectureCounts,
  } = useStore();

  const [token, setToken] = useState(sync.token);
  const [owner, setOwner] = useState(sync.owner);
  const [repo, setRepo] = useState(sync.repo);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const localPayload = buildPayload({ completions, settings, theme, extraLectureCounts });
  const dirty = sync.lastSnapshot !== '' && snapshotOf(localPayload) !== sync.lastSnapshot;

  const saveSettings = () => {
    setSyncConfig({ token: token.trim(), owner: owner.trim(), repo: repo.trim() });
    setMsg({ ok: true, text: 'Settings device me save ho gayi (token sirf yahin rahega).' });
  };

  const cfg = () => ({ ...sync, token: token.trim() || sync.token, owner: owner.trim(), repo: repo.trim() });

  const run = async (kind, fn) => {
    setBusy(kind);
    setMsg(null);
    try {
      const out = await fn();
      setMsg({ ok: true, text: out });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Kuch gadbad ho gayi.' });
    } finally {
      setBusy(null);
    }
  };

  const doPull = () => run('pull', async () => {
    const { sha, data } = await fetchRemote(cfg());
    if (!data) throw new Error('GitHub pe file nahi mili — pehle Push karo.');
    const localIsNewer = !!(sync.lastSyncedAt && data.savedAt && data.savedAt <= sync.lastSyncedAt);
    const merged = mergePull(localPayload, data, localIsNewer);
    importBackup({ ...merged, app: 'jee-planner' });
    const snap = snapshotOf(merged);
    markSynced({ sha, snapshot: snap });
    return `Pull ho gaya (remote ${shortSha(sha)}). Progress merge, settings ${localIsNewer ? 'local wali' : 'nayi wali'} rakhi.`;
  });

  const doPush = () => run('push', async () => {
    const { sha, data } = await fetchRemote(cfg());
    if (data && sync.lastSyncedAt && data.savedAt && data.savedAt > sync.lastSyncedAt
        && snapshotOf({ completions: data.completions, settings: data.settings, theme: data.theme, extraLectureCounts: data.extraLectureCounts }) !== sync.lastSnapshot) {
      throw new Error('GitHub pe naya data hai — pehle Pull karo, phir Push.');
    }
    const res = await pushRemote(cfg(), localPayload, sha);
    markSynced({ sha: res.fileSha, snapshot: snapshotOf(localPayload) });
    return `Push ho gaya (${shortSha(res.fileSha)}).`;
  });

  const doForcePull = () => {
    if (!window.confirm('Force Pull? Tumhara local data MIT jayega, GitHub wala aa jayega. Pakka?')) return;
    run('fpull', async () => {
      const { sha, data } = await fetchRemote(cfg());
      if (!data) throw new Error('GitHub pe file nahi mili.');
      importBackup({ ...data, app: 'jee-planner' });
      markSynced({ sha, snapshot: snapshotOf(data) });
      return `Force Pull ho gaya (remote ${shortSha(sha)}).`;
    });
  };

  const doForcePush = () => {
    if (!window.confirm('Force Push? GitHub ka data MIT jayega, tumhara local chadh jayega. Pakka?')) return;
    run('fpush', async () => {
      const { sha } = await fetchRemote(cfg());
      const res = await pushRemote(cfg(), localPayload, sha);
      markSynced({ sha: res.fileSha, snapshot: snapshotOf(localPayload) });
      return `Force Push ho gaya (${shortSha(res.fileSha)}).`;
    });
  };

  const doLeasePush = () => run('lease', async () => {
    if (!sync.lastRemoteSha) throw new Error('Lease ke liye pehle ek Pull/Push karo (remote sha chahiye).');
    const res = await pushRemote(cfg(), localPayload, sync.lastRemoteSha);
    markSynced({ sha: res.fileSha, snapshot: snapshotOf(localPayload) });
    return `Lease Push ho gaya (${shortSha(res.fileSha)}) — remote badla nahi tha.`;
  });

  const btn = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50';
  const busyAny = busy !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="GitHub Sync">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busyAny && setSyncOpen(false)} />
      <div className="relative w-full sm:max-w-[480px] max-h-[92vh] overflow-y-auto bg-white dark:bg-[#1a1c2b] rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl animate-slideIn">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1c2b]">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">GitHub Sync</h3>
            <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
              Last sync: {fmtTime(sync.lastSyncedAt)} • remote {shortSha(sync.lastRemoteSha)}
              {dirty && <span className="text-amber-600 dark:text-amber-400 font-semibold"> • local changes pending</span>}
            </p>
          </div>
          <button onClick={() => !busyAny && setSyncOpen(false)} className="btn-icon" aria-label="Close sync"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2.5">
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-200">
              <KeyRound size={14} /> GitHub Token <span className="font-medium text-gray-400">(sirf is device me rahega)</span>
            </label>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxx… (classic, repo scope)" className="field" autoComplete="off" />
            <div className="grid grid-cols-2 gap-2">
              <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="field" aria-label="Repo owner" />
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="field" aria-label="Repo name" />
            </div>
            <button onClick={saveSettings} className={`${btn} btn-secondary w-full py-2 text-[12.5px]`}><Check size={14} /> Save on this device</button>
            <p className="text-[10.5px] text-gray-400 dark:text-gray-500 leading-snug">
              Token GitHub → Settings → Developer settings → Personal access tokens (classic, <b>repo</b> scope) se banao.
              Ye token kabhi GitHub pe upload nahi hota — mobile ka mobile me, laptop ka laptop me.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={doPull} disabled={busyAny} className={`${btn} btn-primary py-2.5`}>
              {busy === 'pull' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Pull
            </button>
            <button onClick={doPush} disabled={busyAny} className={`${btn} btn-primary py-2.5`}>
              {busy === 'push' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Push
            </button>
          </div>

          <div className="rounded-xl border border-red-200 dark:border-red-500/25 p-3 space-y-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-red-600 dark:text-red-400"><AlertTriangle size={13} /> Danger zone — dusri side ka data mit jayega</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={doForcePull} disabled={busyAny} className={`${btn} py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20`}>
                {busy === 'fpull' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Force Pull
              </button>
              <button onClick={doForcePush} disabled={busyAny} className={`${btn} py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20`}>
                {busy === 'fpush' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Force Push
              </button>
            </div>
            <button onClick={doLeasePush} disabled={busyAny} className={`${btn} w-full py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20`}>
              {busy === 'lease' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Push with lease <span className="font-normal opacity-70">(remote badla to ruk jayega)</span>
            </button>
          </div>

          {msg && (
            <div className={`px-3 py-2.5 rounded-xl text-[12.5px] font-medium leading-snug ${msg.ok
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25'
              : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/25'}`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
