import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Layers,
  HelpCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Target,
  ChevronDown,
  Check
} from 'lucide-react';
import { parseQuizExcel } from '../../utils/quizExcelParser';
import { downloadQuizExcelTemplate, downloadSingleRoundExcelTemplate } from '../../utils/quizExcelTemplate';

export default function QuizExcelImportModal({
  isOpen,
  onClose,
  onImport,
  targetRoundNumber = null,
  currentRoundsCount = 1
}) {
  if (!isOpen) return null;

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [importing, setImporting] = useState(false);

  // Scope: 'single' (import into one specific round) or 'all' (multi-round import)
  const [importScope, setImportScope] = useState(targetRoundNumber ? 'single' : 'all');
  const [selectedRound, setSelectedRound] = useState(targetRoundNumber || 1);
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'append'
  const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);
  const roundDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (roundDropdownRef.current && !roundDropdownRef.current.contains(e.target)) {
        setIsRoundDropdownOpen(false);
      }
    }
    if (isRoundDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isRoundDropdownOpen]);

  useEffect(() => {
    if (targetRoundNumber) {
      setImportScope('single');
      setSelectedRound(targetRoundNumber);
    } else {
      setImportScope('all');
    }
  }, [targetRoundNumber, isOpen]);

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setParsedData(null);
    setErrors([]);
    setWarnings([]);
    setImportMode('replace');
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const runParse = async (selectedFile, scope, roundNum) => {
    setParsing(true);
    setErrors([]);
    setWarnings([]);
    setParsedData(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const parseOptions = scope === 'single'
        ? { forceRoundNumber: roundNum, defaultRoundNumber: roundNum }
        : { defaultRoundNumber: 1 };

      const result = await parseQuizExcel(buffer, parseOptions);

      if (result.success && result.rounds.length > 0) {
        setParsedData(result);
        setWarnings(result.warnings || []);
      } else {
        setErrors(result.errors.length > 0 ? result.errors : ['Could not extract any questions from this file.']);
        setWarnings(result.warnings || []);
      }
    } catch (err) {
      console.error('Failed to parse file:', err);
      setErrors([err.message || 'An unexpected error occurred while parsing the spreadsheet.']);
    } finally {
      setParsing(false);
    }
  };

  const handleFileSelected = (selectedFile) => {
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      setErrors(['Please select an Excel (.xlsx, .xls) or CSV (.csv) file.']);
      return;
    }

    setFile(selectedFile);
    runParse(selectedFile, importScope, selectedRound);
  };

  const handleScopeChange = (newScope) => {
    setImportScope(newScope);
    if (file) {
      runParse(file, newScope, selectedRound);
    }
  };

  const handleRoundChange = (newRound) => {
    const num = Math.max(1, parseInt(newRound, 10) || 1);
    setSelectedRound(num);
    if (file && importScope === 'single') {
      runParse(file, 'single', num);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !parsedData.rounds || parsedData.rounds.length === 0) return;

    setImporting(true);
    try {
      await onImport({
        rounds: parsedData.rounds,
        mode: importMode,
        scope: importScope,
        targetRoundNumber: importScope === 'single' ? selectedRound : null
      });
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      setErrors([err.message || 'Failed to apply imported questions.']);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl bg-white dark:bg-[#161925] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {importScope === 'single'
                  ? `Import Questions into Round ${selectedRound}`
                  : 'Import Entire Quiz via Excel'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {importScope === 'single'
                  ? `Upload questions, options, and answers specifically for Round ${selectedRound}`
                  : 'Bulk create all rounds, questions, options, and intro media from a single file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selector: Single Round vs All Rounds */}
        <div className="p-1 rounded-2xl bg-gray-100 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScopeChange('single')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importScope === 'single'
                ? 'bg-white dark:bg-[#1E2235] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-violet-500" />
            <span>Single Round (Round {selectedRound})</span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange('all')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importScope === 'all'
                ? 'bg-white dark:bg-[#1E2235] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>All Rounds (Full Multi-Round Sheet)</span>
          </button>
        </div>

        {/* If Single Round: Pick which round */}
        {importScope === 'single' && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 text-xs">
            <span className="font-bold text-gray-800 dark:text-gray-200">
              Target Round:
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Import questions into:</span>
              <div className="relative" ref={roundDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsRoundDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center justify-between gap-3 px-3 py-1.5 min-w-[125px] rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-[#161925] hover:bg-violet-50/50 dark:hover:bg-violet-950/30 text-xs font-black text-violet-700 dark:text-violet-300 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <span>Round {selectedRound}</span>
                  <div className="w-5 h-5 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-violet-600 dark:text-violet-300 transition-transform duration-200 ${
                        isRoundDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isRoundDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100/50 dark:divide-gray-800/50">
                    {Array.from(
                      { length: Math.max(currentRoundsCount, selectedRound, 5) },
                      (_, i) => i + 1
                    ).map((rNum) => {
                      const isSelected = rNum === Number(selectedRound);
                      return (
                        <button
                          key={rNum}
                          type="button"
                          onClick={() => {
                            handleRoundChange(rNum);
                            setIsRoundDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-violet-400 dark:bg-violet-600'
                              }`}
                            />
                            Round {rNum}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Template Download Callout */}
        <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>
                {importScope === 'single'
                  ? `Need Round ${selectedRound} Template?`
                  : 'Need All Rounds Template?'}
              </span>
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              {importScope === 'single'
                ? `Simple template for Round ${selectedRound} without needing round number columns.`
                : 'Comprehensive template supporting all rounds, media, and question types.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              importScope === 'single'
                ? downloadSingleRoundExcelTemplate(selectedRound)
                : downloadQuizExcelTemplate()
            }
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1D2132] border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {importScope === 'single'
                ? `Download Round ${selectedRound} Template`
                : 'Download All Rounds Template'}
            </span>
          </button>
        </div>

        {/* Upload Drop Zone */}
        {!parsedData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#635BFF] dark:hover:border-[#635BFF] rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-[#12141F] transition-all cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />

            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center">
              {parsing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {parsing
                  ? 'Reading and validating spreadsheet...'
                  : importScope === 'single'
                  ? `Click or drop Excel/CSV file for Round ${selectedRound} here`
                  : 'Click or drop Excel/CSV file for All Rounds here'}
              </p>
              <p className="text-[11px] text-gray-400">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
              </p>
            </div>
          </div>
        )}

        {/* Errors Alert */}
        {errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not import spreadsheet:</span>
            </div>
            <ul className="list-disc list-inside text-xs text-rose-600 dark:text-rose-400 space-y-1 pl-1">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setParsedData(null);
                setFile(null);
                setErrors([]);
              }}
              className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300 underline cursor-pointer"
            >
              Try another file
            </button>
          </div>
        )}

        {/* Warnings Alert */}
        {warnings.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Warnings ({warnings.length}):</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] pl-5 list-disc">
              {warnings.map((w, idx) => (
                <div key={idx}>• {w}</div>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Preview */}
        {parsedData && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* File info bar */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[280px]">
                  {file?.name}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({(file?.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsedData(null);
                  setFile(null);
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-violet-50/50 dark:bg-[#12141F] border border-violet-100 dark:border-gray-800 text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  {importScope === 'single' ? 'Target' : 'Rounds Detected'}
                </span>
                <span className="text-lg font-black text-violet-600 dark:text-violet-400">
                  {importScope === 'single' ? `Round ${selectedRound}` : parsedData.rounds.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-[#12141F] border border-emerald-100 dark:border-gray-800 text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Total Questions</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {parsedData.totalQuestions}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-[#12141F] border border-amber-100 dark:border-gray-800 text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Media Links</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {parsedData.rounds.reduce(
                    (acc, r) => acc + (r.introMediaUrl ? 1 : 0) + r.questions.filter((q) => q.mediaUrl).length,
                    0
                  )}
                </span>
              </div>
            </div>

            {/* Import Destination Options */}
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                {importScope === 'single'
                  ? `How to apply to Round ${selectedRound}:`
                  : 'How to apply to the quiz:'}
              </label>

              {importScope === 'single' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-[#635BFF] bg-violet-50/50 dark:bg-violet-950/30 ring-1 ring-[#635BFF]'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Replace Round {selectedRound} Questions
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Replaces existing questions in Round {selectedRound} with {parsedData.totalQuestions} new questions. Other rounds remain untouched.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'append'
                        ? 'border-[#635BFF] bg-violet-50/50 dark:bg-violet-950/30 ring-1 ring-[#635BFF]'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Append to Round {selectedRound}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Adds these {parsedData.totalQuestions} questions to Round {selectedRound} without deleting existing questions.
                    </span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-[#635BFF] bg-violet-50/50 dark:bg-violet-950/30 ring-1 ring-[#635BFF]'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Replace Entire Quiz
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Overwrites all current rounds & questions with the new file.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'append'
                        ? 'border-[#635BFF] bg-violet-50/50 dark:bg-violet-950/30 ring-1 ring-[#635BFF]'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Append as Additional Rounds
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Keeps existing {currentRoundsCount} rounds and adds new rounds after them.
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parsedData || importing || parsedData.rounds.length === 0}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all shadow-md shadow-[#635BFF]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Questions...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirm & Apply (
                  {importScope === 'single'
                    ? `${parsedData?.totalQuestions || 0} Qs into Round ${selectedRound}`
                    : `${parsedData?.totalQuestions || 0} Qs across ${parsedData?.rounds.length || 0} Rounds`}
                  )
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
