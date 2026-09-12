import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dataset from '../data/dataset.json';
import { computeResolvedSchedule, getSundaysBetween, COMMON_HOLIDAYS } from './scheduleEngine';
import { getToday } from '../utils/helpers';

// Default off days = every Sunday inside the schedule span
//                 + the 9 toggle-based common holidays (14 Sep, 2 Oct, 20 Oct, 6/7/9/11/16 Nov, 25 Dec)
const scheduleDates = [...new Set(dataset.lectures.map(l => l.newStudyDate))].sort();
const defaultSundayOffs = getSundaysBetween(scheduleDates[0], scheduleDates[scheduleDates.length - 1]);
const commonHolidayDates = COMMON_HOLIDAYS.map(h => h.date).filter(d => d >= scheduleDates[0] && d <= scheduleDates[scheduleDates.length - 1]);
const defaultOffDays = [...new Set([...defaultSundayOffs, ...commonHolidayDates])].sort();

const computeSchedule = (completions, settings) =>
  computeResolvedSchedule({
    lectures: dataset.lectures,
    completions,
    today: settings.previewDate || getToday(),
    offDays: settings.offDays,
    autoShift: settings.autoShift,
    phaseRanges: settings.phaseRanges,
    chapterPhases: settings.chapterPhases,
  });

