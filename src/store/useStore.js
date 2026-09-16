import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dataset from '../data/dataset.json';
import { computeResolvedSchedule, getSundaysBetween, COMMON_HOLIDAYS } from './scheduleEngine';
import { getToday } from '../utils/helpers';
import { dateDiffInDays, shiftLecturesToStartDate, shiftSundayOffDays } from './scheduleDateUtils';

const scheduleDates = [...new Set(dataset.lectures.map(l => l.newStudyDate))].sort();
const ORIGINAL_START_DATE = scheduleDates[0];
const defaultSundayOffs = getSundaysBetween(scheduleDates[0], scheduleDates[scheduleDates.length - 1]);
const commonHolidayDates = COMMON_HOLIDAYS.map(h => h.date).filter(d => d >= scheduleDates[0] && d <= scheduleDates[scheduleDates.length - 1]);
const defaultOffDays = [...new Set([...defaultSundayOffs, ...commonHolidayDates])].sort();

const seriesKey = (lecture) => [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');

const enforceLectureOrder = (schedule, lectures, completions) => {
  const bySeries = {};
  lectures.forEach((lecture) => {
    if (completions[lecture.id] === 'completed') return;
    const key = seriesKey(lecture);
    if (!bySeries[key]) bySeries[key] = [];
    bySeries[key].push(lecture);
  });

  Object.values(bySeries).forEach((series) => {
    series.sort((a, b) => {
      const an = Number(a.lectureNumber) || Number.MAX_SAFE_INTEGER;
      const bn = Number(b.lectureNumber) || Number.MAX_SAFE_INTEGER;
      return an - bn || a.newStudyDate.localeCompare(b.newStudyDate) || (a.slot || 0) - (b.slot || 0) || a.id - b.id;
    });

    let previousDate = null;
    series.forEach((lecture) => {
      const current = schedule.resolved[lecture.id];
      if (!current) return;
      if (previousDate && current.resolvedDate < previousDate) {
        current.resolvedDate = previousDate;
        current.isBacklog = lecture.newStudyDate < previousDate;
      }
      previousDate = current.resolvedDate;
    });
  });

  const rebuilt = {};
  Object.entries(schedule.resolved).forEach(([id, meta]) => {
    const lecture = lectures.find(l => String(l.id) === String(id));
    if (!lecture || completions[lecture.id] === 'completed') return;
    const oldItem = schedule.dayMap[meta.resolvedDate]?.find(l => l.id === lecture.id);
    const item = {
      ...lecture,
      phase: oldItem?.phase || lecture.phase,
      isBacklog: meta.isBacklog,
      resolvedDate: meta.resolvedDate,
    };
    if (!rebuilt[meta.resolvedDate]) rebuilt[meta.resolvedDate] = [];
    rebuilt[meta.resolvedDate].push(item);
  });

  Object.values(rebuilt).forEach((items) => {
    items.sort((a, b) => {
      const ak = seriesKey(a);
      const bk = seriesKey(b);
      if (ak === bk) return (Number(a.lectureNumber) || 0) - (Number(b.lectureNumber) || 0) || (a.slot || 0) - (b.slot || 0);
      return (a.slot || 0) - (b.slot || 0) || a.id - b.id;
    });
  });

  schedule.dayMap = rebuilt;
  return schedule;
};

const computeSchedule = (completions, settings) => {
  const startDate = settings.startDate || ORIGINAL_START_DATE;
  const scheduledLectures = shiftLecturesToStartDate(dataset.lectures, ORIGINAL_START_DATE, startDate);
  const schedule = computeResolvedSchedule({
    lectures: scheduledLectures,
    completions,
    today: settings.previewDate || getToday(),
    offDays: settings.offDays,
    autoShift: settings.autoShift,
    phaseRanges: settings.phaseRanges,
    chapterPhases: settings.chapterPhases,
  });
  return enforceLectureOrder(schedule, scheduledLectures, completions);
};

const useStore = create(
  persist(
    (set, get) => {
      const initialSettings = {
        offDays: defaultOffDays,
        startDate: ORIGINAL_START_DATE,
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

        sync: {
          token: '', owner: 'anurag008w', repo: 'jee-planner-data', branch: 'main', path: 'planner-data.json',
          lastRemoteSha: '', lastSyncedAt: '', lastSnapshot: '',
        },
        setSyncOpen: (open) => set({ syncOpen: open }),
        setSyncConfig: (patch) => set((s) => ({ sync: { ...s.sync, ...patch } })),
        markSynced: ({ sha, snapshot }) => set((s) => ({ sync: { ...s.sync, lastRemoteSha: sha || s.sync.lastRemoteSha, lastSyncedAt: new Date().toISOString(), lastSnapshot: snapshot || s.sync.lastSnapshot } })),

        filters: { date: '', phase: '', subject: '', chemistryBranch: '', chapter: '', faculty: '', status: '' },
        completions: {},
        settings: initialSettings,
        schedule: { ...initialSchedule, today: getToday() },

        setPage: (page) => set({ currentPage: page, sidebarOpen: false }),
        toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
        setSearchOpen: (open) => set({ searchOpen: open }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setSelectedLecture: (lecture) => set({ selectedLecture: lecture }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
        resetFilters: () => set({ filters: { date: '', phase: '', subject: '', chemistryBranch: '', chapter: '', faculty: '', status: '' } }),

        recompute: (opts = {}) => {
          const s = get();
          const today = s.settings.previewDate || getToday();
          const schedule = computeSchedule(s.completions, s.settings);
          if (opts.freezeToday) {
            const prevPlan = (s.schedule && s.schedule.today === today && s.schedule.dayMap && s.schedule.dayMap[today]) || [];
            if (prevPlan.length > 0) {
              const frozen = prevPlan.filter(l => s.completions[l.id] !== 'completed');
              schedule.dayMap[today] = frozen;
              frozen.forEach(l => { schedule.resolved[l.id] = { resolvedDate: today, isBacklog: l.newStudyDate < today }; });
            }
          }
          set({ schedule: { ...schedule, today } });
        },

        markComplete: (id) => { set((s) => ({ completions: { ...s.completions, [id]: 'completed' } })); get().recompute({ freezeToday: true }); },
        markIncomplete: (id) => { set((s) => ({ completions: { ...s.completions, [id]: 'not_started' } })); get().recompute({ freezeToday: true }); },
        toggleComplete: (id) => {
          set((s) => ({ completions: { ...s.completions, [id]: s.completions[id] === 'completed' ? 'not_started' : 'completed' } }));
          get().recompute({ freezeToday: true });
        },
        completeMany: (ids) => {
          set((s) => { const completions = { ...s.completions }; ids.forEach((id) => { completions[id] = 'completed'; }); return { completions }; });
          get().recompute({ freezeToday: true });
        },

        toggleOffDay: (date) => {
          set((s) => {
            const has = s.settings.offDays.includes(date);
            const offDays = has ? s.settings.offDays.filter((d) => d !== date) : [...s.settings.offDays, date].sort();
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setSundaysOff: (on) => {
          set((s) => {
            const offDays = on ? [...new Set([...s.settings.offDays, ...defaultOffDays])].sort() : s.settings.offDays.filter((d) => new Date(d).getDay() !== 0);
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setAllCommonHolidays: (on) => {
          set((s) => {
            const offDays = on ? [...new Set([...s.settings.offDays, ...commonHolidayDates])].sort() : s.settings.offDays.filter((d) => !commonHolidayDates.includes(d));
            return { settings: { ...s.settings, offDays } };
          });
          get().recompute();
        },
        setPreviewDate: (date) => { set((s) => ({ settings: { ...s.settings, previewDate: date } })); get().recompute(); },
        setStartDate: (date) => {
          if (!date) return;
          set((s) => {
            const oldStart = s.settings.startDate || ORIGINAL_START_DATE;
            const deltaDays = dateDiffInDays(oldStart, date);
            const offDays = shiftSundayOffDays(s.settings.offDays || [], deltaDays);
            return { settings: { ...s.settings, startDate: date, offDays: [...new Set(offDays)].sort() } };
          });
          get().recompute();
        },
        setAutoShift: (value) => { set((s) => ({ settings: { ...s.settings, autoShift: value } })); get().recompute(); },
        setPhaseRanges: (ranges) => { set((s) => ({ settings: { ...s.settings, phaseRanges: ranges } })); get().recompute(); },
        resetPhaseRanges: () => { set((s) => ({ settings: { ...s.settings, phaseRanges: null } })); get().recompute(); },
        setChapterPhase: (chapter, phase) => {
          set((s) => { const cp = { ...(s.settings.chapterPhases || {}) }; if (phase === '' || phase === 'auto') delete cp[chapter]; else cp[chapter] = phase; return { settings: { ...s.settings, chapterPhases: cp } }; });
          get().recompute();
        },
        resetChapterPhases: () => { set((s) => ({ settings: { ...s.settings, chapterPhases: {} } })); get().recompute(); },

        isCompleted: (id) => get().completions[id] === 'completed',
        getCompletionCount: () => Object.values(get().completions).filter((v) => v === 'completed').length,
        getDateLectures: (date) => get().lectures.filter((l) => l.newStudyDate === date),

        exportBackup: () => { const s = get(); return { app: 'jee-planner', exportedAt: new Date().toISOString(), completions: s.completions, settings: s.settings, theme: s.theme }; },
        importBackup: (data) => {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (!parsed || parsed.app !== 'jee-planner') throw new Error('Invalid backup — yeh JEE Planner ki backup file nahi hai');
          const current = get();
          const offDays = (parsed.settings && Array.isArray(parsed.settings.offDays)) ? parsed.settings.offDays : (current.settings.offDays || []);
          set({
            completions: (parsed.completions && typeof parsed.completions === 'object') ? parsed.completions : {},
            theme: parsed.theme === 'dark' ? 'dark' : 'light',
            settings: {
              offDays: [...new Set(offDays)].sort(),
              startDate: parsed.settings?.startDate || ORIGINAL_START_DATE,
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
          startDate: state.settings.startDate,
          previewDate: state.settings.previewDate,
          autoShift: state.settings.autoShift,
          phaseRanges: state.settings.phaseRanges,
          chapterPhases: state.settings.chapterPhases,
        },
      }),
      version: 5,
      migrate: (persisted) => {
        const base = persisted || {};
        const prevOffDays = base.settings?.offDays || [];
        const mergedOffDays = [...new Set([...prevOffDays, ...commonHolidayDates])].sort();
        return {
          ...base,
          completions: base.completions || {},
          theme: base.theme || 'light',
          currentPage: base.currentPage || 'today',
          settings: {
            offDays: mergedOffDays,
            startDate: base.settings?.startDate || ORIGINAL_START_DATE,
            previewDate: base.settings?.previewDate || '',
            autoShift: base.settings?.autoShift !== false,
            phaseRanges: base.settings?.phaseRanges || null,
            chapterPhases: base.settings?.chapterPhases || {},
          },
          sync: {
            token: '', owner: 'anurag008w', repo: 'jee-planner-data', branch: 'main', path: 'planner-data.json',
            lastRemoteSha: '', lastSyncedAt: '', lastSnapshot: '', ...(base.sync || {}),
          },
        };
      },
      onRehydrateStorage: () => (state) => { if (state && typeof state.recompute === 'function') state.recompute(); },
    }
  )
);

export default useStore;