import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dataset from '../data/dataset.json' with { type: 'json' };
import mission100Dataset from '../data/mission100Dataset.json' with { type: 'json' };
import { computeResolvedSchedule, getSundaysBetween, getSaturdaysBetween, COMMON_HOLIDAYS } from './scheduleEngine.js';
import { getToday, detectChapterClass } from '../utils/helpers.js';
import { shiftLecturesToStartDate, shiftSundayOffDays } from './scheduleDateUtils.js';
import {
  buildLecturesWithExtras,
  compareLectureIds,
  getExtraLectureSeriesKey,
  normalizeExtraLectureCounts,
  pruneExtraCompletions,
} from './extraLectures.js';

const seriesKey = getExtraLectureSeriesKey;

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return new Date(dateStr.getTime());
  const parts = String(dateStr).split('T')[0].split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  return new Date(dateStr);
}

export function getBatchOriginalDates(lectures) {
  if (!lectures || !lectures.length) {
    return { startDate: '2026-09-11', endDate: '2026-12-25' };
  }
  const dates = [...new Set(lectures.map((l) => l.newStudyDate))].filter(Boolean).sort();
  return {
    startDate: dates[0] || '2026-09-11',
    endDate: dates[dates.length - 1] || '2026-12-25',
  };
}

export function getDefaultBatchSettings(startDate, endDate) {
  const defaultSundays = getSundaysBetween(startDate, endDate);
  const commonHolidays = COMMON_HOLIDAYS.map((h) => h.date).filter(
    (d) => d >= startDate && d <= endDate
  );
  const defaultOffDays = [...new Set([...defaultSundays, ...commonHolidays])].sort();
  return {
    offDays: defaultOffDays,
    startDate,
    previewDate: '',
    autoShift: true,
    adaptivePhases: true,
    dailyCap: null,
    phaseRanges: null,
    chapterPhases: {},
  };
}

export function deriveDashboard(name, lectures) {
  const { startDate, endDate } = getBatchOriginalDates(lectures);
  const physicsLectures = lectures.filter((l) => l.subject === 'Physics').length;
  const mathematicsLectures = lectures.filter((l) => l.subject === 'Mathematics').length;
  const chemistryLectures = lectures.filter((l) => l.subject === 'Chemistry').length;
  const physicalChemistryLectures = lectures.filter(
    (l) => l.chemistryBranch === 'Physical Chemistry'
  ).length;
  const organicChemistryLectures = lectures.filter(
    (l) => l.chemistryBranch === 'Organic Chemistry'
  ).length;
  const inorganicChemistryLectures = lectures.filter(
    (l) => l.chemistryBranch === 'Inorganic Chemistry'
  ).length;

  return {
    title: name || 'JEE Study Planner',
    startDate,
    endDate,
    totalLectures: lectures.length,
    physicsLectures,
    mathematicsLectures,
    chemistryLectures,
    physicalChemistryLectures,
    organicChemistryLectures,
    inorganicChemistryLectures,
    phases: [
      { phase: 'Phase 1', lecturesPerDay: 2 },
      { phase: 'Phase 2', lecturesPerDay: 3 },
      { phase: 'Phase 3', lecturesPerDay: 4 },
      { phase: 'Phase 4', lecturesPerDay: 5 },
    ],
  };
}

