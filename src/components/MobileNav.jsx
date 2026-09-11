import useStore from '../store/useStore';
import { Home, Calendar, List, GraduationCap, BarChart3 } from 'lucide-react';

const items = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'schedule', label: 'Schedule', icon: List },
  { id: 'subjects', label: 'Subjects', icon: GraduationCap },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export default function MobileNav() {
  const { currentPage, setPage } = useStore();

  return (
    <nav aria-label="Primary" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a1c2b]/95 backdrop-blur-xl border-t border-[var(--color-border)] dark:border-[#2c2f40] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-around px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)] h-[calc(4rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {active && <div className="w-5 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mb-0.5" />}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}