import { useEffect } from 'react';
import useStore from './store/useStore';
import { apiBase } from './config';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import SearchModal from './components/SearchModal';
import LectureModal from './components/LectureModal';
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
// Server-side (file-based) persistence:
//  - on boot: pull data from /home/anurag/jee-planner/data/planner-data.json
//  - on every change: debounced POST /api/save so the disk file stays in sync
// localStorage (zustand persist) stays as the instant layer; the file is the safe copy.
// ---------------------------------------------------------------------------
let saveTimer = null;

function pushToServer(state) {
  const data = {
    app: 'jee-planner',
    savedAt: new Date().toISOString(),
    completions: state.completions,
    settings: state.settings,
    theme: state.theme,
  };
  fetch(apiBase() + '/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => { /* offline / file:// — localStorage still holds data */ });
}

export default function App() {
  const { theme, searchOpen, selectedLecture, sidebarOpen, currentPage } = useStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    // Boot: pull the disk copy (master) and merge with local storage.
    fetch(apiBase() + '/api/load')
      .then((r) => r.json())
      .then((remote) => {
        if (!mounted || !remote || remote.app !== 'jee-planner') return;
        const s = useStore.getState();
        const remoteComps = remote.completions && typeof remote.completions === 'object' ? remote.completions : {};
        const hasRemote = Object.keys(remoteComps).length > 0 || (Array.isArray(remote.settings?.offDays) && remote.settings.offDays.length > 0);
        // completions: union (kabhi progress mat kaho)
        const mergedCompletions = {};
        new Set([...Object.keys(remoteComps), ...Object.keys(s.completions)]).forEach((id) => {
          const a = remoteComps[id] === 'completed';
          const b = s.completions[id] === 'completed';
          mergedCompletions[id] = a || b ? 'completed' : 'not_started';
        });
        useStore.getState().importBackup({
          app: 'jee-planner',
          completions: mergedCompletions,
          settings: {
            offDays: hasRemote && Array.isArray(remote.settings?.offDays) ? remote.settings.offDays : s.settings.offDays,
            previewDate: hasRemote ? (remote.settings?.previewDate ?? s.settings.previewDate) : s.settings.previewDate,
            autoShift: hasRemote ? (remote.settings?.autoShift !== false) : s.settings.autoShift,
            phaseRanges: hasRemote && remote.settings?.phaseRanges ? remote.settings.phaseRanges : s.settings.phaseRanges,
            chapterPhases: hasRemote && remote.settings?.chapterPhases ? remote.settings.chapterPhases : s.settings.chapterPhases,
          },
          theme: hasRemote && remote.theme ? remote.theme : s.theme,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) pushToServer(useStore.getState());
      });
    return () => { mounted = false; };
  }, []);

  // Debounced sync on every store change.
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => pushToServer(state), 600);
    });
    return () => { unsub(); clearTimeout(saveTimer); };
  }, []);

  useEffect(() => {
    // Ensure the resolved schedule matches the hydrated completions/settings
    useStore.getState().recompute();
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
    </div>
  );
}