const useStore = create(
  persist(
    (set, get) => {
      const initialSettings = {
        offDays: defaultOffDays,
        previewDate: '',
        autoShift: true,
        phaseRanges: null,
        chapterPhases: {},
      };
      const initialSchedule = computeSchedule({}, initialSettings);

      return {
        lectures: dataset.lectures,
        chapterProgress: dataset.chapterProgress,
        dashboard: dataset.dashboard,
        commonHolidays: COMMON_HOLIDAYS,

        currentPage: 'today',
        theme: 'light',
        searchOpen: false,
        selectedDate: null,
        selectedLecture: null,
        sidebarOpen: false,
        syncOpen: false,

        // ----- GitHub manual sync -----
        // token device ke localStorage me hi rehta hai (mobile ka mobile me,
        // laptop ka laptop me) — GitHub pe push hone wale payload me kabhi nahi jaata.
        sync: {
          token: '',
          owner: 'anurag008w',
          repo: 'jee-planner-data',
          branch: 'main',
          path: 'planner-data.json',
          lastRemoteSha: '',
          lastSyncedAt: '',
          lastSnapshot: '',
        },
        setSyncOpen: (open) => set({ syncOpen: open }),
        setSyncConfig: (patch) => set((s) => ({ sync: { ...s.sync, ...patch } })),
        markSynced: ({ sha, snapshot }) => set((s) => ({
          sync: {
            ...s.sync,
            lastRemoteSha: sha || s.sync.lastRemoteSha,
            lastSyncedAt: new Date().toISOString(),
            lastSnapshot: snapshot || s.sync.lastSnapshot,
          },
        })),

        filters: {
          date: '', phase: '', subject: '', chemistryBranch: '',
          chapter: '', faculty: '', status: '',
        },

        completions: {},
        settings: initialSettings,
        schedule: { ...initialSchedule, today: getToday() },

        // ----- navigation / ui -----
        setPage: (page) => set({ currentPage: page, sidebarOpen: false }),
        toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
        setSearchOpen: (open) => set({ searchOpen: open }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setSelectedLecture: (lecture) => set({ selectedLecture: lecture }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
        resetFilters: () => set({
          filters: { date: '', phase: '', subject: '', chemistryBranch: '', chapter: '', faculty: '', status: '' }
        }),

        // ----- schedule engine -----
        // freezeToday = true sirf completion actions se aata hai → aaj ke plan ko
        // FREEZE rakho (complete karne par naya lecture kabhi nahi aata, list ghatti
        // hai). Settings/offday/phase changes se fresh recompute hota hai.
        recompute: (opts = {}) => {
          const s = get();
          const today = s.settings.previewDate || getToday();
          const schedule = computeSchedule(s.completions, s.settings);
          if (opts.freezeToday) {
            const prevPlan = (s.schedule && s.schedule.today === today && s.schedule.dayMap && s.schedule.dayMap[today]) || [];
            if (prevPlan.length > 0) {
              const frozen = prevPlan.filter(l => s.completions[l.id] !== 'completed');
              schedule.dayMap[today] = frozen;
              frozen.forEach(l => {
                schedule.resolved[l.id] = { resolvedDate: today, isBacklog: l.newStudyDate < today };
              });
            }
          }
          set({ schedule: { ...schedule, today } });
        },

        // ----- completion actions -----
        markComplete: (id) => {
          set((s) => ({ completions: { ...s.completions, [id]: 'completed' } }));
          get().recompute({ freezeToday: true });
        },
        markIncomplete: (id) => {
          set((s) => ({ completions: { ...s.completions, [id]: 'not_started' } }));
          get().recompute({ freezeToday: true });
        },
        toggleComplete: (id) => {
          set((s) => ({
            completions: { ...s.completions, [id]: s.completions[id] === 'completed' ? 'not_started' : 'completed' }
          }));
          get().recompute({ freezeToday: true });
        },
        completeMany: (ids) => {
          set((s) => {
            const completions = { ...s.completions };
            ids.forEach((id) => { completions[id] = 'completed'; });
            return { completions };
          });
          get().recompute({ freezeToday: true });
        },

        // ----- settings -----
        toggleOffDay: (date) => {
          set((s) => {
            const has = s.settings.offDays.includes(date);
            const offDays = has
              ? s.settings.offDays.filter((d) => d !== date)
              : [...s.settings.offDays, date].sort();
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setSundaysOff: (on) => {
          set((s) => {
            const offDays = on
              ? [...new Set([...s.settings.offDays, ...defaultOffDays])].sort()
              : s.settings.offDays.filter((d) => new Date(d).getDay() !== 0);
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setAllCommonHolidays: (on) => {
          set((s) => {
            const offDays = on
              ? [...new Set([...s.settings.offDays, ...commonHolidayDates])].sort()
              : s.settings.offDays.filter((d) => !commonHolidayDates.includes(d));
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setPreviewDate: (date) => {
          set((s) => ({ settings: { ...s.settings, previewDate: date } }));
          get().recompute();
        },
        setAutoShift: (value) => {
          set((s) => ({ settings: { ...s.settings, autoShift: value } }));
          get().recompute();
        },
        setPhaseRanges: (ranges) => {
          // null → auto (chapter/data phase decides); object → manual date windows
          set((s) => ({ settings: { ...s.settings, phaseRanges: ranges } }));
          get().recompute();
        },
        resetPhaseRanges: () => {
          set((s) => ({ settings: { ...s.settings, phaseRanges: null } }));
          get().recompute();
        },
        setChapterPhase: (chapter, phase) => {
          set((s) => {
            const cp = { ...(s.settings.chapterPhases || {}) };
            if (phase === '' || phase === 'auto') delete cp[chapter];
            else cp[chapter] = phase;
            return { settings: { ...s.settings, chapterPhases: cp } };
          });
          get().recompute();
        },
        resetChapterPhases: () => {
          set((s) => ({ settings: { ...s.settings, chapterPhases: {} } }));
          get().recompute();
        },

        isCompleted: (id) => get().completions[id] === 'completed',
        getCompletionCount: () => Object.values(get().completions).filter((v) => v === 'completed').length,
        getDateLectures: (date) => get().lectures.filter((l) => l.newStudyDate === date),

        // ----- backup / restore -----
        exportBackup: () => {
          const s = get();
          return {
            app: 'jee-planner',
            exportedAt: new Date().toISOString(),
            completions: s.completions,
            settings: s.settings,
            theme: s.theme,
          };
        },
        importBackup: (data) => {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (!parsed || parsed.app !== 'jee-planner') {
            throw new Error('Invalid backup — yeh JEE Planner ki backup file nahi hai');
          }
          const current = get();
          const offDays = (parsed.settings && Array.isArray(parsed.settings.offDays))
            ? parsed.settings.offDays
            : (current.settings.offDays || []);
          set({
            completions: (parsed.completions && typeof parsed.completions === 'object') ? parsed.completions : {},
            theme: parsed.theme === 'dark' ? 'dark' : 'light',
            settings: {
              offDays: [...new Set(offDays)].sort(),
              previewDate: parsed.settings?.previewDate || '',
              autoShift: parsed.settings?.autoShift !== false,
              phaseRanges: parsed.settings?.phaseRanges || null,
              chapterPhases: parsed.settings?.chapterPhases || {},
            },
          });
          get().recompute();
        },
      };
    },
    {
      name: 'jee-planner-storage',
      partialize: (state) => ({
        completions: state.completions,
        theme: state.theme,
        currentPage: state.currentPage,
        sync: state.sync,
        settings: {
          offDays: state.settings.offDays,
          previewDate: state.settings.previewDate,
          autoShift: state.settings.autoShift,
          phaseRanges: state.settings.phaseRanges,
          chapterPhases: state.settings.chapterPhases,
        },
      }),
      version: 4,
      migrate: (persisted) => {
        const base = persisted || {};
        const prevOffDays = base.settings?.offDays || [];
        // v2 → v3: merge the toggle-based common holidays into the off-day list
        // (they were not part of the old default, but they ARE holidays by default)
        const mergedOffDays = [...new Set([...prevOffDays, ...commonHolidayDates])].sort();
        const mergedSettings = {
          offDays: mergedOffDays,
          previewDate: base.settings?.previewDate || '',
          autoShift: base.settings?.autoShift !== false,
          phaseRanges: base.settings?.phaseRanges || null,
          chapterPhases: base.settings?.chapterPhases || {},
        };
        return {
          ...base,
          completions: base.completions || {},
          theme: base.theme || 'light',
          currentPage: base.currentPage || 'today',
          settings: mergedSettings,
          sync: {
            token: '', owner: 'anurag008w', repo: 'jee-planner-data',
            branch: 'main', path: 'planner-data.json',
            lastRemoteSha: '', lastSyncedAt: '', lastSnapshot: '',
            ...(base.sync || {}),
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        // Make sure the resolved schedule matches the hydrated completions/settings
        if (state && typeof state.recompute === 'function') state.recompute();
      },
    }
  )
);

export default useStore;