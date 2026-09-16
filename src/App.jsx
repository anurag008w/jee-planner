import { useEffect, useRef, useState } from 'react';
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
import SettingsPage from './pages/SettingsPage';

const pages = {
  today: TodayPage,
  calendar: CalendarPage,
  schedule: MasterSchedulePage,
  subjects: SubjectsPage,
  chemistry: ChemistryPage,
  chapters: ChapterProgressPage,
  stats: StatisticsPage,
  settings: SettingsPage,
};

export default function App() {
  const { theme, searchOpen, selectedLecture, sidebarOpen, currentPage, syncOpen } = useStore();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const promptedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    useStore.getState().recompute();
  }, []);

  useEffect(() => {
    const toggle = () => setDesktopSidebarOpen(v => !v);
    window.addEventListener('jee-planner-toggle-desktop-sidebar', toggle);
    return () => window.removeEventListener('jee-planner-toggle-desktop-sidebar', toggle);
  }, []);

  useEffect(() => {
    if (promptedRef.current) return;
    promptedRef.current = true;
    const s = useStore.getState();
    if (s.sync?.token) {
      const t = setTimeout(() => useStore.getState().setSyncOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const PageComponent = pages[currentPage] || TodayPage;
  const desktopOffset = desktopSidebarOpen ? 'lg:ml-[var(--sidebar-width)]' : 'lg:ml-0';

  return (
    <div className={`no-hscroll min-h-screen bg-[var(--color-bg)] dark:bg-bg-dark transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => useStore.getState().setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full w-[280px] bg-white dark:bg-surface-dark shadow-2xl animate-slideIn z-50">
              <Sidebar mobile />
            </div>
          </div>
        )}

        <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[margin] duration-200 ${desktopOffset}`}>
          <Header />
          <main className="flex-1 px-4 pb-28 md:px-6 lg:px-8 xl:px-10 pt-4 max-w-[1600px] w-full mx-auto">
            <PageComponent />
          </main>
        </div>
      </div>

      <MobileNav />
      {searchOpen && <SearchModal />}
      {selectedLecture && <LectureModal />}
      {syncOpen && <SyncModal />}
    </div>
  );
}
