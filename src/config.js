// src/config.js — JEE Planner app config (bundled real-app mode)
//
// APK ab PACKAGED assets se chalta hai (native feel, offline-safe).
// Data sync laptop server pe hota hai is API_BASE ke through.
//
// Server URL override karna ho toh phone me localStorage me save karo:
//   localStorage.jeeServerUrl = 'http://192.168.1.5:1601'
//
// Web (localhost:1601) pe relative path use hota hai — same origin.

const DEFAULT_SERVER = 'http://10.26.255.106:1601';

export function isNativeApp() {
  return typeof window !== 'undefined' &&
    (window.Capacitor !== undefined || /JEE Planner/i.test(navigator.userAgent));
}

export function apiBase() {
  if (!isNativeApp()) return ''; // browser → same origin
  try {
    const saved = localStorage.getItem('jeeServerUrl');
    if (saved) return saved.replace(/\/+$/, '');
  } catch (_) {}
  return DEFAULT_SERVER;
}