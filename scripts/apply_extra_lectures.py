from pathlib import Path

root = Path('.')

helper = '''// User-defined extra lectures are stored separately from the immutable dataset.
// Generated lectures mirror normal lecture objects so the existing scheduler,
// completion tracking, calendar and analytics treat them like regular work.

const MAX_EXTRA_LECTURES = 1000;

export function getExtraLectureSeriesKey(lecture) {
  return [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');
}

export const compareLectureIds = (a, b) => {
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a).localeCompare(String(b));
};

export function getExtraLectureId(seriesKey, index) {
  return `extra:${encodeURIComponent(seriesKey)}:${index}`;
}

export function normalizeExtraLectureCounts(counts) {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return {};
  return Object.entries(counts).reduce((result, [key, raw]) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return result;
    const count = Math.max(0, Math.min(MAX_EXTRA_LECTURES, Math.floor(parsed)));
    if (count > 0) result[key] = count;
    return result;
  }, {});
}

export function buildLecturesWithExtras(baseLectures, counts) {
  const normalized = normalizeExtraLectureCounts(counts);
  const grouped = {};

  baseLectures.forEach((lecture) => {
    const key = getExtraLectureSeriesKey(lecture);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(lecture);
  });

  const extras = [];
  Object.entries(normalized).forEach(([key, count]) => {
    const series = grouped[key];
    if (!series?.length) return;

    const ordered = [...series].sort((a, b) =>
      (Number(a.lectureNumber) || Number.MAX_SAFE_INTEGER) - (Number(b.lectureNumber) || Number.MAX_SAFE_INTEGER)
      || String(a.newStudyDate).localeCompare(String(b.newStudyDate))
      || (Number(a.slot) || 0) - (Number(b.slot) || 0)
      || compareLectureIds(a.id, b.id)
    );
    const last = ordered[ordered.length - 1];
    const lastNumber = Math.max(...ordered.map((lecture) => Number(lecture.lectureNumber) || 0), 0);

    for (let index = 1; index <= count; index += 1) {
      extras.push({
        ...last,
        id: getExtraLectureId(key, index),
        topic: 'Extra Lecture',
        lectureNumber: lastNumber + index,
        sourceSNo: null,
        originalDate: '',
        isExtraLecture: true,
        extraIndex: index,
        slot: (Number(last.slot) || 0) + index,
        // Anchor extras to the last original lecture so the scheduler handles
        // backlog, off-days, phase caps and auto-shift exactly as normal work.
        newStudyDate: last.newStudyDate,
        day: last.day,
        phase: last.phase,
      });
    }
  });

  return [...baseLectures, ...extras];
}

export function pruneExtraCompletions(completions, counts) {
  const normalized = normalizeExtraLectureCounts(counts);
  const validIds = new Set();
  Object.entries(normalized).forEach(([key, count]) => {
    for (let index = 1; index <= count; index += 1) validIds.add(getExtraLectureId(key, index));
  });

  return Object.fromEntries(
    Object.entries(completions || {}).filter(([id]) => !String(id).startsWith('extra:') || validIds.has(id))
  );
}
'''
(root / 'src/store/extraLectures.js').write_text(helper, encoding='utf-8')

