import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { Home, Calendar, BookOpen, GraduationCap, BarChart3, List, Settings2, ChevronRight, Sparkles } from 'lucide-react';

const navItems = [
  { id: 'today', label: "Today's Plan", icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'schedule', label: 'Master Schedule', icon: List },
  { id: 'subjects', label: 'Subjects', icon: GraduationCap },
  { id: 'arena', label: 'Study Arena', icon: Sparkles },
  { id: 'chapters', label: 'Chapter Progress', icon: BookOpen },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export default function Sidebar({ mobile }) {
  const { currentPage, setPage, setSidebarOpen } = useStore();
  const [desktopVisible, setDesktopVisible] = useState(true);

  useEffect(() => {
    const toggle = () => setDesktopVisible(v => !v);
    window.addEventListener('jee-planner-toggle-desktop-sidebar', toggle);
    return () => window.removeEventListener('jee-planner-toggle-desktop-sidebar', toggle);
  }, []);

  return (
    <aside className={`${mobile ? 'flex h-full' : desktopVisible ? 'hidden lg:flex' : 'hidden'} fixed top-0 left-0 h-screen w-[var(--sidebar-width)] flex-col bg-white dark:bg-[#1a1c2b] border-r border-[var(--color-border)] dark:border-[#2c2f40] z-50 transition-all duration-200`}>
      <div className="p-5 border-b border-[var(--color-border)] dark:border-[#2c2f40]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25">JEE</div>
          <div><h1 className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight">Lecture Planner</h1><p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">JEE 2027</p></div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Pages">
        {navItems.map(item => { const Icon=item.icon; const active=currentPage===item.id || (item.id==='arena' && currentPage==='chemistry'); return (
          <button key={item.id} onClick={()=>{setPage(item.id);if(mobile)setSidebarOpen(false)}} aria-current={active?'page':undefined} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 group relative ${active?'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
            {active&&<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r-full"/>}<Icon size={18} className={active?'text-indigo-600 dark:text-indigo-400':'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}/><span className="flex-1 text-left">{item.label}</span>{active&&<ChevronRight size={14} className="text-indigo-400"/>}
          </button>
        );})}
      </nav>
      <div className="p-3 border-t border-[var(--color-border)] dark:border-[#2c2f40]"><p className="px-3.5 py-2 text-[10.5px] text-gray-400 dark:text-gray-600">Start: 11 Sep 2026 • End: 25 Dec 2026</p></div>
    </aside>
  );
}
