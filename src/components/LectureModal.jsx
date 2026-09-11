import useStore from '../store/useStore';
import { X, Check, Clock, BookOpen, User, Calendar, Hash, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { formatDateFull, getSubjectColor, getBranchColor, getPhaseColor } from '../utils/helpers';

export default function LectureModal() {
  const { selectedLecture, setSelectedLecture, toggleComplete, completions, lectures } = useStore();
  if (!selectedLecture) return null;

  const lecture = selectedLecture;
  const status = completions[lecture.id] || 'not_started';
  const isCompleted = status === 'completed';
  const subjectColor = getSubjectColor(lecture.subject);
  const branchColor = lecture.chemistryBranch ? getBranchColor(lecture.chemistryBranch) : null;
  const phaseColor = getPhaseColor(lecture.phase);

  const subjectLectures = lectures.filter(l => l.subject === lecture.subject);
  const currentIdx = subjectLectures.findIndex(l => l.id === lecture.id);
  const prev = currentIdx > 0 ? subjectLectures[currentIdx - 1] : null;
  const next = currentIdx < subjectLectures.length - 1 ? subjectLectures[currentIdx + 1] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedLecture(null)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${lecture.subject} — ${lecture.topic}`}
        className="relative w-full max-w-lg bg-white dark:bg-[#1a1c2b] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scaleIn max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-5 border-b border-gray-100 dark:border-white/5 ${isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
          <div className="flex items-start justify-between">
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
            </div>
            <button
              onClick={() => setSelectedLecture(null)}
              aria-label="Close lecture details"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 transition-colors text-gray-400"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className={`text-lg font-bold mt-3 leading-snug ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
            {lecture.topic}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4">
          <DetailRow icon={<BookOpen size={16} />} label="Chapter" value={lecture.chapterName} />
          <DetailRow icon={<Hash size={16} />} label="Lecture Number" value={`Lecture ${lecture.lectureNumber}`} />
          <DetailRow icon={<User size={16} />} label="Faculty" value={lecture.facultyName} />
          <DetailRow icon={<Calendar size={16} />} label="Study Date" value={`${formatDateFull(lecture.newStudyDate)} (${lecture.day})`} />
          {lecture.originalDate && (
            <DetailRow icon={<Clock size={16} />} label="Original Date" value={lecture.originalDate} />
          )}
          {lecture.timings && (
            <DetailRow icon={<Clock size={16} />} label="Timing" value={lecture.timings} />
          )}
          <DetailRow icon={<span className="text-[13px] font-bold">S</span>} label="Slot" value={`Slot ${lecture.slot}`} />

          <div className="flex items-center gap-3 pt-2">
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">Status:</span>
            <span className={`text-[12px] font-semibold px-3 py-1 rounded-full ${
              isCompleted
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : status === 'in_progress'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
            }`}>
              {isCompleted ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Not Started'}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
          {prev && (
            <button
              onClick={() => setSelectedLecture(prev)}
              aria-label={`Previous lecture: ${prev.topic}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">L{prev.lectureNumber}</span>
            </button>
          )}

          <button
            onClick={() => toggleComplete(lecture.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
              isCompleted
                ? 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/25'
            }`}
          >
            {isCompleted ? (
              <><RotateCcw size={15} /> Mark Incomplete</>
            ) : (
              <><Check size={15} /> Mark Complete</>
            )}
          </button>

          {next && (
            <button
              onClick={() => setSelectedLecture(next)}
              aria-label={`Next lecture: ${next.topic}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="hidden sm:inline">L{next.lectureNumber}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-[13.5px] text-gray-900 dark:text-white font-medium">{value}</p>
      </div>
    </div>
  );
}