export function deriveChapterProgress(lectures) {
  const chaptersMap = new Map();
  lectures.forEach((l) => {
    if (!l.chapterName) return;
    const rawClass = l.class || l.standard || l.grade || l.classLevel || '';
    const classLevel = detectChapterClass(l.chapterName, rawClass);
    if (!chaptersMap.has(l.chapterName)) {
      chaptersMap.set(l.chapterName, {
        chapter: l.chapterName,
        subject: l.subject,
        chemistryBranch: l.chemistryBranch || l.branch || '',
        classLevel,
        totalLectures: 0,
        startDate: l.newStudyDate,
        endDate: l.newStudyDate,
        base: l.base || l.prerequisite || (l.pairing && l.pairing.base) || '',
        treatment: l.treatment || (l.pairing && l.pairing.treatment) || '',
        sessions: l.sessions || (l.pairing && l.pairing.sessions) || '',
      });
    }
    const item = chaptersMap.get(l.chapterName);
    item.totalLectures += 1;
    if (classLevel && !item.classLevel) item.classLevel = classLevel;
    const lBase = l.base || l.prerequisite || (l.pairing && l.pairing.base);
    const lTreatment = l.treatment || (l.pairing && l.pairing.treatment);
    const lSessions = l.sessions || (l.pairing && l.pairing.sessions);
    if (lBase && !item.base) item.base = lBase;
    if (lTreatment && !item.treatment) item.treatment = lTreatment;
    if (lSessions && !item.sessions) item.sessions = lSessions;
    if (l.newStudyDate && l.newStudyDate < item.startDate) item.startDate = l.newStudyDate;
    if (l.newStudyDate && l.newStudyDate > item.endDate) item.endDate = l.newStudyDate;
  });
  return Array.from(chaptersMap.values());
}

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
      return (
        an - bn ||
        a.newStudyDate.localeCompare(b.newStudyDate) ||
        (Number(a.slot) || 0) - (Number(b.slot) || 0) ||
        compareLectureIds(a.id, b.id)
      );
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
  const lectureMap = new Map(lectures.map((l) => [String(l.id), l]));
  const oldItemMap = new Map();
  Object.values(schedule.dayMap).forEach((dayList) => {
    dayList.forEach((item) => oldItemMap.set(String(item.id), item));
  });

  Object.entries(schedule.resolved).forEach(([id, meta]) => {
    const lecture = lectureMap.get(String(id));
    if (!lecture || completions[lecture.id] === 'completed') return;
    const oldItem = oldItemMap.get(String(lecture.id));
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
        return (
          (Number(a.lectureNumber) || 0) - (Number(b.lectureNumber) || 0) ||
          (Number(a.slot) || 0) - (Number(b.slot) || 0)
        );
      }
      return (Number(a.slot) || 0) - (Number(b.slot) || 0) || compareLectureIds(a.id, b.id);
    });
  });

  schedule.dayMap = rebuilt;
  return schedule;
};

const computeBatchSchedule = (
  batch,
  completions = {},
  settings = {},
  extraLectureCounts = {}
) => {
  const batchLectures = batch.lectures || [];
  const { startDate: origStart } = getBatchOriginalDates(batchLectures);
  const startDate = settings.startDate || origStart;
  const today = settings.previewDate || getToday();
  const combinedLectures = buildLecturesWithExtras(batchLectures, extraLectureCounts);
  const scheduledLectures = shiftLecturesToStartDate(combinedLectures, origStart, startDate);

  const completedToday = scheduledLectures
    .filter((lecture) => completions[lecture.id] === 'completed' && lecture.newStudyDate === today)
    .map((lecture) => ({ ...lecture, isBacklog: false, resolvedDate: today }));
  const completedTodayIds = new Set(completedToday.map((lecture) => lecture.id));
  const schedulerCompletions = { ...completions };
  completedTodayIds.forEach((id) => {
    delete schedulerCompletions[id];
  });

  const isAdaptivePhases = settings.adaptivePhases !== false && (batch.adaptivePhases !== false);
  const targetDailyCap = (settings.dailyCap && Number(settings.dailyCap) > 0)
    ? Number(settings.dailyCap)
    : (batch.dailyCap || null);

  const schedule = computeResolvedSchedule({
    lectures: scheduledLectures,
    completions: schedulerCompletions,
    today,
    offDays: settings.offDays || [],
    autoShift: settings.autoShift !== false,
    adaptivePhases: isAdaptivePhases,
    dailyCap: targetDailyCap,
    phaseRanges: settings.phaseRanges || null,
    chapterPhases: settings.chapterPhases || {},
  });

  const enforced = enforceLectureOrder(schedule, scheduledLectures, completions);

  if (completedToday.length > 0) {
    const existing = enforced.dayMap[today] || [];
    const existingIds = new Set(existing.map((lecture) => String(lecture.id)));
    const merged = [
      ...existing,
      ...completedToday.filter((lecture) => !existingIds.has(String(lecture.id))),
    ];
    merged.sort(
      (a, b) =>
        (Number(a.slot) || 0) - (Number(b.slot) || 0) ||
        (Number(a.lectureNumber) || 0) - (Number(b.lectureNumber) || 0) ||
        compareLectureIds(a.id, b.id)
    );
    enforced.dayMap[today] = merged;
    completedToday.forEach((lecture) => {
      enforced.resolved[lecture.id] = { resolvedDate: today, isBacklog: false };
    });
  }

  return enforced;
};