# ----- Store: persisted extra-lecture state + derived lecture objects -----
p = root / 'src/store/useStore.js'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "import { dateDiffInDays, shiftLecturesToStartDate, shiftSundayOffDays } from './scheduleDateUtils';\n",
    "import { dateDiffInDays, shiftLecturesToStartDate, shiftSundayOffDays } from './scheduleDateUtils';\nimport { buildLecturesWithExtras, compareLectureIds, getExtraLectureSeriesKey, normalizeExtraLectureCounts, pruneExtraCompletions } from './extraLectures';\n",
)
s = s.replace(
    "const seriesKey = (lecture) => [lecture.subject, lecture.chemistryBranch || '', lecture.chapterName].join('::');\n",
    "const seriesKey = getExtraLectureSeriesKey;\n",
)
s = s.replace("|| a.id - b.id", "|| compareLectureIds(a.id, b.id)")
s = s.replace(
    "const computeSchedule = (completions, settings) => {\n  const startDate = settings.startDate || ORIGINAL_START_DATE;\n  const scheduledLectures = shiftLecturesToStartDate(dataset.lectures, ORIGINAL_START_DATE, startDate);",
    "const computeSchedule = (completions, settings, extraLectureCounts = {}) => {\n  const startDate = settings.startDate || ORIGINAL_START_DATE;\n  const combinedLectures = buildLecturesWithExtras(dataset.lectures, extraLectureCounts);\n  const scheduledLectures = shiftLecturesToStartDate(combinedLectures, ORIGINAL_START_DATE, startDate);",
)
s = s.replace(
    "const initialSchedule = computeSchedule({}, initialSettings);",
    "const initialSchedule = computeSchedule({}, initialSettings, {});\n      const initialLectures = buildLecturesWithExtras(dataset.lectures, {});",
)
s = s.replace("        lectures: dataset.lectures,\n", "        lectures: initialLectures,\n        extraLectureCounts: {},\n", 1)
s = s.replace(
    "          const schedule = computeSchedule(s.completions, s.settings);",
    "          const schedule = computeSchedule(s.completions, s.settings, s.extraLectureCounts);\n          const lectures = buildLecturesWithExtras(dataset.lectures, s.extraLectureCounts);",
)
s = s.replace(
    "          set({ schedule: { ...schedule, today } });",
    "          set({ schedule: { ...schedule, today }, lectures });",
    1,
)
s = s.replace(
    "        isCompleted: (id) => get().completions[id] === 'completed',\n",
    "        setExtraLectureCount: (lectureOrSeriesKey, count) => {\n          const key = typeof lectureOrSeriesKey === 'string' ? lectureOrSeriesKey : seriesKey(lectureOrSeriesKey);\n          const normalized = normalizeExtraLectureCounts({ [key]: count });\n          const nextCount = normalized[key] || 0;\n          set((s) => {\n            const extraLectureCounts = { ...(s.extraLectureCounts || {}) };\n            if (nextCount > 0) extraLectureCounts[key] = nextCount;\n            else delete extraLectureCounts[key];\n            return {\n              extraLectureCounts,\n              completions: pruneExtraCompletions(s.completions, extraLectureCounts),\n            };\n          });\n          get().recompute();\n        },\n\n        isCompleted: (id) => get().completions[id] === 'completed',\n",
)
s = s.replace(
    "            theme: s.theme,\n          };",
    "            theme: s.theme,\n            extraLectureCounts: s.extraLectureCounts,\n          };",
)
s = s.replace(
    "          const current = get();\n          const offDays =",
    "          const current = get();\n          const extraLectureCounts = normalizeExtraLectureCounts(parsed.extraLectureCounts || {});\n          const offDays =",
)
s = s.replace(
    "            completions: (parsed.completions && typeof parsed.completions === 'object') ? parsed.completions : {},\n",
    "            completions: pruneExtraCompletions(\n              (parsed.completions && typeof parsed.completions === 'object') ? parsed.completions : {},\n              extraLectureCounts,\n            ),\n            extraLectureCounts,\n",
)
s = s.replace(
    "      partialize: (state) => ({\n        completions: state.completions,\n",
    "      partialize: (state) => ({\n        completions: state.completions,\n        extraLectureCounts: state.extraLectureCounts,\n",
)
s = s.replace("      version: 5,", "      version: 6,")
needle = "          completions: base.completions || {},\n"
if needle in s and "extraLectureCounts: normalizeExtraLectureCounts(base.extraLectureCounts || {})" not in s:
    s = s.replace(
        needle,
        "          completions: pruneExtraCompletions(base.completions || {}, normalizeExtraLectureCounts(base.extraLectureCounts || {})),\n          extraLectureCounts: normalizeExtraLectureCounts(base.extraLectureCounts || {}),\n",
        1,
    )
p.write_text(s, encoding='utf-8')

# ----- Scheduler: deterministic comparisons support generated string IDs -----
p = root / 'src/store/scheduleEngine.js'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "const EPS = 1e-9;\n",
    "const EPS = 1e-9;\nconst compareLectureIds = (a, b) => {\n  const an = Number(a);\n  const bn = Number(b);\n  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;\n  return String(a).localeCompare(String(b));\n};\n",
)
s = s.replace("a.id - b.id", "compareLectureIds(a.id, b.id)")
s = s.replace("a.firstLecture.id - b.firstLecture.id", "compareLectureIds(a.firstLecture.id, b.firstLecture.id)")
p.write_text(s, encoding='utf-8')

