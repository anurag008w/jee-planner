import useStore from '../store/useStore';
import { getSubjectColor, getBranchColor, getPhaseColor, formatDate } from '../utils/helpers';
import { getLectureLoad } from '../data/chapterStrategy';
import { Check, Clock, ChevronRight, BookOpen } from 'lucide-react';

export default function LectureCard({ lecture, compact = false, showDate = false, showTimeline = false, showOriginal = false }) {
  const { toggleComplete, completions, setSelectedLecture } = useStore();
  const status = completions[lecture.id] || 'not_started';
  const isCompleted = status === 'completed';
  const isBacklog = !!lecture.isBacklog && !isCompleted;
  const isOneShot = !isCompleted && getLectureLoad(lecture) < 1;
  const subjectColor = getSubjectColor(lecture.subject);
  const branchColor = lecture.chemistryBranch ? getBranchColor(lecture.chemistryBranch) : null;
  const phaseColor = getPhaseColor(lecture.phase);
  const displayDate = lecture.resolvedDate || lecture.newStudyDate;
  const shiftedFromOriginal = lecture.resolvedDate && lecture.resolvedDate !== lecture.newStudyDate;

  if (compact) {
    return (
      <div
        className={`
          group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer
          hover:-translate-y-px hover:shadow-md active:scale-[0.99]
          ${isBacklog ? 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10' : ''}
          ${isCompleted
            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
            : 'bg-white dark:bg-[#1e1f32] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm'
          }
        `}
        onClick={() => setSelectedLecture(lecture)}
      >
        {isBacklog && <div className="w-1 self-stretch rounded-full bg-red-500 flex-shrink-0" />}
        <button
          onClick={(e) => { e.stopPropagation(); toggleComplete(lecture.id); }}
          className={`
            flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
            ${isCompleted
              ? 'bg-green-500 border-green-500 text-white scale-110'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
            }
          `}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${branchColor ? `${branchColor.badge} ${branchColor.dark}` : `${subjectColor.badge} ${subjectColor.dark}`}`}>
              {lecture.chemistryBranch || lecture.subject}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Lec {lecture.lectureNumber}
            </span>
            {isOneShot && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" title="ONE SHOT chapter — aadha effort">
                0.5×
              </span>
            )}
            {isBacklog && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white">
                BACKLOG
              </span>
            )}
          </div>
          <p className={`text-[13px] font-medium truncate ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
            {lecture.topic}
          </p>
          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
            {lecture.chapterName} • {lecture.facultyName}
          </p>
          {showOriginal && shiftedFromOriginal && (
            <p className="text-[10px] text-red-400 dark:text-red-500/80 truncate mt-0.5">
              Orig {formatDate(lecture.newStudyDate)} → shifted
            </p>
          )}
        </div>

        {showDate && (
          <div className="text-right flex-shrink-0 hidden sm:block">
            <span className={`block text-[11px] ${isBacklog ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatDate(displayDate)}
            </span>
            {shiftedFromOriginal && (
              <span className="block text-[9.5px] text-gray-400 dark:text-gray-600 mt-0.5">
                orig {formatDate(lecture.newStudyDate)}
              </span>
            )}
          </div>
        )}

        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
      </div>
    );
  }

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        ${isCompleted
          ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/5 border-green-200/60 dark:border-green-800/30'
          : 'bg-white dark:bg-[#1e1f32] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/25 hover:-translate-y-0.5'
        }
      `}
      onClick={() => setSelectedLecture(lecture)}
    >
      {showTimeline && (
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: isCompleted ? '#4ade80' : isBacklog ? '#ef4444' : phaseColor.hex }} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${subjectColor.badge} ${subjectColor.dark}`}>
              {lecture.subject}
            </span>
            {lecture.chemistryBranch && (
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${branchColor.badge} ${branchColor.dark}`}>
                {lecture.chemistryBranch}
              </span>
            )}
            <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${phaseColor.bg} ${phaseColor.text} ${phaseColor.dark}`}>
              {lecture.phase}
            </span>
            {isOneShot && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" title="ONE SHOT chapter — aadha effort (0.5×)">
                ONE SHOT • 0.5×
              </span>
            )}
            {isBacklog && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white">
                BACKLOG
              </span>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); toggleComplete(lecture.id); }}
            className={`
              flex-shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-200
              ${isCompleted
                ? 'bg-green-500 border-green-500 text-white scale-110 shadow-lg shadow-green-500/25'
                : 'border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }
            `}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted && <Check size={16} strokeWidth={3} />}
          </button>
        </div>

        <h3 className={`text-[15px] font-semibold mb-1 leading-snug ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
          {lecture.topic}
        </h3>

        <div className="flex items-center gap-1.5 mb-3">
          <BookOpen size={13} className="text-gray-400 dark:text-gray-500" />
          <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
            {lecture.chapterName}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                L{lecture.lectureNumber}
              </div>
              <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                {lecture.facultyName}
              </span>
            </div>
          </div>
          {showDate && (
            <span className={`text-[11px] flex items-center gap-1 ${isBacklog ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
              <Clock size={11} />
              {formatDate(displayDate)}
              {shiftedFromOriginal && (
                <span className="text-[9.5px] text-gray-400 dark:text-gray-600 font-normal">
                  (orig {formatDate(lecture.newStudyDate)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}