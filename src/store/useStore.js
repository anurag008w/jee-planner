import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dataset from '../data/dataset.json';
import { computeResolvedSchedule, getSundaysBetween, COMMON_HOLIDAYS } from './scheduleEngine';
import { getToday } from '../utils/helpers';
import { shiftLecturesToStartDate, shiftSundayOffDays } from './scheduleDateUtils';
import {
  buildLecturesWithExtras,
  compareLectureIds,
  getExtraLectureSeriesKey,
  normalizeExtraLectureCounts,
  pruneExtraCompletions,
} from './extraLectures';

// Default off days = every Sunday inside the schedule span
//                 + the 9 toggle-based common holidays (14 Sep, 2 Oct, 20 Oct, 6/7/9/11/16 Nov, 25 Dec)
const scheduleDates = [...new Set(dataset.lectures.map(l => l.newStudyDate))].sort();
const ORIGINAL_START_DATE = scheduleDates[0];
const ORIGINAL_END_DATE = scheduleDates[scheduleDates.length - 1];
const defaultSundayOffs = getSundaysBetween(scheduleDates[0], scheduleDates[scheduleDates.length - 1]);
const commonHolidayDates = COMMON_HOLIDAYS.map(h => h.date).filter(d => d >= scheduleDates[0] && d <= scheduleDates[scheduleDates.length - 1]);
const defaultOffDays = [...new Set([...defaultSundayOffs, ...commonHolidayDates])].sort();

const seriesKey = getExtraLectureSeriesKey;

// Final integrity pass: a lecture can never resolve before an earlier lecture
// in the same subject/chapter series. This protects the displayed schedule from
// ordering regressions caused by backlog/adaptive-capacity calculations.
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
      return an - bn
        || a.newStudyDate.localeCompare(b.newStudyDate)
        || (Number(a.slot) || 0) - (Number(b.slot) || 0)
        || compareLectureIds(a.id, b.id);
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

  // Rebuild dayMap from the corrected resolved dates so the UI can never show
  // a later lecture on an earlier day than its own previous lecture.
  const rebuilt = {};
  Object.entries(schedule.resolved).forEach(([id, meta]) => {
    const lecture = lectures.find(l => String(l.id) === String(id));
    if (!lecture || completions[lecture.id] === 'completed') return;
    const oldItem = Object.values(schedule.dayMap).flat().find(l => l.id === lecture.id);
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
      if (ak === bk) {
        return (Number(a.lectureNumber) || 0) - (Number(b.lectureNumber) || 0)
          || (Number(a.slot) || 0) - (Number(b.slot) || 0);
      }
      return (Number(a.slot) || 0) - (Number(b.slot) || 0) || compareLectureIds(a.id, b.id);
    });
  });

  schedule.dayMap = rebuilt;
  return schedule;
};