// Built-in initial default batches
export const DEFAULT_BATCH_ID = 'default';
export const MISSION100_BATCH_ID = 'mission-100-2027';

const defaultDates = getBatchOriginalDates(dataset.lectures);
const initialDefaultBatch = {
  id: DEFAULT_BATCH_ID,
  name: 'JEE Master 2026',
  isInbuilt: true,
  dashboard: dataset.dashboard,
  lectures: dataset.lectures,
  chapterProgress: dataset.chapterProgress,
  completions: {},
  extraLectureCounts: {},
  settings: getDefaultBatchSettings(defaultDates.startDate, defaultDates.endDate),
  createdAt: '2026-09-11',
};

const mission100Dates = getBatchOriginalDates(mission100Dataset.lectures);
const initialMission100Batch = {
  id: MISSION100_BATCH_ID,
  name: 'Mission 100 JEE 2027',
  isInbuilt: true,
  dailyCap: 3,
  dashboard: mission100Dataset.dashboard,
  lectures: mission100Dataset.lectures,
  chapterProgress: deriveChapterProgress(mission100Dataset.lectures),
  completions: {},
  extraLectureCounts: {},
  settings: {
    ...getDefaultBatchSettings(mission100Dates.startDate, mission100Dates.endDate),
    adaptivePhases: false,
    dailyCap: 3,
  },
  createdAt: '2026-09-28',
};

