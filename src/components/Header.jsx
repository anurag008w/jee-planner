import useStore from '../store/useStore';
import { Search, Menu, Moon, Sun, ArrowDownUp } from 'lucide-react';
import { getToday, formatDateFull } from '../utils/helpers';
import ProgressBar from './ProgressBar';

export default function Header() {
  const { theme, toggleTheme, setSearchOpen, setSidebarOpen, sidebarOpen, currentPage, lectures, completions, sync } = useStore();
  const today = getToday();
  const totalCompleted = Object.values(completions).filter(v => v === 'completed').length;
  const totalLectures = lectures.length;
  const overallPercent = Math.round((totalCompleted / Math.max(1, totalLectures)) * 100);
  const pageTitles = { today:"Today's Plan", calendar:'Calendar', schedule:'Master Schedule', subjects:'Subjects', arena:'Study Arena', chemistry:'Study Arena', chapters:'Chapter Progress', stats:'Statistics', settings:'Settings' };
  const handleMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) window.dispatchEvent(new Event('jee-planner-toggle-desktop-sidebar'));
    else setSidebarOpen(!sidebarOpen);
  };
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1a1c2b]/80 backdrop-blur-xl border-b border-[var(--color-border)] dark:border-[#2c2f40] transition-colors">
      <div className="px-4 md:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0"><button onClick={handleMenu} aria-label="Toggle navigation sidebar" title="Toggle sidebar" className="btn-icon tap-target -ml-1 flex-shrink-0"><Menu size={20}/></button><div className="min-w-0"><h2 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{pageTitles[currentPage]||'JEE Planner'}</h2><p className="text-[11.5px] text-gray-500 dark:text-gray-400 hidden sm:block">{formatDateFull(today)}</p></div></div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10"><div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden"><ProgressBar value={overallPercent} size="sm" className="h-full w-full" gradient="bg-gradient-to-r from-indigo-500 to-purple-500"/></div><span className="text-[11.5px] font-semibold text-gray-700 dark:text-gray-300">{totalCompleted}/{totalLectures}</span></div>
          <button onClick={()=>useStore.getState().setSyncOpen(true)} aria-label="GitHub sync (manual pull/push)" title="GitHub Sync" className="btn-icon tap-target relative"><ArrowDownUp size={18}/>{sync?.token?<span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"/>:null}</button>
          <button onClick={()=>setSearchOpen(true)} aria-label="Search lectures" className="btn-icon tap-target"><Search size={18}/></button>
          <button onClick={toggleTheme} aria-label={theme==='light'?'Switch to dark mode':'Switch to light mode'} title="Toggle theme" className="btn-icon tap-target">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button>
        </div>
      </div>
    </header>
  );
}