const computeSchedule = (completions, settings, extraLectureCounts = {}) => {
  const startDate = settings.startDate || ORIGINAL_START_DATE;
  const today = settings.previewDate || getToday();
  const combinedLectures = buildLecturesWithExtras(dataset.lectures, extraLectureCounts);
  const scheduledLectures = shiftLecturesToStartDate(combinedLectures, ORIGINAL_START_DATE, startDate);

  // A lecture that was already marked complete before the start-date shift can
  // legitimately become part of today's shifted plan. It must still reserve its
  // place in today's plan and remain visible, rather than disappearing because
  // completion filtering removes it from the scheduler output.
  const completedToday = scheduledLectures
    .filter((lecture) => completions[lecture.id] === 'completed' && lecture.newStudyDate === today)
    .map((lecture) => ({ ...lecture, isBacklog: false, resolvedDate: today }));
  const completedTodayIds = new Set(completedToday.map((lecture) => lecture.id));
  const schedulerCompletions = { ...completions };
  completedTodayIds.forEach((id) => { delete schedulerCompletions[id]; });

  const schedule = computeResolvedSchedule({
    lectures: scheduledLectures,
    completions: schedulerCompletions,
    today,
    offDays: settings.offDays,
    autoShift: settings.autoShift,
    phaseRanges: settings.phaseRanges,
    chapterPhases: settings.chapterPhases,
  });

  const enforced = enforceLectureOrder(schedule, scheduledLectures, completions);

  if (completedToday.length > 0) {
    const existing = enforced.dayMap[today] || [];
    const existingIds = new Set(existing.map((lecture) => String(lecture.id)));
    const merged = [
      ...existing,
      ...completedToday.filter((lecture) => !existingIds.has(String(lecture.id))),
    ];
    merged.sort((a, b) =>
      (Number(a.slot) || 0) - (Number(b.slot) || 0)
      || (Number(a.lectureNumber) || 0) - (Number(b.lectureNumber) || 0)
      || compareLectureIds(a.id, b.id)
    );
    enforced.dayMap[today] = merged;
    completedToday.forEach((lecture) => {
      enforced.resolved[lecture.id] = { resolvedDate: today, isBacklog: false };
    });
  }

  return enforced;
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
      const initialSchedule = computeSchedule({}, initialSettings, {});

      return {
        lectures: buildLecturesWithExtras(dataset.lectures, {}),
        extraLectureCounts: {},
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
        // FREEZE rakho. Completing a lecture updates only its status; it stays in
        // today's visible plan so the user can see the completed work and tick.
        // No replacement lecture is injected into today's frozen list.
        recompute: (opts = {}) => {
          const s = get();
          const today = s.settings.previewDate || getToday();
          const schedule = computeSchedule(s.completions, s.settings, s.extraLectureCounts);
          const lectures = buildLecturesWithExtras(dataset.lectures, s.extraLectureCounts);
          if (opts.freezeToday) {
            const prevPlan = (s.schedule && s.schedule.today === today && s.schedule.dayMap && s.schedule.dayMap[today]) || [];
            if (prevPlan.length > 0) {
              const frozen = prevPlan;
              schedule.dayMap[today] = frozen;
              frozen.forEach(l => {
                schedule.resolved[l.id] = {
                  resolvedDate: today,
                  isBacklog: l.newStudyDate < today,
                };
              });
            }
          }
          set({ schedule: { ...schedule, today }, lectures });
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
        setStartDate: (date) => {
          if (!date) return;
          set((s) => {
            const previousStartDate = s.settings.startDate || ORIGINAL_START_DATE;
            const offDays = shiftSundayOffDays(
              s.settings.offDays || [],
              ORIGINAL_START_DATE,
              ORIGINAL_END_DATE,
              previousStartDate,
              date,
            );
            return {
              settings: {
                ...s.settings,
                startDate: date,
                offDays,
              },
            };
          });
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

        setExtraLectureCount: (lectureOrSeriesKey, count) => {
          const key = typeof lectureOrSeriesKey === 'string' ? lectureOrSeriesKey : seriesKey(lectureOrSeriesKey);
          const nextCount = normalizeExtraLectureCounts({ [key]: count })[key] || 0;
          set((s) => {
            const extraLectureCounts = { ...(s.extraLectureCounts || {}) };
            if (nextCount > 0) extraLectureCounts[key] = nextCount;
            else delete extraLectureCounts[key];
            return {
              extraLectureCounts,
              completions: pruneExtraCompletions(s.completions, extraLectureCounts),
            };
          });
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
            extraLectureCounts: s.extraLectureCounts,
          };
        },
        importBackup: (data) => {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (!parsed || parsed.app !== 'jee-planner') {
            throw new Error('Invalid backup — yeh JEE Planner ki backup file nahi hai');
          }
          const current = get();
          const extraLectureCounts = normalizeExtraLectureCounts(parsed.extraLectureCounts || {});
          const offDays = (parsed.settings && Array.isArray(parsed.settings.offDays))
            ? parsed.settings.offDays
            : (current.settings.offDays || []);
          set({
            completions: pruneExtraCompletions(
              (parsed.completions && typeof parsed.completions === 'object') ? parsed.completions : {},
              extraLectureCounts,
            ),
            extraLectureCounts,
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
        extraLectureCounts: state.extraLectureCounts,
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
      version: 6,
      migrate: (persisted) => {
        const base = persisted || {};
        const prevOffDays = base.settings?.offDays || [];
        // v2 → v3: merge the toggle-based common holidays into the off-day list
        // (they were not part of the old default, but they ARE holidays by default)
        const mergedOffDays = [...new Set([...prevOffDays, ...commonHolidayDates])].sort();
        const extraLectureCounts = normalizeExtraLectureCounts(base.extraLectureCounts || {});
        const mergedSettings = {
          offDays: mergedOffDays,
          startDate: base.settings?.startDate || ORIGINAL_START_DATE,
          previewDate: base.settings?.previewDate || '',
          autoShift: base.settings?.autoShift !== false,
          phaseRanges: base.settings?.phaseRanges || null,
          chapterPhases: base.settings?.chapterPhases || {},
        };
        return {
          ...base,
          completions: pruneExtraCompletions(base.completions || {}, extraLectureCounts),
          extraLectureCounts,
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