const useStore = create(
  persist(
    (set, get) => {
      const initialSchedule = computeBatchSchedule(
        initialDefaultBatch,
        initialDefaultBatch.completions,
        initialDefaultBatch.settings,
        initialDefaultBatch.extraLectureCounts
      );

      return {
        // Multi-batch state
        batches: {
          [DEFAULT_BATCH_ID]: initialDefaultBatch,
          [MISSION100_BATCH_ID]: initialMission100Batch,
        },
        activeBatchId: DEFAULT_BATCH_ID,
        defaultBatchId: DEFAULT_BATCH_ID,
        batchModalOpen: false,

        // Active batch projection for direct backwards compatibility
        lectures: buildLecturesWithExtras(initialDefaultBatch.lectures, {}),
        extraLectureCounts: {},
        chapterProgress: initialDefaultBatch.chapterProgress,
        dashboard: initialDefaultBatch.dashboard,
        foundations: null,
        chapterPairing: null,
        commonHolidays: COMMON_HOLIDAYS,

        currentPage: 'today',
        theme: 'light',
        searchOpen: false,
        selectedDate: null,
        selectedLecture: null,
        sidebarOpen: false,
        syncOpen: false,

        // GitHub manual sync
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
        markSynced: ({ sha, snapshot }) =>
          set((s) => ({
            sync: {
              ...s.sync,
              lastRemoteSha: sha || s.sync.lastRemoteSha,
              lastSyncedAt: new Date().toISOString(),
              lastSnapshot: snapshot || s.sync.lastSnapshot,
            },
          })),

        filters: {
          date: '',
          phase: '',
          subject: '',
          chemistryBranch: '',
          chapter: '',
          faculty: '',
          status: '',
        },

        completions: {},
        settings: initialDefaultBatch.settings,
        schedule: { ...initialSchedule, today: getToday() },

        // UI & Navigation
        setPage: (page) => set({ currentPage: page, sidebarOpen: false }),
        toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
        setSearchOpen: (open) => set({ searchOpen: open }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setSelectedLecture: (lecture) => set({ selectedLecture: lecture }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setBatchModalOpen: (open) => set({ batchModalOpen: open }),
        setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
        resetFilters: () =>
          set({
            filters: {
              date: '',
              phase: '',
              subject: '',
              chemistryBranch: '',
              chapter: '',
              faculty: '',
              status: '',
            },
          }),

        // -------------------------------------------------------------------
        // Batch Management
        // -------------------------------------------------------------------
        setActiveBatch: (batchId) => {
          const s = get();
          if (!s.batches[batchId]) return;
          set({ activeBatchId: batchId });
          get().recompute();
        },

        setDefaultBatch: (batchId) => {
          const s = get();
          if (!s.batches[batchId]) return;
          set({ defaultBatchId: batchId });
        },

        addBatch: (batchInput, makeActive = true) => {
          const s = get();
          let id = batchInput.id || `batch-${Date.now()}`;
          if (id === DEFAULT_BATCH_ID || id === MISSION100_BATCH_ID) {
            id = `batch-${Date.now()}`;
          }
          const lectures = Array.isArray(batchInput.lectures) ? batchInput.lectures : [];
          if (!lectures.length) {
            throw new Error('Batch lectures empty hai. Valid lecture list provide karo.');
          }

          const { startDate, endDate } = getBatchOriginalDates(lectures);
          const name = batchInput.name || 'New JEE Batch';
          const dashboard = batchInput.dashboard || deriveDashboard(name, lectures);
          const chapterProgress =
            batchInput.chapterProgress || deriveChapterProgress(lectures);
          const settings =
            batchInput.settings || getDefaultBatchSettings(startDate, endDate);
          const completions = batchInput.completions || {};
          const extraLectureCounts = batchInput.extraLectureCounts || {};

          const foundations = batchInput.foundations || batchInput.subjectFoundations || null;
          const chapterPairing = batchInput.chapterPairing || batchInput.chapterPairings || null;

          const newBatch = {
            id,
            name,
            isInbuilt: false,
            dashboard,
            lectures,
            chapterProgress,
            foundations,
            chapterPairing,
            completions,
            extraLectureCounts,
            settings,
            createdAt: batchInput.createdAt || new Date().toISOString().slice(0, 10),
          };

          const nextBatches = { ...s.batches, [id]: newBatch };
          set({
            batches: nextBatches,
            ...(makeActive ? { activeBatchId: id } : {}),
          });

          if (makeActive) {
            get().recompute();
          }
        },

        duplicateBatch: (batchId, newName) => {
          const s = get();
          const source = s.batches[batchId];
          if (!source) return;
          const newId = `batch-${Date.now()}`;
          const name = newName || `${source.name} (Copy)`;
          const newBatch = {
            ...source,
            id: newId,
            name,
            isInbuilt: false,
            dashboard: { ...source.dashboard, title: name },
            foundations: source.foundations || null,
            chapterPairing: source.chapterPairing || null,
            completions: {}, // Start fresh progress for duplicate batch
            extraLectureCounts: { ...(source.extraLectureCounts || {}) },
            settings: JSON.parse(JSON.stringify(source.settings)),
            createdAt: new Date().toISOString().slice(0, 10),
          };

          set({
            batches: { ...s.batches, [newId]: newBatch },
            activeBatchId: newId,
          });
          get().recompute();
        },

        renameBatch: (batchId, newName) => {
          if (!newName || !newName.trim()) return;
          set((s) => {
            const batch = s.batches[batchId];
            if (!batch) return {};
            const updated = {
              ...batch,
              name: newName.trim(),
              dashboard: { ...batch.dashboard, title: newName.trim() },
            };
            return {
              batches: { ...s.batches, [batchId]: updated },
              ...(s.activeBatchId === batchId
                ? { dashboard: { ...s.dashboard, title: newName.trim() } }
                : {}),
            };
          });
        },

        deleteBatch: (batchId) => {
          const s = get();
          if (
            batchId === DEFAULT_BATCH_ID ||
            batchId === MISSION100_BATCH_ID ||
            s.batches[batchId]?.isInbuilt
          ) {
            throw new Error('Inbuilt batch delete nahi kiya ja sakta.');
          }
          const batchKeys = Object.keys(s.batches);
          if (batchKeys.length <= 1) {
            throw new Error('Aakhri batch delete nahi kiya ja sakta.');
          }

          const nextBatches = { ...s.batches };
          delete nextBatches[batchId];

          const remainingIds = Object.keys(nextBatches);
          let nextActive = s.activeBatchId;
          let nextDefault = s.defaultBatchId;

          if (nextActive === batchId) {
            nextActive = remainingIds.includes(s.defaultBatchId)
              ? s.defaultBatchId
              : remainingIds[0];
          }
          if (nextDefault === batchId) {
            nextDefault = nextActive;
          }

          set({
            batches: nextBatches,
            activeBatchId: nextActive,
            defaultBatchId: nextDefault,
          });
          get().recompute();
        },

        // -------------------------------------------------------------------
        // Active Batch State Mutator Helper
        // -------------------------------------------------------------------
        updateActiveBatchState: (updater, freezeToday = false) => {
          const s = get();
          const activeBatch = s.batches[s.activeBatchId] || s.batches[DEFAULT_BATCH_ID];
          if (!activeBatch) return;

          const updatedBatch = updater(activeBatch);
          set({
            batches: {
              ...s.batches,
              [activeBatch.id]: updatedBatch,
            },
          });
          get().recompute({ freezeToday });
        },

        // -------------------------------------------------------------------
        // Schedule Engine Recomputation
        // -------------------------------------------------------------------
        recompute: (opts = {}) => {
          const s = get();
          const activeBatch =
            s.batches[s.activeBatchId] ||
            s.batches[s.defaultBatchId] ||
            Object.values(s.batches)[0] ||
            initialDefaultBatch;

          const today = activeBatch.settings?.previewDate || getToday();
          const schedule = computeBatchSchedule(
            activeBatch,
            activeBatch.completions,
            activeBatch.settings,
            activeBatch.extraLectureCounts
          );
          const lectures = buildLecturesWithExtras(
            activeBatch.lectures || [],
            activeBatch.extraLectureCounts || {}
          );

          if (opts.freezeToday) {
            const prevPlan =
              (s.schedule &&
                s.schedule.today === today &&
                s.schedule.dayMap &&
                s.schedule.dayMap[today]) ||
              [];
            if (prevPlan.length > 0) {
              const frozen = prevPlan;
              schedule.dayMap[today] = frozen;
              frozen.forEach((l) => {
                schedule.resolved[l.id] = {
                  resolvedDate: today,
                  isBacklog: l.newStudyDate < today,
                };
              });
            }
          }

          set({
            schedule: { ...schedule, today },
            lectures,
            dashboard: activeBatch.dashboard,
            chapterProgress: activeBatch.chapterProgress,
            foundations: activeBatch.foundations || activeBatch.subjectFoundations || null,
            chapterPairing: activeBatch.chapterPairing || activeBatch.chapterPairings || null,
            completions: activeBatch.completions,
            settings: activeBatch.settings,
            extraLectureCounts: activeBatch.extraLectureCounts,
          });
        },

        // -------------------------------------------------------------------
        // Completion actions (applied to active batch)
        // -------------------------------------------------------------------
        markComplete: (id) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            completions: { ...batch.completions, [id]: 'completed' },
          }), true);
        },
        markIncomplete: (id) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            completions: { ...batch.completions, [id]: 'not_started' },
          }), true);
        },
        toggleComplete: (id) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            completions: {
              ...batch.completions,
              [id]: batch.completions[id] === 'completed' ? 'not_started' : 'completed',
            },
          }), true);
        },
        completeMany: (ids) => {
          get().updateActiveBatchState((batch) => {
            const completions = { ...batch.completions };
            ids.forEach((id) => {
              completions[id] = 'completed';
            });
            return { ...batch, completions };
          }, true);
        },

        // -------------------------------------------------------------------
        // Schedule Settings (applied to active batch)
        // -------------------------------------------------------------------
        toggleOffDay: (date) => {
          get().updateActiveBatchState((batch) => {
            const has = (batch.settings.offDays || []).includes(date);
            const offDays = has
              ? batch.settings.offDays.filter((d) => d !== date)
              : [...(batch.settings.offDays || []), date].sort();
            return {
              ...batch,
              settings: { ...batch.settings, offDays },
            };
          });
        },

        setSundaysOff: (on) => {
          get().updateActiveBatchState((batch) => {
            const { startDate, endDate } = getBatchOriginalDates(batch.lectures);
            const start = batch.settings?.startDate || startDate;
            const defaultSundays = getSundaysBetween(start, endDate);
            const offDays = on
              ? [...new Set([...(batch.settings.offDays || []), ...defaultSundays])].sort()
              : (batch.settings.offDays || []).filter((d) => parseLocalDate(d).getDay() !== 0);
            return {
              ...batch,
              settings: { ...batch.settings, offDays },
            };
          });
        },

        setSaturdaysOff: (on) => {
          get().updateActiveBatchState((batch) => {
            const { startDate, endDate } = getBatchOriginalDates(batch.lectures);
            const start = batch.settings?.startDate || startDate;
            const defaultSaturdays = getSaturdaysBetween(start, endDate);
            const offDays = on
              ? [...new Set([...(batch.settings.offDays || []), ...defaultSaturdays])].sort()
              : (batch.settings.offDays || []).filter((d) => parseLocalDate(d).getDay() !== 6);
            return {
              ...batch,
              settings: { ...batch.settings, offDays },
            };
          });
        },

        setAdaptivePhases: (on) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, adaptivePhases: on },
          }));
        },

        setAllCommonHolidays: (on) => {
          get().updateActiveBatchState((batch) => {
            const { startDate, endDate } = getBatchOriginalDates(batch.lectures);
            const commonHolidays = COMMON_HOLIDAYS.map((h) => h.date).filter(
              (d) => d >= startDate && d <= endDate
            );
            const offDays = on
              ? [...new Set([...(batch.settings.offDays || []), ...commonHolidays])].sort()
              : (batch.settings.offDays || []).filter((d) => !commonHolidays.includes(d));
            return {
              ...batch,
              settings: { ...batch.settings, offDays },
            };
          });
        },

        setPreviewDate: (date) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, previewDate: date },
          }));
        },

        setStartDate: (date) => {
          if (!date) return;
          get().updateActiveBatchState((batch) => {
            const { startDate: origStart, endDate: origEnd } = getBatchOriginalDates(batch.lectures);
            const previousStartDate = batch.settings.startDate || origStart;
            const offDays = shiftSundayOffDays(
              batch.settings.offDays || [],
              origStart,
              origEnd,
              previousStartDate,
              date
            );
            return {
              ...batch,
              settings: {
                ...batch.settings,
                startDate: date,
                offDays,
              },
            };
          });
        },

        setAutoShift: (value) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, autoShift: value },
          }));
        },

        setPhaseRanges: (ranges) => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, phaseRanges: ranges },
          }));
        },

        resetPhaseRanges: () => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, phaseRanges: null },
          }));
        },

        setChapterPhase: (chapter, phase) => {
          get().updateActiveBatchState((batch) => {
            const cp = { ...(batch.settings.chapterPhases || {}) };
            if (phase === '' || phase === 'auto') delete cp[chapter];
            else cp[chapter] = phase;
            return {
              ...batch,
              settings: { ...batch.settings, chapterPhases: cp },
            };
          });
        },

        resetChapterPhases: () => {
          get().updateActiveBatchState((batch) => ({
            ...batch,
            settings: { ...batch.settings, chapterPhases: {} },
          }));
        },

        setExtraLectureCount: (lectureOrSeriesKey, count) => {
          const key =
            typeof lectureOrSeriesKey === 'string'
              ? lectureOrSeriesKey
              : seriesKey(lectureOrSeriesKey);
          const nextCount = normalizeExtraLectureCounts({ [key]: count })[key] || 0;
          get().updateActiveBatchState((batch) => {
            const extraLectureCounts = { ...(batch.extraLectureCounts || {}) };
            if (nextCount > 0) extraLectureCounts[key] = nextCount;
            else delete extraLectureCounts[key];
            return {
              ...batch,
              extraLectureCounts,
              completions: pruneExtraCompletions(batch.completions, extraLectureCounts),
            };
          });
        },

        isCompleted: (id) => get().completions[id] === 'completed',
        getCompletionCount: () =>
          Object.values(get().completions).filter((v) => v === 'completed').length,
        getDateLectures: (date) => get().lectures.filter((l) => l.newStudyDate === date),

        // -------------------------------------------------------------------
        // Backup / Restore
        // -------------------------------------------------------------------
        exportBackup: (batchId = null) => {
          const s = get();
          if (batchId && s.batches[batchId]) {
            return {
              app: 'jee-planner-batch',
              version: 1,
              exportedAt: new Date().toISOString(),
              batch: s.batches[batchId],
            };
          }
          return {
            app: 'jee-planner',
            version: 7,
            exportedAt: new Date().toISOString(),
            batches: s.batches,
            activeBatchId: s.activeBatchId,
            defaultBatchId: s.defaultBatchId,
            theme: s.theme,
            completions: s.completions,
            settings: s.settings,
            extraLectureCounts: s.extraLectureCounts,
          };
        },

        importBackup: (data) => {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (
            !parsed ||
            (parsed.app !== 'jee-planner' && parsed.app !== 'jee-planner-batch')
          ) {
            throw new Error('Invalid backup — yeh JEE Planner ki backup file nahi hai');
          }

          const s = get();

          // Single batch file
          if (parsed.app === 'jee-planner-batch' && parsed.batch) {
            s.addBatch(parsed.batch, true);
            return;
          }

          // Full multi-batch backup (v7)
          if (parsed.batches && typeof parsed.batches === 'object') {
            const batches = {};
            Object.entries(parsed.batches).forEach(([id, b]) => {
              batches[id] = {
                ...b,
                completions: b.completions || {},
                extraLectureCounts: normalizeExtraLectureCounts(b.extraLectureCounts || {}),
                settings: b.settings || getDefaultBatchSettings('2026-09-11', '2026-12-25'),
              };
            });
            const activeBatchId =
              parsed.activeBatchId && batches[parsed.activeBatchId]
                ? parsed.activeBatchId
                : Object.keys(batches)[0];
            const defaultBatchId =
              parsed.defaultBatchId && batches[parsed.defaultBatchId]
                ? parsed.defaultBatchId
                : activeBatchId;

            set({
              batches,
              activeBatchId,
              defaultBatchId,
              theme: parsed.theme === 'dark' ? 'dark' : 'light',
            });
            get().recompute();
            return;
          }

          // Legacy single-batch backup (v6 or earlier): restore into default batch
          const extraLectureCounts = normalizeExtraLectureCounts(parsed.extraLectureCounts || {});
          const currentBatch = s.batches[s.activeBatchId] || initialDefaultBatch;
          const { startDate: origStart, endDate: origEnd } = getBatchOriginalDates(currentBatch.lectures);
          const initialOff = getDefaultBatchSettings(origStart, origEnd).offDays;
          const offDays = Array.isArray(parsed.settings?.offDays)
            ? parsed.settings.offDays
            : initialOff;

          const updatedBatch = {
            ...currentBatch,
            completions: pruneExtraCompletions(
              typeof parsed.completions === 'object' ? parsed.completions : {},
              extraLectureCounts
            ),
            extraLectureCounts,
            settings: {
              offDays: [...new Set(offDays)].sort(),
              startDate: parsed.settings?.startDate || origStart,
              previewDate: parsed.settings?.previewDate || '',
              autoShift: parsed.settings?.autoShift !== false,
              phaseRanges: parsed.settings?.phaseRanges || null,
              chapterPhases: parsed.settings?.chapterPhases || {},
            },
          };

          set({
            batches: { ...s.batches, [currentBatch.id]: updatedBatch },
            theme: parsed.theme === 'dark' ? 'dark' : 'light',
          });
          get().recompute();
        },
      };
    },
    {
      name: 'jee-planner-storage',
      partialize: (state) => ({
        batches: state.batches,
        activeBatchId: state.activeBatchId,
        defaultBatchId: state.defaultBatchId,
        theme: state.theme,
        currentPage: state.currentPage,
        sync: state.sync,
      }),
      version: 9,
      migrate: (persisted) => {
        const base = persisted || {};
        // If persisted data already has batches, retain them and ensure inbuilt batches exist
        if (base.batches && typeof base.batches === 'object') {
          if (base.batches[DEFAULT_BATCH_ID]) {
            base.batches[DEFAULT_BATCH_ID].isInbuilt = true;
          } else {
            base.batches[DEFAULT_BATCH_ID] = initialDefaultBatch;
          }
          if (base.batches[MISSION100_BATCH_ID]) {
            const mBatch = base.batches[MISSION100_BATCH_ID];
            mBatch.isInbuilt = true;
            mBatch.dailyCap = 3;
            if (!mBatch.settings) mBatch.settings = initialMission100Batch.settings;
            mBatch.settings.adaptivePhases = false;
            mBatch.settings.dailyCap = 3;
            if (
              !mBatch.lectures ||
              mBatch.lectures.length < 209
            ) {
              mBatch.lectures = initialMission100Batch.lectures;
              mBatch.dashboard = initialMission100Batch.dashboard;
              mBatch.chapterProgress = initialMission100Batch.chapterProgress;
            }
          } else {
            base.batches[MISSION100_BATCH_ID] = initialMission100Batch;
          }
          return {
            ...base,
            activeBatchId: base.activeBatchId || DEFAULT_BATCH_ID,
            defaultBatchId: base.defaultBatchId || DEFAULT_BATCH_ID,
          };
        }

        // Migrate legacy store (v6 or earlier) into the default batch
        const extraLectureCounts = normalizeExtraLectureCounts(base.extraLectureCounts || {});
        const legacyOffDays = base.settings?.offDays || (defaultDates ? initialDefaultBatch.settings.offDays : []);
        const mergedSettings = {
          offDays: legacyOffDays,
          startDate: base.settings?.startDate || defaultDates.startDate,
          previewDate: base.settings?.previewDate || '',
          autoShift: base.settings?.autoShift !== false,
          adaptivePhases: true,
          dailyCap: null,
          phaseRanges: base.settings?.phaseRanges || null,
          chapterPhases: base.settings?.chapterPhases || {},
        };

        const migratedDefaultBatch = {
          id: DEFAULT_BATCH_ID,
          name: 'JEE Master 2026',
          isInbuilt: true,
          dashboard: dataset.dashboard,
          lectures: dataset.lectures,
          chapterProgress: dataset.chapterProgress,
          completions: pruneExtraCompletions(base.completions || {}, extraLectureCounts),
          extraLectureCounts,
          settings: mergedSettings,
          createdAt: '2026-09-11',
        };

        return {
          theme: base.theme || 'light',
          currentPage: base.currentPage || 'today',
          batches: {
            [DEFAULT_BATCH_ID]: migratedDefaultBatch,
            [MISSION100_BATCH_ID]: initialMission100Batch,
          },
          activeBatchId: DEFAULT_BATCH_ID,
          defaultBatchId: DEFAULT_BATCH_ID,
          sync: {
            token: '',
            owner: 'anurag008w',
            repo: 'jee-planner-data',
            branch: 'main',
            path: 'planner-data.json',
            lastRemoteSha: '',
            lastSyncedAt: '',
            lastSnapshot: '',
            ...(base.sync || {}),
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.batches) state.batches = {};
          if (!state.batches[DEFAULT_BATCH_ID]) {
            state.batches[DEFAULT_BATCH_ID] = JSON.parse(JSON.stringify(initialDefaultBatch));
          } else {
            state.batches[DEFAULT_BATCH_ID].isInbuilt = true;
          }
          if (!state.batches[MISSION100_BATCH_ID]) {
            state.batches[MISSION100_BATCH_ID] = JSON.parse(JSON.stringify(initialMission100Batch));
          } else {
            const mBatch = state.batches[MISSION100_BATCH_ID];
            mBatch.isInbuilt = true;
            if (mBatch.dailyCap === undefined) mBatch.dailyCap = 3;
            if (!mBatch.settings) mBatch.settings = JSON.parse(JSON.stringify(initialMission100Batch.settings));
            if (mBatch.settings.adaptivePhases === undefined) mBatch.settings.adaptivePhases = false;
            if (mBatch.settings.dailyCap === undefined) mBatch.settings.dailyCap = 3;
            if (
              !mBatch.lectures ||
              mBatch.lectures.length < 209
            ) {
              mBatch.lectures = initialMission100Batch.lectures;
              mBatch.dashboard = initialMission100Batch.dashboard;
              mBatch.chapterProgress = initialMission100Batch.chapterProgress;
            }
          }
          // On fresh load, if user set a default batch, open that default batch
          const target = state.defaultBatchId || state.activeBatchId || DEFAULT_BATCH_ID;
          if (state.batches && state.batches[target]) {
            state.activeBatchId = target;
          }
          if (typeof state.recompute === 'function') state.recompute();
        }
      },
    }
  )
);

export default useStore;
