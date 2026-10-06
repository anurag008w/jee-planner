import { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { formatDateShort } from '../utils/helpers';
import {
  X, Layers, Star, Check, Plus, Copy, Trash2, Edit3, Download, Upload,
  Calendar, BookOpen, AlertCircle, Sparkles, CheckCircle2, ChevronRight, Lock,
  ChevronDown, ChevronUp,
} from 'lucide-react';

export const AI_BATCH_MASTER_PROMPT = `Act as an expert curriculum and scheduling data engineer. Generate a strict, 100% valid JSON batch structure for our JEE / NEET / Board study planner engine.

OUTPUT REQUIREMENTS:
1. Output ONLY the raw JSON object (or in a \`\`\`json markdown block). No conversational filler or trailing text.
2. The JSON structure MUST follow this exact schema:

{
  "name": "Target Exam / Batch Name (e.g. Prayas 2026 / NEET Dropper 2026 / Foundation 2026)",
  "dashboard": {
    "title": "Batch Name",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "settings": {
    "startDate": "YYYY-MM-DD",
    "holidays": []
  },
  "foundations": {
    "Physics": [
      {
        "id": "p-1",
        "name": "Basic Mathematics & Vectors",
        "priority": "High",
        "hours": 6,
        "reason": "Used in Mechanics, Electrostatics, and Magnetism"
      }
    ],
    "Chemistry": [
      {
        "id": "c-1",
        "name": "Chemical Bonding & Mole Concept",
        "priority": "High",
        "hours": 8,
        "reason": "Prerequisite for Organic & Inorganic reactions"
      }
    ]
  },
  "chapterPairing": {
    "Electrostatics": {
      "base": "Gravitation & Vectors (Class 11)",
      "sessions": "2 sessions (field mapping & conservative force)",
      "treatment": "Revise field & potential from Gravitation before Gauss Law"
    }
  },
  "lectures": [
    {
      "id": 1001,
      "newStudyDate": "YYYY-MM-DD",
      "day": "Monday",
      "phase": "Phase 1",
      "slot": 1,
      "subject": "Physics",
      "chemistryBranch": "",
      "chapterName": "Electrostatics",
      "topic": "Coulomb's Law and Electric Field",
      "lectureNumber": 1,
      "facultyName": "Teacher Name",
      "base": "Vectors & Gravitation (Class 11)",
      "sessions": "2 sessions",
      "treatment": "Revise inverse-square law beforehand"
    }
  ]
}

DATA RULES & ENGINE SPECIFICATIONS:
- DYNAMIC MULTI-SUBJECT: Supports 3, 4, 5, or more subjects (e.g., Physics, Chemistry, Mathematics, Biology, Zoology, Botany, English, Computer Science, etc.). Each subject will automatically receive its dedicated cards, progress bars, and filters.
- LECTURES ARRAY:
  - id: integer or unique string.
  - newStudyDate: string formatted as "YYYY-MM-DD".
  - day: Day of week (e.g., "Monday", "Tuesday", etc.).
  - phase: "Phase 1", "Phase 2", "Phase 3", or "Phase 4".
  - slot: integer (1, 2, 3...) indicating slot order for that day.
  - subject: Subject name (e.g., "Physics", "Chemistry", "Mathematics", "Biology", etc.).
  - chemistryBranch: (Optional) "Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry", or blank.
  - chapterName: Name of the chapter.
  - topic: Specific lecture topic name.
  - lectureNumber: Lecture index within that chapter (1, 2, 3...).
  - facultyName: Name of instructor/faculty (or coaching name).
- 11TH BASE / PREREQUISITES:
  - Under each lecture OR under "chapterPairing" at the root, provide "base", "sessions", and "treatment" for class 11 prerequisites.
  - Under "foundations", define key 11th bridge topics per subject with "id", "name", "priority" (High/Medium/Low), "hours", and "reason".
- NO SIZE LIMIT: Feel free to generate the entire syllabus with hundreds of lectures.`;

export default function BatchModal() {
  const {
    batches,
    activeBatchId,
    defaultBatchId,
    setActiveBatch,
    setDefaultBatch,
    addBatch,
    duplicateBatch,
    renameBatch,
    deleteBatch,
    exportBackup,
    setBatchModalOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Batch Form State
  const [newBatchName, setNewBatchName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [makeDefaultOnCreate, setMakeDefaultOnCreate] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const fileInputRef = useRef(null);

  const batchList = Object.values(batches || {});

  const handleCopyPrompt = () => {
    try {
      navigator.clipboard.writeText(AI_BATCH_MASTER_PROMPT);
      setCopiedPrompt(true);
      showFeedback('AI Master Prompt copied to clipboard!');
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      showFeedback('Failed to copy. Please manually copy from preview.', true);
    }
  };

  const showFeedback = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleStartRename = (batch) => {
    setEditingId(batch.id);
    setEditName(batch.name);
  };

  const handleSaveRename = (batchId) => {
    if (!editName.trim()) {
      showFeedback('Batch ka naam khali nahi ho sakta.', true);
      return;
    }
    renameBatch(batchId, editName.trim());
    setEditingId(null);
    showFeedback('Batch ka naam update ho gaya.');
  };

  const handleDelete = (batch) => {
    if (batch.id === 'default' || batch.isInbuilt) {
      showFeedback('Core inbuilt batch delete nahi kiya ja sakta.', true);
      return;
    }
    const confirmDelete = window.confirm(
      `"${batch.name}" batch ko delete karna chahte ho? Iska sara data delete ho jayega.`
    );
    if (!confirmDelete) return;

    try {
      deleteBatch(batch.id);
      showFeedback(`"${batch.name}" batch delete ho gaya.`);
    } catch (err) {
      showFeedback(err.message, true);
    }
  };

  const handleDuplicate = (batch) => {
    duplicateBatch(batch.id);
    showFeedback(`"${batch.name}" duplicate ho gaya aur naya batch open ho gaya.`);
    setBatchModalOpen(false);
  };

  const handleExportSingle = (batch) => {
    const payload = exportBackup(batch.id);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jee-batch-${batch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback(`"${batch.name}" ka JSON export download ho gaya.`);
  };

  const handleDownloadSample = () => {
    const sample = {
      name: 'Sample JEE Batch 2026',
      dashboard: {
        title: 'Sample JEE Batch 2026',
        startDate: '2026-10-01',
        endDate: '2027-01-15',
      },
      lectures: [
        {
          id: 1001,
          newStudyDate: '2026-10-01',
          day: 'Thursday',
          phase: 'Phase 1',
          slot: 1,
          subject: 'Physics',
          chemistryBranch: '',
          chapterName: 'Electrostatics',
          topic: 'Coulomb Law & Field',
          lectureNumber: 1,
          facultyName: 'Physics Faculty',
        },
        {
          id: 1002,
          newStudyDate: '2026-10-01',
          day: 'Thursday',
          phase: 'Phase 1',
          slot: 2,
          subject: 'Mathematics',
          chemistryBranch: '',
          chapterName: 'Determinants',
          topic: 'Properties & Expansions',
          lectureNumber: 1,
          facultyName: 'Maths Faculty',
        },
        {
          id: 1003,
          newStudyDate: '2026-10-02',
          day: 'Friday',
          phase: 'Phase 1',
          slot: 1,
          subject: 'Chemistry',
          chemistryBranch: 'Physical Chemistry',
          chapterName: 'Solutions',
          topic: 'Concentration Terms',
          lectureNumber: 1,
          facultyName: 'Chemistry Faculty',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-jee-batch-template.json';
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Sample template JSON download ho gaya!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        createBatchFromParsed(parsed);
      } catch (err) {
        showFeedback(`File invalid hai: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const createBatchFromParsed = (parsed) => {
    try {
      let candidate = parsed;
      if (parsed.batch) candidate = parsed.batch;

      const lectures = Array.isArray(candidate.lectures)
        ? candidate.lectures
        : Array.isArray(candidate)
        ? candidate
        : null;

      if (!lectures || !lectures.length) {
        throw new Error('JSON me lectures array nahi mila.');
      }

      const name =
        newBatchName.trim() ||
        candidate.name ||
        candidate.dashboard?.title ||
        'Imported JEE Batch';

      const batchData = {
        name,
        lectures,
        dashboard: candidate.dashboard,
        chapterProgress: candidate.chapterProgress,
        settings: candidate.settings,
        completions: candidate.completions || {},
        extraLectureCounts: candidate.extraLectureCounts || {},
        foundations: candidate.foundations || candidate.subjectFoundations || null,
        chapterPairing: candidate.chapterPairing || candidate.chapterPairings || null,
      };

      const newId = `batch-${Date.now()}`;
      batchData.id = newId;

      addBatch(batchData, true);

      if (makeDefaultOnCreate) {
        setDefaultBatch(newId);
      }

      showFeedback(`"${name}" batch successfully add ho gaya!`);
      setActiveTab('list');
      setNewBatchName('');
      setJsonText('');
    } catch (err) {
      showFeedback(`Batch add karne me error: ${err.message}`, true);
    }
  };

  const handleCreateFromText = () => {
    if (!jsonText.trim()) {
      showFeedback('Kripya JSON paste karein ya file upload karein.', true);
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      createBatchFromParsed(parsed);
    } catch (err) {
      showFeedback(`JSON invalid hai: ${err.message}`, true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => setBatchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1a1c2b] rounded-2xl shadow-2xl border border-[var(--color-border)] dark:border-[#2c2f40] flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] dark:border-[#2c2f40] flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/[.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white grid place-items-center shadow-lg shadow-indigo-500/20">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                JEE Batches Manager
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {batchList.length} {batchList.length === 1 ? 'Batch' : 'Batches'}
                </span>
              </h2>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                Switch batches, set your default batch, or add new study batches.
              </p>
            </div>
          </div>
          <button
            onClick={() => setBatchModalOpen(false)}
            className="btn-icon tap-target text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close batch modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--color-border)] dark:border-[#2c2f40] px-4 bg-gray-50/30 dark:bg-white/[.01]">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            My Batches ({batchList.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Plus size={14} /> Add New Batch
          </button>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {batchList.map((batch) => {
                const isActive = batch.id === activeBatchId;
                const isDefault = batch.id === defaultBatchId;
                const totalLec = batch.lectures?.length || 0;
                const completedCount = Object.values(batch.completions || {}).filter(
                  (v) => v === 'completed'
                ).length;
                const pct = totalLec ? Math.round((completedCount / totalLec) * 100) : 0;
                const isEditing = editingId === batch.id;

                return (
                  <div
                    key={batch.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/15 shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#1f2235] hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Batch Info / Edit title */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="field text-sm font-semibold py-1 px-2.5 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(batch.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveRename(batch.id)}
                              className="btn btn-primary px-3 py-1 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn btn-ghost px-2 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                              {batch.name}
                            </h3>
                            {isActive && (
                              <span className="pill bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px] font-bold">
                                Active Now
                              </span>
                            )}
                            {isDefault && (
                              <span className="pill bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <Star size={11} className="fill-amber-500 text-amber-500" /> Default
                              </span>
                            )}
                            {(batch.id === 'default' || batch.isInbuilt) && (
                              <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1">
                                <Lock size={10} className="text-slate-500" /> Core Inbuilt ({totalLec})
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11.5px] text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <BookOpen size={13} className="text-indigo-500" />
                            {totalLec} lectures ({completedCount} done • {pct}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-purple-500" />
                            {formatDateShort(batch.settings?.startDate || batch.dashboard?.startDate || '2026-09-11')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                        {!isActive ? (
                          <button
                            onClick={() => {
                              setActiveBatch(batch.id);
                              setBatchModalOpen(false);
                            }}
                            className="btn btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
                            title="Switch to this batch"
                          >
                            Switch <ChevronRight size={13} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2.5 py-1">
                            <Check size={14} /> Open
                          </span>
                        )}

                        {!isDefault && (
                          <button
                            onClick={() => {
                              setDefaultBatch(batch.id);
                              showFeedback(`"${batch.name}" ab default batch ban gaya hai.`);
                            }}
                            className="btn btn-secondary px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
                            title="Set as Default (App starts with this batch)"
                          >
                            <Star size={13} /> Set Default
                          </button>
                        )}

                        <button
                          onClick={() => handleStartRename(batch)}
                          className="btn-icon p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          title="Rename batch"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(batch)}
                          className="btn-icon p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          title="Duplicate batch"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => handleExportSingle(batch)}
                          className="btn-icon p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          title="Export this batch JSON"
                        >
                          <Download size={14} />
                        </button>

                        {batch.id !== 'default' && !batch.isInbuilt && (
                          <button
                            onClick={() => handleDelete(batch)}
                            className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete this custom batch"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-900/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Sparkles size={15} />
                  100% Full Schedule Engine Support
                </div>
                <p className="text-[11.5px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                  Har naya batch existing schedule rules automatically follow karega: Daily caps (Phase 1: 2, Phase 2: 3, Phase 3: 4, Phase 4: 5), Max 2 lectures per subject, Sunday/Holidays off-shifts, backlog recovery, aur extra lectures counter!
                </p>
              </div>

              {/* Upload JSON file */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[.02] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Upload size={14} className="text-indigo-500" />
                    Option 1: Upload Batch JSON
                  </h4>
                  <button
                    onClick={handleDownloadSample}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Download size={12} /> Download Sample Template
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Kisi bhi JSON file ko choose karo jisme lectures ka array ho (jaise Prayas, Lakshya, Arjuna ya custom batch).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary px-3.5 py-2 text-xs flex items-center gap-2"
                  >
                    <Upload size={14} /> Select JSON File
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makeDefaultOnCreate}
                      onChange={(e) => setMakeDefaultOnCreate(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Is batch ko default banao
                  </label>
                </div>
              </div>

              {/* Paste JSON */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[.02] space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Edit3 size={14} className="text-indigo-500" />
                  Option 2: Paste JSON Directly
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Batch Name (Optional, e.g. Prayas 2.0)"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    className="field text-xs py-2"
                  />
                  <textarea
                    rows={6}
                    placeholder={`Paste batch JSON yahan karo, e.g.:\n{\n  "name": "Prayas 2.0",\n  "lectures": [ ... ]\n}`}
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    className="field text-xs font-mono py-2 w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCreateFromText}
                    className="btn btn-secondary px-3.5 py-2 text-xs font-semibold"
                  >
                    Create Batch from JSON
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makeDefaultOnCreate}
                      onChange={(e) => setMakeDefaultOnCreate(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Make Default
                  </label>
                </div>
              </div>

              {/* Option 3: AI Prompt Generator */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    Option 3: AI Master Prompt Generator (ChatGPT / Claude / Gemini)
                  </h4>
                  <button
                    onClick={handleCopyPrompt}
                    className="btn px-3 py-1.5 text-xs flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check size={13} /> Prompt Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy AI Master Prompt
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11.5px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  Apne custom coaching batch (Prayas, Lakshya, Arjuna, Allen, NEET, etc.) ka 100% engine-compliant JSON banwane ke liye is prompt ko copy karein aur ChatGPT, Claude, ya Gemini me paste karein.
                </p>

                <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                    ✓ Supports 3, 4, 5+ subjects • ✓ 11th Base & Foundations • ✓ Zero size limit
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {showPromptPreview ? (
                      <>
                        Hide Prompt <ChevronUp size={13} />
                      </>
                    ) : (
                      <>
                        Preview Prompt <ChevronDown size={13} />
                      </>
                    )}
                  </button>
                </div>

                {showPromptPreview && (
                  <div className="mt-2 relative animate-fadeIn">
                    <pre className="p-3 rounded-lg bg-gray-900 text-gray-200 text-[10.5px] font-mono overflow-x-auto max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-800">
                      {AI_BATCH_MASTER_PROMPT}
                    </pre>
                    <button
                      onClick={handleCopyPrompt}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded bg-purple-600/90 hover:bg-purple-600 text-white text-[10.5px] flex items-center gap-1 shadow font-medium"
                    >
                      {copiedPrompt ? <Check size={11} /> : <Copy size={11} />}
                      {copiedPrompt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--color-border)] dark:border-[#2c2f40] flex items-center justify-between bg-gray-50/50 dark:bg-white/[.02] text-xs">
          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
            Default batch app open hone par apne aap load hota hai.
          </span>
          <button
            onClick={() => setBatchModalOpen(false)}
            className="btn btn-secondary px-4 py-1.5 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
