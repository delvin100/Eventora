import React from 'react';
import {
  Shuffle,
  Dice5,
  ListOrdered,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ShuffleToolbar({
  mode,
  onModeChange,
  pickCount,
  onPickCountChange,
  maxCount,
  onExecute,
  onReset,
  onExport,
  hasResults,
  isShuffling
}) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Mode selection */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onModeChange('order')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            mode === 'order'
              ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
              : 'bg-gray-100 dark:bg-[#1E2235] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#282D44] hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Full Order Shuffle</span>
        </button>

        <button
          onClick={() => onModeChange('pick')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            mode === 'pick'
              ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
              : 'bg-gray-100 dark:bg-[#1E2235] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#282D44] hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Dice5 className="w-4 h-4" />
          <span>Pick N Random</span>
        </button>
      </div>

      {/* Pick count if in pick mode */}
      {mode === 'pick' && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            Pick Count:
          </span>
          <div className="flex items-center gap-1">
            {[1, 3, 5].map((cnt) => (
              <button
                key={cnt}
                disabled={cnt > maxCount}
                onClick={() => onPickCountChange(cnt)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pickCount === cnt
                    ? 'bg-[#635BFF] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#1E2235] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#282D44] hover:text-gray-900 dark:hover:text-white disabled:opacity-30'
                }`}
              >
                {cnt}
              </button>
            ))}
            <input
              type="number"
              min="1"
              max={maxCount}
              value={pickCount}
              onChange={(e) => onPickCountChange(Math.max(1, Math.min(maxCount, Number(e.target.value) || 1)))}
              className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-bold text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {hasResults && (
          <>
            <button
              onClick={onReset}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#1E2235] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Reset to original list order"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onExport}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#1E2235] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export results"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </>
        )}

        <button
          onClick={onExecute}
          disabled={isShuffling || maxCount === 0}
          className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-xs shadow-md shadow-[#635BFF]/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
          <span>{isShuffling ? 'Shuffling...' : mode === 'order' ? 'Shuffle Entire List' : `Pick ${pickCount} Winners`}</span>
        </button>
      </div>
    </div>
  );
}
