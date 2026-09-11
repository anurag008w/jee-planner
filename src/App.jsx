import { useEffect, useRef } from 'react';
import useStore from './store/useStore';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import SearchModal from './components/SearchModal';
import LectureModal from './components/LectureModal';
import SyncModal from './components/SyncModal';
import TodayPage from './pages/TodayPage';
import CalendarPage from './pages/CalendarPage';
import MasterSchedulePage from './pages/MasterSchedulePage';
import SubjectsPage from './pages/SubjectsPage';
import ChemistryPage from './pages/ChemistryPage';
import ChapterProgressPage from './pages/ChapterProgressPage';
import StatisticsPage from './pages/StatisticsPage';

const pages = {
  today: TodayPage,
  calendar: CalendarPage,
  schedule: MasterSchedulePage,
  subjects: SubjectsPage,
  chemistry: ChemistryPage,
  chapters: ChapterProgressPage,
  stats: StatisticsPage,
};

// ---------------------------------------------------------------------------
// Sync policy: MANUAL ONLY (koi auto-sync nahi).
//  - localStorage (zustand persist) = instant layer, har device pe alag.
//  - GitHub repo (jee-planner-data) = shared truth; user khud Pull/Push karta hai.
//  - Token device ke localStorage me hi rehta hai, GitHub pe kabhi nahi jaata.
// ---------------------------------------------------------------------------

export default function App() {
  const { theme, searchOpen, selectedLecture, sidebarOpen, currentPage, syncOpen } = useStore();
  const promptedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // Ensure the resolved schedule matches the hydrated completions/settings
    useStore.getState().recompute();
  }, []);

  useEffect(() => {
    // App kholte hi (har baar): agar GitHub sync configured hai to Sync kholo,
    // taaki user Pull/Push kar sake. Koi auto pull/push nahi — sirf prompt.
    if (promptedRef.current) return;
    promptedRef.current = true;
    const s = useStore.getState();
    if (s.sync?.token) {
      const t = setTimeout(() => useStore.getState().setSyncOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const PageComponent = pages[currentPage] || TodayPage;

  return (
    <div className={`no-hscroll min-h-screen bg-[var(--color-bg)] dark:bg-bg-dark transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => useStore.getState().setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full w-[280px] bg-white dark:bg-surface-dark shadow-2xl animate-slideIn z-50">
              <Sidebar mobile />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:ml-[var(--sidebar-width)]">
          <Header />

          <main className="flex-1 px-4 pb-28 md:px-6 lg:px-8 xl:px-10 pt-4 max-w-[1600px] w-full mx-auto">
            <PageComponent />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Search Modal */}
      {searchOpen && <SearchModal />}

      {/* Lecture Detail Modal */}
      {selectedLecture && <LectureModal />}

      {/* GitHub Sync (manual — har tab se, har launch pe prompt) */}
      {syncOpen && <SyncModal />}
    </div>
  );
}