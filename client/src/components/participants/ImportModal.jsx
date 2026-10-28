import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { downloadSampleTemplate, parseSpreadsheetFile } from '../../utils/excelUtils';

export default function ImportModal({ isOpen, onClose, onImportComplete, existingParticipants = [] }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  
  // Parsed workbook state
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);

  // Column Mappings
  const [nameCol, setNameCol] = useState('');
  const [idCol, setIdCol] = useState('');
  const [categoryCol, setCategoryCol] = useState('');

  // Conflict options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setParsing(false);
    setParseError('');
    setSheetNames([]);
    setSelectedSheet('');
    setRawRows([]);
    setHeaders([]);
    setNameCol('');
    setIdCol('');
    setCategoryCol('');
    setImportSummary(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setParseError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    try {
      setFile(selectedFile);
      setParsing(true);
      setParseError('');

      const result = await parseSpreadsheetFile(selectedFile);
      setSheetNames(result.sheetNames);

      const firstSheet = result.sheetNames[0];
      setSelectedSheet(firstSheet);
      const rows = result.sheets[firstSheet] || [];
      setRawRows(rows);

      if (rows.length === 0) {
        setParseError('The selected spreadsheet appears to be empty.');
        setParsing(false);
        return;
      }

      // Extract headers from keys of the first row
      const detectedHeaders = Object.keys(rows[0]);
      setHeaders(detectedHeaders);

      // Smart auto-detection of column headers
      const lowerHeaders = detectedHeaders.map(h => ({ original: h, lower: h.toLowerCase() }));
      
      const foundName = lowerHeaders.find(h =>
        h.lower.includes('name') || h.lower.includes('student') || h.lower.includes('participant') || h.lower.includes('full')
      );
      if (foundName) setNameCol(foundName.original);
      else setNameCol(detectedHeaders[0]);

      const foundId = lowerHeaders.find(h =>
        h.lower.includes('id') || h.lower.includes('code') || h.lower.includes('ticket') || h.lower.includes('roll')
      );
      if (foundId) setIdCol(foundId.original);

      const foundCat = lowerHeaders.find(h =>
        h.lower.includes('dept') || h.lower.includes('department') || h.lower.includes('group') || h.lower.includes('class') || h.lower.includes('category')
      );
      if (foundCat) setCategoryCol(foundCat.original);

      setStep(2);
    } catch (err) {
      setParseError(err.message || 'Failed to read spreadsheet.');
    } finally {
      setParsing(false);
    }
  };

  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    // Reload rows for new sheet
    parseSpreadsheetFile(file).then(res => {
      const rows = res.sheets[newSheet] || [];
      setRawRows(rows);
      if (rows.length > 0) {
        setHeaders(Object.keys(rows[0]));
      }
    });
  };

  // Compute validation stats
  const computeStats = () => {
    let validCount = 0;
    let emptyCount = 0;
    let duplicateCount = 0;
    const seenNames = new Set(existingParticipants.map(p => p.name.toLowerCase()));

    rawRows.forEach(row => {
      const val = row[nameCol];
      if (!val || String(val).trim() === '') {
        emptyCount++;
      } else {
        const cleanName = String(val).trim().toLowerCase();
        if (seenNames.has(cleanName)) {
          duplicateCount++;
        }
        seenNames.add(cleanName);
        validCount++;
      }
    });

    return { validCount, emptyCount, duplicateCount };
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    const existingSet = new Set(existingParticipants.map(p => p.name.toLowerCase()));
    const finalItems = [];

    rawRows.forEach(row => {
      const nameVal = row[nameCol];
      if (!nameVal || String(nameVal).trim() === '') return;

      const trimmedName = String(nameVal).trim();
      const lower = trimmedName.toLowerCase();

      if (skipDuplicates && existingSet.has(lower)) {
        return;
      }
      existingSet.add(lower);

      finalItems.push({
        name: trimmedName,
        external_identifier: idCol ? String(row[idCol] || '').trim() : '',
        metadata: {
          department: categoryCol ? String(row[categoryCol] || '').trim() : ''
        }
      });
    });

    const summary = {
      totalImported: finalItems.length,
      skippedCount: rawRows.length - finalItems.length
    };

    setImportSummary(summary);
    setImporting(false);
    setStep(4);

    if (onImportComplete) {
      await onImportComplete(finalItems);
    }
  };

  const stats = step >= 2 ? computeStats() : { validCount: 0, emptyCount: 0, duplicateCount: 0 };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 dark:text-white">Import Participants</h2>
              <p className="text-[11px] text-gray-400">Step {step} of 4 — {
                step === 1 ? 'Choose File' : step === 2 ? 'Map Columns' : step === 3 ? 'Review & Confirm' : 'Completed'
              }</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: UPLOAD FILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#635BFF] dark:hover:border-[#635BFF] rounded-2xl bg-gray-50/50 dark:bg-[#141722] flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Click to upload or drag and drop spreadsheet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </div>

              {parseError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Template Download Section */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141722] border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Need a sample format?</p>
                    <p className="text-[11px] text-gray-400">Download a pre-formatted Excel template with sample columns</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-xs font-semibold text-[#635BFF] flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & PREVIEW */}
          {step === 2 && (
            <div className="space-y-5">
              {sheetNames.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Select Worksheet
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs text-gray-900 dark:text-white"
                  >
                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Column Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Participant Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white"
                  >
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Student / ID Code
                  </label>
                  <select
                    value={idCol}
                    onChange={(e) => setIdCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white"
                  >
                    <option value="">(None)</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Group / Department
                  </label>
                  <select
                    value={categoryCol}
                    onChange={(e) => setCategoryCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white"
                  >
                    <option value="">(None)</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Live Preview Table */}
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preview of Parsed Rows (First 5 records):
                </p>
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-[#141722] text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">ID / Code</th>
                        <th className="px-4 py-2.5">Group / Dept</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                            {row[nameCol] || <span className="text-gray-400 italic">(empty)</span>}
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            {idCol ? row[idCol] || '—' : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            {categoryCol ? row[categoryCol] || '—' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Total detected rows in file: {rawRows.length}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFLICTS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-center">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.validCount}</p>
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">Valid Names</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-center">
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.duplicateCount}</p>
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mt-0.5">Duplicate Names</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-2xl font-black text-gray-600 dark:text-gray-300">{stats.emptyCount}</p>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">Empty (Skipped)</p>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#141722] border border-gray-200 dark:border-gray-800 space-y-2">
                <p className="text-xs font-bold text-gray-900 dark:text-white">Handling Duplicate Names:</p>
                <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 text-[#635BFF] rounded"
                  />
                  <span>Skip names that are already present in this event</span>
                </label>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ready to import into this event workspace. Existing historical draw results will not be affected.
              </p>
            </div>
          )}

          {/* STEP 4: SUCCESS SUMMARY */}
          {step === 4 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Complete!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                Successfully imported <strong className="text-emerald-600 dark:text-emerald-400">{importSummary?.totalImported}</strong> participants into your event roster.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {step < 4 && (
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!nameCol}
                className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{importing ? 'Importing...' : 'Confirm & Add Participants'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Done & View Roster
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
