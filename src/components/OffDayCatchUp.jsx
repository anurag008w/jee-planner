import { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { getSubjectColor, getBranchColor, formatDateShort } from '../utils/helpers';
import { Check, PartyPopper, ListTodo } from 'lucide-react';

/**
 * OffDayCatchUp — the "Do you want to complete some backlog lectures?" panel.
 * Appears on OFF days (Sundays by default + any manually-marked-off date).
 * Lists ALL backlog lectures as checkboxes; student picks how many/which to complete.
 */
export default function OffDayCatchUp({ date, compact = false }) {
  const { schedule, completeMany } = useStore();
  const backlog = schedule.backlogList || [];

  const [selected, setSelected] = useState({});

  const checkedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => {
    const next = {};
    backlog.forEach((l) => { next[l.id] = true; });
    setSelected(next);
  };
  const clearAll = () => setSelected({});
  const doComplete = () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (ids.length) completeMany(ids);
    setSelected({});
  };

  if (backlog.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-8' : 'py-12'}`}>
        <PartyPopper size={compact ? 20 : 32} className="mx-auto mb-3 text-green-500" />
        <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-100">
          No backlog at all 🎉
        </p>
        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
          {date ? 'Just relax and enjoy this off day!' : 'Everything is on track – enjoy the break!'}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Header */}
      <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl p-3.5">
        <ListTodo size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13.5px] font-semibold text-red-700 dark:text-red-300">
            Do you want to complete some backlog lectures?
          </p>
          <p className="text-[11.5px] text-red-600/90 dark:text-red-300/90 mt-0.5">
            {backlog.length} lecture{backlog.length > 1 ? 's' : ''} pending from earlier days — pick any to finish them today.
          </p>
        </div>
      </div>

      {/* Selection actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            aria-label="Select all backlog lectures"
            className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            Select all ({backlog.length})
          </button>
          {checkedCount > 0 && (
            <button
              onClick={clearAll}
              aria-label="Clear selection"
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <span className="text-[11.5px] text-gray-400 dark:text-gray-500">
          {checkedCount} selected
        </span>
      </div>

      {/* Backlog checklist */}
      <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1 -mr-1">
        {backlog.map((l) => {
          const subjectColor = getSubjectColor(l.subject);
          const branchColor = l.chemistryBranch ? getBranchColor(l.chemistryBranch) : null;
          const isChecked = !!selected[l.id];
          return (
            <label
              key={l.id}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none
                ${isChecked
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                  : 'bg-white dark:bg-[#1a1c2b] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(l.id)}
                className="w-4 h-4 accent-indigo-600 flex-shrink-0"
              />
              <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${branchColor ? branchColor.hex : subjectColor.hex}`} style={{ backgroundColor: branchColor?.hex || subjectColor.hex }} />
              <div className="flex-1 min-w-0">
                <p className={`text-[12.5px] font-medium truncate ${isChecked ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'}`}>
                  {l.topic}
                </p>
                <p className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">
                  {l.chemistryBranch || l.subject} • Lec {l.lectureNumber} • {l.chapterName}
                </p>
              </div>
              <span className="text-[10.5px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatDateShort(l.newStudyDate)}
              </span>
            </label>
          );
        })}
      </div>

      {/* Complete button */}
      <button
        onClick={doComplete}
        disabled={checkedCount === 0}
        className={`
          w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
          ${checkedCount > 0
            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5'
            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
        `}
      >
        <Check size={15} strokeWidth={3} />
        Complete {checkedCount > 0 ? checkedCount : 'some'} selected
        {checkedCount > 0 && ` lecture${checkedCount > 1 ? 's' : ''}`}
      </button>
    </div>
  );
}