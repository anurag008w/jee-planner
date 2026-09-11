import { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import { Search, X, ArrowRight } from 'lucide-react';
import { getSubjectColor, getBranchColor } from '../utils/helpers';

export default function SearchModal() {
  const { setSearchOpen, setSelectedLecture, lectures, completions } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const q = query.toLowerCase().trim();
  const results = q.length >= 2
    ? lectures.filter(l =>
        l.chapterName.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) ||
        l.facultyName.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.chemistryBranch.toLowerCase().includes(q) ||
        String(l.lectureNumber).includes(q)
      ).map(l => ({ ...l, status: completions[l.id] || 'not_started' }))
    : [];

  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.subject]) grouped[r.subject] = [];
    grouped[r.subject].push(r);
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
      onClick={() => setSearchOpen(false)}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search lectures"
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1e1f32] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search lectures, chapters, faculty, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="btn-icon -m-1.5">
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin p-2">
          {q.length < 2 ? (
            <div className="py-12 text-center text-[13px] text-gray-400 dark:text-gray-500">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-gray-400 dark:text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([subject, subjectLectures]) => (
              <div key={subject} className="mb-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {subject} ({subjectLectures.length})
                </div>
                {subjectLectures.slice(0, 12).map((l) => {
                  const subjectColor = getSubjectColor(l.subject);
                  const branchColor = l.chemistryBranch ? getBranchColor(l.chemistryBranch) : null;
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedLecture(l); setSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${l.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : `${subjectColor.badge} ${subjectColor.dark}`}`}>
                        L{l.lectureNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                          {l.topic}
                        </p>
                        <p className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                          {l.chapterName} • {l.facultyName}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}