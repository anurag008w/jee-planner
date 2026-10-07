import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import {
  getSubjectColor, getBranchColor, formatDateShort, formatDate
} from '../utils/helpers';
import { getNextStudyDate } from '../store/scheduleDateUtils';
import {
  X, Calendar, ArrowLeftRight, ArrowDownRight, Search, Check,
  Clock, RotateCcw
} from 'lucide-react';

export default function LectureAdjustModal({ lecture, onClose }) {
  const {
    schedule,
    settings,
    lectures,
    shiftLectureToTomorrow,
    reorderTodayLectures,
    swapLectures,
    resetLectureAdjustment,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [activeTab, setActiveTab] = useState('postpone'); // 'postpone' | 'today' | 'other'

  if (!lecture) return null;

  const today = schedule.today;
  const todayPlan = (schedule.dayMap && schedule.dayMap[today]) || [];
  const otherTodayLectures = todayPlan.filter((l) => String(l.id) !== String(lecture.id));
  const nextStudyDate = getNextStudyDate(today, settings.offDays || []);
  const hasOverride = !!(settings.manualOverrides && settings.manualOverrides[lecture.id]);

  const subjectColor = getSubjectColor(lecture.subject);
  const branchColor = lecture.chemistryBranch ? getBranchColor(lecture.chemistryBranch) : null;

  // Filter candidates for swapping from other days
  const candidateLectures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const todayIds = new Set(todayPlan.map((l) => String(l.id)));

    return lectures.filter((l) => {
      // Exclude today's lectures from this list (they are in "today" tab)
      if (todayIds.has(String(l.id))) return false;

      // Subject filter
      if (selectedSubject !== 'All' && l.subject !== selectedSubject) return false;

      // Search query
      if (q) {
        const matchTopic = (l.topic || '').toLowerCase().includes(q);
        const matchChapter = (l.chapterName || '').toLowerCase().includes(q);
        const matchFaculty = (l.facultyName || '').toLowerCase().includes(q);
        return matchTopic || matchChapter || matchFaculty;
      }

      return true;
    }).slice(0, 60);
  }, [lectures, todayPlan, searchQuery, selectedSubject]);

  const distinctSubjects = useMemo(() => {
    const set = new Set();
    lectures.forEach((l) => {
      if (l.subject) set.add(l.subject);
    });
    return ['All', ...Array.from(set)];
  }, [lectures]);

  const handlePostpone = () => {
    shiftLectureToTomorrow(lecture.id);
    onClose();
  };

  const handleTodaySwap = (targetId) => {
    reorderTodayLectures(lecture.id, targetId);
    onClose();
  };

  const handleOtherSwap = (targetId) => {
    swapLectures(lecture.id, targetId);
    onClose();
  };

  const handleReset = () => {
    resetLectureAdjustment(lecture.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1a1c2b] rounded-t-3xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[82vh] max-h-[640px] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${subjectColor.badge} ${subjectColor.dark}`}>
                {lecture.subject}
              </span>
              {lecture.chemistryBranch && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${branchColor?.badge || ''} ${branchColor?.dark || ''}`}>
                  {lecture.chemistryBranch}
                </span>
              )}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                Today • Slot {lecture.slot}
              </span>
              {hasOverride && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Customized
                </span>
              )}
            </div>
            <h2 className="text-[15px] sm:text-base font-bold text-gray-900 dark:text-white truncate">
              {lecture.topic}
            </h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {lecture.chapterName} • Lec {lecture.lectureNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 -mr-1 -mt-1 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('postpone')}
            className={`flex-1 min-w-[110px] min-h-[44px] px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'postpone'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <ArrowDownRight size={15} />
            Kal ke liye Shift
          </button>

          {otherTodayLectures.length > 0 && (
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 min-w-[110px] min-h-[44px] px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'today'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <ArrowLeftRight size={15} />
              Aaj ke Slots
            </button>
          )}

          <button
            onClick={() => setActiveTab('other')}
            className={`flex-1 min-w-[120px] min-h-[44px] px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'other'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <Calendar size={15} />
            Other Day Swap
          </button>
        </div>

        {/* Tab Body - Clean Single Scroll Architecture */}
        {activeTab === 'postpone' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 animate-fadeIn scrollbar-thin">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📅</span>
                <h3 className="text-[14px] font-bold text-amber-900 dark:text-amber-200">
                  Shift to Next Study Day
                </h3>
              </div>
              <p className="text-[12.5px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                Agar aap aaj yeh lecture nahi kar pa rahe, toh ise ek click me kal (ya agle study day) ke liye shift kar sakte hain. Yeh lecture aaj ke list se hatkar <strong>{formatDate(nextStudyDate)}</strong> ke study plan me chala jayega.
              </p>
            </div>

            <button
              onClick={handlePostpone}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-[13.5px] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <ArrowDownRight size={18} />
              Shift to Tomorrow ({formatDateShort(nextStudyDate)})
            </button>

            <div className="text-center">
              <p className="text-[11.5px] text-gray-400 dark:text-gray-500">
                Off-days (Sundays/Holidays) automatically skip ho jayenge.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'today' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 animate-fadeIn scrollbar-thin">
            <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
              Aaj ke kis lecture ke saath slot badalna chahte hain? Click karke instant swap karein:
            </p>

            {otherTodayLectures.map((other) => {
              const oSubj = getSubjectColor(other.subject);
              return (
                <button
                  key={other.id}
                  onClick={() => handleTodaySwap(other.id)}
                  className="w-full min-h-[52px] p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-white/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 text-left transition-all flex items-center gap-3 group active:scale-[0.99]"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-[12px] flex items-center justify-center shrink-0">
                    S{other.slot}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${oSubj.badge} ${oSubj.dark}`}>
                        {other.subject}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Slot {other.slot}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                      {other.topic}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-[11.5px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    <ArrowLeftRight size={14} />
                    Swap
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'other' && (
          <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
            {/* Pinned search & subject controls */}
            <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-white/5 space-y-2.5 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Chapter, topic ya faculty search karein..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl text-[12.5px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {distinctSubjects.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSubject(s)}
                    className={`min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      selectedSubject === s
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates scrollable list with single sleek scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 scrollbar-thin">
              {candidateLectures.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-[12.5px]">
                  Koi lecture nahi mila. Search query ya subject filter change karein.
                </div>
              ) : (
                candidateLectures.map((cand) => {
                  const cSubj = getSubjectColor(cand.subject);
                  const candDate = cand.resolvedDate || cand.newStudyDate;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => handleOtherSwap(cand.id)}
                      className="w-full min-h-[52px] p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500 bg-white dark:bg-white/5 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 text-left transition-all flex items-center gap-3 group active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${cSubj.badge} ${cSubj.dark}`}>
                            {cand.subject}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDateShort(candDate)} • Slot {cand.slot}
                          </span>
                        </div>
                        <p className="text-[12.5px] font-semibold text-gray-900 dark:text-white truncate">
                          {cand.topic}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {cand.chapterName} • Lec {cand.lectureNumber}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[11px] font-semibold text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                        <ArrowLeftRight size={13} />
                        Swap
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {hasOverride && (
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Is lecture par manual adjustment active hai
            </span>
            <button
              onClick={handleReset}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={12} />
              Reset to Original
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
