import React from 'react';
import {
  UsersRound,
  Grid,
  Hash,
  Maximize2,
  Download,
  RotateCw,
  Sparkles
} from 'lucide-react';

export default function GroupConfigToolbar({
  mode,
  onModeChange,
  targetValue,
  onTargetValueChange,
  totalParticipants,
  onGenerate,
  onExport,
  onOpenPresentation,
  hasGroups,
  isGenerating,
  namingTheme = 'standard',
  onNamingThemeChange
}) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Mode selection: By Group Count vs By Group Size */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onModeChange('count')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            mode === 'count'
              ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Number of Groups</span>
        </button>

        <button
          onClick={() => onModeChange('size')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            mode === 'size'
              ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>People Per Group</span>
        </button>
      </div>

      {/* Team Naming Theme */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Names:
        </span>
        <select
          value={namingTheme}
          onChange={(e) => onNamingThemeChange && onNamingThemeChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141D] text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
        >
          <option value="standard">Team A, B, C...</option>
          <option value="gospel">Gospels (Matthew, Mark...)</option>
          <option value="virtues">Virtues (Faith, Hope, Joy...)</option>
          <option value="apostles">Apostles & Saints</option>
          <option value="stars">Stars & Constellations</option>
        </select>
      </div>

      {/* Target Stepper */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {mode === 'count' ? 'Groups to create:' : 'Members per group:'}
        </span>
        <div className="flex items-center gap-1.5">
          {[2, 3, 4, 6].map((num) => (
            <button
              key={num}
              onClick={() => onTargetValueChange(num)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                targetValue === num
                  ? 'bg-[#635BFF] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {num}
            </button>
          ))}
          <input
            type="number"
            min="2"
            max={totalParticipants}
            value={targetValue}
            onChange={(e) => onTargetValueChange(Math.max(2, Math.min(totalParticipants, Number(e.target.value) || 2)))}
            className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-bold text-center text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasGroups && (
          <>
            <button
              onClick={onOpenPresentation}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Fullscreen Classroom Presentation Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={onExport}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export group assignments to Excel"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </>
        )}

        <button
          onClick={onGenerate}
          disabled={isGenerating || totalParticipants === 0}
          className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-xs shadow-md shadow-[#635BFF]/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <UsersRound className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating...' : hasGroups ? 'Regenerate Groups' : 'Create Groups'}</span>
        </button>
      </div>
    </div>
  );
}
