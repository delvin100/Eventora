import React from 'react';
import {
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  UserMinus,
  RefreshCw,
  Clock,
  Award,
  BookOpen
} from 'lucide-react';
import { TASK_PACKS } from '../../utils/taskBank';

export default function WheelControls({
  isSpinning,
  onSpin,
  soundEnabled,
  onToggleSound,
  celebrationEnabled,
  onToggleCelebration,
  removeWinner,
  onToggleRemoveWinner,
  duration,
  onChangeDuration,
  onResetParticipants,
  removedCount = 0,
  eligibleCount = 0,
  assignTaskMode = false,
  onToggleAssignTaskMode,
  selectedTaskPack = 'catechism_faith',
  onSelectTaskPack
}) {
  return (
    <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Primary Spin Action */}
      <button
        onClick={onSpin}
        disabled={isSpinning || eligibleCount === 0}
        className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-bold text-base shadow-lg shadow-[#635BFF]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
        <span>{isSpinning ? 'Spinning...' : assignTaskMode ? 'Spin for Student & Task 🎯' : 'Spin The Wheel'}</span>
      </button>

      {/* Roster & Exclusions info */}
      <div className="flex items-center justify-between text-xs pb-3 border-b border-gray-100 dark:border-gray-800">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {eligibleCount} {eligibleCount === 1 ? 'Person' : 'People'} on Wheel
        </span>
        {removedCount > 0 && (
          <button
            onClick={onResetParticipants}
            className="text-xs font-semibold text-[#635BFF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset {removedCount} Removed</span>
          </button>
        )}
      </div>

      {/* Settings Grid */}
      <div className="space-y-3">
        {/* Student Task / Challenge Assignment Mode Toggle */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-900/60 space-y-2.5">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>Student Task & Mission Mode</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-purple-200 dark:bg-purple-900/60 text-[9px] font-extrabold text-purple-800 dark:text-purple-200">
                    NEW
                  </span>
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Assigns an uplifting task or question to the selected student
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={assignTaskMode}
              onChange={(e) => onToggleAssignTaskMode && onToggleAssignTaskMode(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </label>

          {assignTaskMode && (
            <div className="pt-2 border-t border-purple-200/50 dark:border-purple-900/40 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Activity / Mission Bank:
              </span>
              <select
                value={selectedTaskPack}
                onChange={(e) => onSelectTaskPack && onSelectTaskPack(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                {TASK_PACKS.map(pack => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} ({pack.tasks.length} tasks)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Remove Winner Toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-[#141722] border border-gray-200/60 dark:border-gray-800 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <UserMinus className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Fair Turn Rotation</p>
              <p className="text-[10px] text-gray-400">Removes selected student so everyone gets a turn</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={removeWinner}
            onChange={(e) => onToggleRemoveWinner(e.target.checked)}
            className="w-4 h-4 text-[#635BFF] rounded"
          />
        </label>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-[#141722] border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Ticker Sound</p>
              <p className="text-[10px] text-gray-400">Audio feedback as segments rotate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              soundEnabled
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {soundEnabled ? 'ON' : 'MUTED'}
          </button>
        </div>

        {/* Confetti Celebration Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-[#141722] border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Celebratory Confetti</p>
              <p className="text-[10px] text-gray-400">Particle explosion on reveal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCelebration}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              celebrationEnabled
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {celebrationEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Spin Duration Selector */}
        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-[#141722] border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Spin Duration</p>
              <p className="text-[10px] text-gray-400">Length of deceleration curve</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[3, 5, 8].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onChangeDuration(sec)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  duration === sec
                    ? 'bg-[#635BFF] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