# ----- Study Arena: chapter-circle editor -----
p = root / 'src/pages/StudyArenaPage.jsx'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "import { getBranchColor, getSubjectColor } from '../utils/helpers';",
    "import { getBranchColor, getSubjectColor } from '../utils/helpers';\nimport { getExtraLectureSeriesKey } from '../store/extraLectures';",
)
s = s.replace(
    "  const { lectures, completions, currentPage } = useStore();",
    "  const { lectures, completions, currentPage, extraLectureCounts, setExtraLectureCount } = useStore();",
)
s = s.replace(
    "  const [expanded, setExpanded] = useState(null);\n",
    "  const [expanded, setExpanded] = useState(null);\n  const [extraEditor, setExtraEditor] = useState(null);\n  const [extraDraft, setExtraDraft] = useState('0');\n",
)
s = s.replace(
    "      return {\n        name,\n        lectures: chapterLectures,",
    "      return {\n        name,\n        seriesKey: chapterLectures[0] ? getExtraLectureSeriesKey(chapterLectures[0]) : name,\n        lectures: chapterLectures,",
)
s = s.replace(
    "          const isOpen = expanded === chapter.name;",
    "          const isOpen = expanded === chapter.seriesKey;\n          const extraCount = extraLectureCounts[chapter.seriesKey] || 0;",
)
s = s.replace(
    "onClick={() => setExpanded(isOpen ? null : chapter.name)}",
    "onClick={() => setExpanded(isOpen ? null : chapter.seriesKey)}",
)
old_circle = '''                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isOpen
                      ? `${style.active} border-current`
                      : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'
                }`}>
                  {isDone ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </div>'''
new_circle = '''                <button
                  type="button"
                  className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all shadow-sm hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current ${
                    isDone
                      ? 'bg-green-500 border-green-500 text-white'
                      : isOpen
                        ? `${style.active} border-current`
                        : 'bg-white dark:bg-[#1a1c2b] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExtraEditor({ seriesKey: chapter.seriesKey, name: chapter.name });
                    setExtraDraft(String(extraCount));
                  }}
                  aria-label={`Set extra lectures for ${chapter.name}`}
                  title="Set extra lectures"
                >
                  {isDone ? <CheckCircle2 size={18} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </button>'''
assert old_circle in s, 'StudyArena chapter circle block not found'
s = s.replace(old_circle, new_circle, 1)
s = s.replace(
    '<span className="flex items-center gap-1"><BookOpen size={11} />{chapter.total} lectures</span>',
    '<span className="flex items-center gap-1"><BookOpen size={11} />{chapter.total} lectures{extraCount > 0 ? ` • +${extraCount} extra` : \'\'}</span>',
)
modal = '''      {extraEditor && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Extra lectures for ${extraEditor.name}`}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            aria-label="Close extra lecture editor"
            onClick={() => setExtraEditor(null)}
          />
          <div className="relative w-full sm:max-w-[360px] bg-white dark:bg-[#1a1c2b] rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl p-4 animate-slideIn">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Extra Lectures</p>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">{extraEditor.name}</h3>
              </div>
              <button type="button" className="btn-icon" aria-label="Close" onClick={() => setExtraEditor(null)}>×</button>
            </div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="extra-lecture-count">Number of extra lectures</label>
            <input
              id="extra-lecture-count"
              type="number"
              inputMode="numeric"
              min="0"
              max="1000"
              step="1"
              value={extraDraft}
              onChange={(event) => setExtraDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const count = Math.max(0, Math.min(1000, Math.floor(Number(extraDraft) || 0)));
                  setExtraLectureCount(extraEditor.seriesKey, count);
                  setExtraEditor(null);
                }
              }}
              className="field text-lg font-bold"
              autoFocus
            />
            <p className="mt-2 text-[10.5px] text-gray-400 dark:text-gray-500">0 karoge toh extra lectures remove ho jayenge.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" className="btn-secondary px-3 py-2.5 rounded-xl text-[12.5px] font-semibold" onClick={() => setExtraEditor(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary px-3 py-2.5 rounded-xl text-[12.5px] font-semibold"
                onClick={() => {
                  const count = Math.max(0, Math.min(1000, Math.floor(Number(extraDraft) || 0)));
                  setExtraLectureCount(extraEditor.seriesKey, count);
                  setExtraEditor(null);
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
'''
s = s.replace("    </div>\n  );\n}\n\nfunction MiniStat", modal + "    </div>\n  );\n}\n\nfunction MiniStat", 1)
p.write_text(s, encoding='utf-8')

# ----- GitHub sync: extra counts are syncable, token remains local-only -----
p = root / 'src/lib/githubSync.js'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "// GitHub pe jaane wale payload me token KABHI nahi hota — sirf completions/settings/theme.",
    "// GitHub pe jaane wale payload me token KABHI nahi hota — sirf planner progress/settings/theme/extra lecture counts.",
)
s = s.replace("    theme: state.theme,\n", "    theme: state.theme,\n    extraLectureCounts: state.extraLectureCounts || {},\n", 1)
s = s.replace(
    "    theme: payload.theme || 'light',\n  });",
    "    theme: payload.theme || 'light',\n    extraLectureCounts: payload.extraLectureCounts || {},\n  });",
)
s = s.replace(
    "    theme: localIsNewer ? localPayload.theme : (remoteData.theme || localPayload.theme),\n",
    "    theme: localIsNewer ? localPayload.theme : (remoteData.theme || localPayload.theme),\n    extraLectureCounts: localIsNewer\n      ? (localPayload.extraLectureCounts || {})\n      : (remoteData.extraLectureCounts || localPayload.extraLectureCounts || {}),\n",
)
p.write_text(s, encoding='utf-8')

