import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd MMM'); } catch { return dateStr; }
};

export const formatDateFull = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'EEEE, dd MMMM yyyy'); } catch { return dateStr; }
};

export const getToday = () => new Date().toISOString().split('T')[0];

export const daysUntil = (dateStr) => differenceInDays(parseISO(dateStr), new Date());

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

export const getPhaseColor = (phase) => {
  const colors = {
    'Phase 1': { bg: 'bg-indigo-100', text: 'text-indigo-700', dark: 'dark:bg-indigo-900/30 dark:text-indigo-300', hex: '#6366f1' },
    'Phase 2': { bg: 'bg-violet-100', text: 'text-violet-700', dark: 'dark:bg-violet-900/30 dark:text-violet-300', hex: '#8b5cf6' },
    'Phase 3': { bg: 'bg-purple-100', text: 'text-purple-700', dark: 'dark:bg-purple-900/30 dark:text-purple-300', hex: '#a855f7' },
    'Phase 4': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', dark: 'dark:bg-fuchsia-900/30 dark:text-fuchsia-300', hex: '#d946ef' },
  };
  return colors[phase] || colors['Phase 1'];
};

export const getSubjectColor = (subject) => {
  const colors = {
    'Physics': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dark: 'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800', hex: '#3b82f6' },
    'Mathematics': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dark: 'dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800', hex: '#f59e0b' },
    'Chemistry': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dark: 'dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800', hex: '#10b981' },
  };
  return colors[subject] || colors['Chemistry'];
};

export const getBranchColor = (branch) => {
  const colors = {
    'Physical Chemistry': { bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', dark: 'dark:bg-cyan-900/20 dark:text-cyan-300', hex: '#06b6d4' },
    'Organic Chemistry': { bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', dark: 'dark:bg-violet-900/20 dark:text-violet-300', hex: '#8b5cf6' },
    'Inorganic Chemistry': { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700', dark: 'dark:bg-pink-900/20 dark:text-pink-300', hex: '#ec4899' },
  };
  return colors[branch] || { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700', dark: 'dark:bg-gray-800 dark:text-gray-300', hex: '#6b7280' };
};

export const getCalendarDays = (year, month) => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start);
  return { days, startDay };
};

export { format, parseISO };