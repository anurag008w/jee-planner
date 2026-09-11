// src/lib/githubSync.js — MANUAL GitHub sync (koi auto-sync nahi, sab user ke haath me).
// Mobile app ho ya website — dono isi repo file se pull/push karte hain.
//
// TOKEN SAFETY (important):
// - Token sirf device ke localStorage me rehta hai (mobile ka mobile me, laptop ka laptop me).
// - GitHub pe jaane wale payload me token KABHI nahi hota — sirf completions/settings/theme.
// - Pull aane par bhi local token/config overwrite nahi hota.

const API = 'https://api.github.com';

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function b64encodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64decodeUnicode(b64) {
  return decodeURIComponent(escape(atob(String(b64).replace(/\n/g, ''))));
}

function cfgCheck(cfg) {
  if (!cfg.token) throw new Error('GitHub token nahi dala — pehle Sync settings me token save karo.');
  if (!cfg.owner || !cfg.repo) throw new Error('Repo owner/name missing hai.');
}

// ---- READ: remote file lao (sha ke saath — wahi "lease" hai) ----
export async function fetchRemote(cfg) {
  cfgCheck(cfg);
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`;
  let r;
  try {
    r = await fetch(url, { headers: headers(cfg.token) });
  } catch {
    throw new Error('Network error — internet check karo.');
  }
  if (r.status === 404) return { sha: null, data: null }; // file abhi bani hi nahi
  if (r.status === 401) throw new Error('Token galat/expired hai (401). Naya token banao.');
  if (r.status === 403) throw new Error('Permission nahi (403) — token me repo access do.');
  if (!r.ok) throw new Error(`GitHub pull failed (${r.status}).`);
  const j = await r.json();
  return { sha: j.sha, data: JSON.parse(b64decodeUnicode(j.content || '')) };
}

// ---- WRITE: payload bhejo. sha diya → safe/lease (purana sha = 409). sha null → nayi file. ----
export async function pushRemote(cfg, payload, sha) {
  cfgCheck(cfg);
  const url = `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  const body = {
    message: `sync: planner data ${new Date().toISOString()}`,
    content: b64encodeUnicode(JSON.stringify(payload, null, 2)),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;
  let r;
  try {
    r = await fetch(url, { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(body) });
  } catch {
    throw new Error('Network error — internet check karo.');
  }
  if (r.status === 409 || r.status === 422) {
    throw new Error('CONFLICT — GitHub pe naya data aa gaya hai. Pehle Pull karo (ya Force Push).');
  }
  if (r.status === 401) throw new Error('Token galat/expired hai (401).');
  if (r.status === 403) throw new Error('Permission nahi (403) — token me repo access do.');
  if (!r.ok) throw new Error(`GitHub push failed (${r.status}).`);
  const j = await r.json();
  return { fileSha: j.content?.sha || '', commitSha: j.commit?.sha || '' };
}

// ---- PAYLOAD: sirf planner data. Token yahan kabhi nahi aata. ----
export function buildPayload(state) {
  return {
    app: 'jee-planner',
    savedAt: new Date().toISOString(),
    completions: state.completions,
    settings: state.settings,
    theme: state.theme,
  };
}

// Dirty-check ke liye stable snapshot (token-free).
export function snapshotOf(payload) {
  return JSON.stringify({
    completions: payload.completions || {},
    settings: payload.settings || {},
    theme: payload.theme || 'light',
  });
}

// ---- MERGE (normal Pull): progress kabhi mat khona ----
export function mergePull(localPayload, remoteData, localIsNewer) {
  const completions = { ...(remoteData.completions || {}) };
  for (const [id, v] of Object.entries(localPayload.completions || {})) {
    if (v === 'completed' || !(id in completions)) completions[id] = v;
  }
  return {
    app: 'jee-planner',
    completions,
    // settings/theme: jo side nayi hai wo jeetti hai (tie → remote, kyunki pull manga hai)
    settings: localIsNewer ? localPayload.settings : (remoteData.settings || localPayload.settings),
    theme: localIsNewer ? localPayload.theme : (remoteData.theme || localPayload.theme),
  };
}
