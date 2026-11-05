import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  UserMinus,
  RefreshCw,
  Clock,
  Award,
  BookOpen,
  ChevronDown,
  Check
} from 'lucide-react';
import { TASK_PACKS } from '../../utils/taskBank';

function StylishTaskPackDropdown({ value, onChange, packs }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = packs.find(p => p.id === value) || packs[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:border-purple-300 dark:hover:border-purple-700 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500/25"
      >
        <span className="truncate text-left">
          {selected?.name} <span className="text-[11px] font-normal text-purple-600 dark:text-purple-400">({selected?.tasks?.length} tasks)</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-white dark:bg-[#181B26] border border-purple-200 dark:border-purple-800 shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
          {packs.map((pack) => {
            const isMatch = pack.id === value;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  onChange(pack.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isMatch
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 hover:text-purple-900 dark:hover:text-purple-200'
                }`}
              >
                <div className="flex flex-col">
                  <span>{pack.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                    {pack.tasks.length} tasks
                  </span>
                </div>
                {isMatch && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  onSelectTaskPack,
  isSpecialEvent = false
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
        <span>
          {isSpinning
            ? 'Spinning...'
            : eligibleCount === 1
            ? 'Select Final Participant'
            : assignTaskMode
            ? 'Spin for Student & Task 🎯'
            : 'Spin The Wheel'}
        </span>
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
        {/* Student Task / Challenge Assignment Mode Toggle (Hidden for Special Events) */}
        {!isSpecialEvent && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-900/60 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Student Task & Mission Mode
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
                <StylishTaskPackDropdown
                  value={selectedTaskPack}
                  onChange={onSelectTaskPack}
                  packs={TASK_PACKS}
                />
              </div>
            )}
          </div>
        )}

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
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Celebratory Animations</p>
              <p className="text-[10px] text-gray-400">Visual effects on reveal</p>
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
            {[3, 5, 8, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onChangeDuration(sec)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  duration === sec
                    ? 'bg-[#635BFF] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