# ----- Sync modal: include extra counts in payload and dirty checks -----
p = root / 'src/components/SyncModal.jsx'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "    completions, settings, theme,\n",
    "    completions, settings, theme, extraLectureCounts,\n",
)
s = s.replace(
    "const localPayload = buildPayload({ completions, settings, theme });",
    "const localPayload = buildPayload({ completions, settings, theme, extraLectureCounts });",
)
s = s.replace(
    "snapshotOf({ completions: data.completions, settings: data.settings, theme: data.theme })",
    "snapshotOf({ completions: data.completions, settings: data.settings, theme: data.theme, extraLectureCounts: data.extraLectureCounts })",
)
p.write_text(s, encoding='utf-8')

# ----- Regression test -----
test = '''import assert from 'node:assert/strict';
import { buildLecturesWithExtras, getExtraLectureId, getExtraLectureSeriesKey, pruneExtraCompletions } from './src/store/extraLectures.js';
import { computeResolvedSchedule } from './src/store/scheduleEngine.js';

const base = [
  { id: 1, newStudyDate: '2026-01-01', day: 'Thursday', phase: 'Phase 1', slot: 1, subject: 'Physics', chemistryBranch: '', chapterName: 'Demo', topic: 'A', lectureNumber: 1, facultyName: 'Demo Sir' },
  { id: 2, newStudyDate: '2026-01-02', day: 'Friday', phase: 'Phase 1', slot: 1, subject: 'Physics', chemistryBranch: '', chapterName: 'Demo', topic: 'B', lectureNumber: 2, facultyName: 'Demo Sir' },
  { id: 3, newStudyDate: '2026-01-03', day: 'Saturday', phase: 'Phase 1', slot: 1, subject: 'Physics', chemistryBranch: '', chapterName: 'Demo', topic: 'C', lectureNumber: 3, facultyName: 'Demo Sir' },
];
const key = getExtraLectureSeriesKey(base[0]);
const lectures = buildLecturesWithExtras(base, { [key]: 2 });
const extras = lectures.filter((lecture) => lecture.isExtraLecture);
assert.equal(lectures.length, 5);
assert.deepEqual(extras.map((lecture) => lecture.topic), ['Extra Lecture', 'Extra Lecture']);
assert.deepEqual(extras.map((lecture) => lecture.lectureNumber), [4, 5]);
assert.deepEqual(extras.map((lecture) => lecture.id), [getExtraLectureId(key, 1), getExtraLectureId(key, 2)]);
assert.deepEqual(extras.map((lecture) => lecture.newStudyDate), ['2026-01-03', '2026-01-03']);
assert.equal(extras[0].facultyName, base[2].facultyName);

const schedule = computeResolvedSchedule({ lectures, completions: {}, today: '2026-01-01', offDays: [], autoShift: true });
for (const lecture of lectures) assert.ok(schedule.resolved[lecture.id], `lecture ${lecture.lectureNumber} was not scheduled`);
assert.ok(schedule.resolved[extras[0].id].resolvedDate >= schedule.resolved[base[2].id].resolvedDate);
assert.ok(schedule.resolved[extras[1].id].resolvedDate >= schedule.resolved[extras[0].id].resolvedDate);

const pruned = pruneExtraCompletions({
  [getExtraLectureId(key, 1)]: 'completed',
  [getExtraLectureId(key, 2)]: 'completed',
}, { [key]: 1 });
assert.deepEqual(pruned, { [getExtraLectureId(key, 1)]: 'completed' });

console.log('PASS | extra lectures regression');
'''
(root / 'test-extra-lectures.mjs').write_text(test, encoding='utf-8')

# ----- Existing CI keeps current suite and adds the extra-lecture regression -----
p = root / '.github/workflows/ui-quality.yml'
s = p.read_text(encoding='utf-8')
if 'node test-extra-lectures.mjs' not in s:
    s = s.replace('node test-engine.mjs\n', 'node test-engine.mjs\n      - run: node test-extra-lectures.mjs\n')
p.write_text(s, encoding='utf-8')

print('extra lectures patch files written')
