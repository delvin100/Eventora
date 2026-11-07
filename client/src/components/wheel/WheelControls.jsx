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
  ChevronRight,
  Check,
  Layers,
  Plus,
  Minus,
  Search,
  X,
  UserCheck,
  Send,
  Users
} from 'lucide-react';
import { TASK_PACKS } from '../../utils/taskBank';

function SearchableParticipantDropdown({
  participants = [],
  selectedParticipant = null,
  onSelectParticipant,
  onSendDirectly,
  disabled = false,
  isEvalLocked = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return p.name?.toLowerCase().includes(q);
  });

  if (participants.length === 0) {
    return (
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center justify-between">
        <span>All participants evaluated in this round</span>
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
          isOpen
            ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/60 ring-2 ring-violet-500/30'
            : 'border-violet-300 dark:border-violet-600/60 bg-white dark:bg-[#131624] hover:border-violet-400 dark:hover:border-violet-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Search className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
          {selectedParticipant ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-gray-900 dark:text-white truncate">
                {selectedParticipant.name}
              </span>
              {selectedParticipant.external_identifier && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/80 text-violet-700 dark:text-violet-300 font-mono shrink-0 font-bold">
                  #{selectedParticipant.external_identifier}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-200 font-medium truncate">
              Select participant from list...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedParticipant && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectParticipant(null);
              }}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-violet-500 dark:text-violet-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-white dark:bg-[#181B26] border border-violet-200 dark:border-violet-800/80 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Filter Input */}
          <div className="px-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#141622] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 px-0.5">
              <span>{filteredParticipants.length} of {participants.length} available</span>
              {searchQuery && (
                <span className="text-violet-500 font-semibold">Filtered</span>
              )}
            </div>
          </div>

          {/* Participant List */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-gray-800/40">
            {filteredParticipants.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No participants match "{searchQuery}"
              </div>
            ) : (
              filteredParticipants.map((p) => {
                const isSelected = selectedParticipant?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectParticipant(p);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-900 dark:text-violet-200 font-bold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-violet-50/50 dark:hover:bg-violet-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold text-[11px] flex items-center justify-center shrink-0 uppercase">
                        {p.name ? p.name.charAt(0) : '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        {p.external_identifier && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
                            #{p.external_identifier}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Select & Next Action inside list */}
                      <button
                        type="button"
                        disabled={isEvalLocked}
                        title="Proceed with this participant"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectParticipant(p);
                          setIsOpen(false);
                          setSearchQuery('');
                          if (onSendDirectly) onSendDirectly(p);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isEvalLocked
                            ? 'opacity-40 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-500'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-xs'
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 ml-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  isSpecialEvent = false,
  eligibleParticipants = [],
  onManualSendToEvaluation = null,
  isEvalLocked = false,
  totalRounds = 2,
  onChangeTotalRounds = null,
  currentRound = 1,
  isAllRoundsCompleted = false
}) {
  const [manualSelectedParticipant, setManualSelectedParticipant] = useState(null);

  // Clear manual selection when participant list changes or is reset
  useEffect(() => {
    if (manualSelectedParticipant) {
      const stillEligible = eligibleParticipants.some(p => p.id === manualSelectedParticipant.id);
      if (!stillEligible) {
        setManualSelectedParticipant(null);
      }
    }
  }, [eligibleParticipants, manualSelectedParticipant]);

  const handleSendManual = () => {
    if (!manualSelectedParticipant || isSpinning || isEvalLocked || isAllRoundsCompleted) return;
    if (onManualSendToEvaluation) {
      onManualSendToEvaluation(manualSelectedParticipant);
      setManualSelectedParticipant(null);
    }
  };

  const handleSendDirectlyFromDropdown = (participant) => {
    if (!participant || isSpinning || isEvalLocked || isAllRoundsCompleted) return;
    if (onManualSendToEvaluation) {
      onManualSendToEvaluation(participant);
      setManualSelectedParticipant(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Primary Spin Action */}
      <button
        onClick={onSpin}
        disabled={isSpinning || eligibleCount === 0 || isAllRoundsCompleted}
        className="w-full py-4 px-6 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-bold text-base shadow-lg shadow-[#635BFF]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
        <span>
          {isAllRoundsCompleted
            ? `All ${totalRounds} Rounds Completed`
            : isSpinning
            ? 'Spinning...'
            : eligibleCount === 1
            ? 'Select Final Participant'
            : assignTaskMode
            ? 'Spin for Student & Task 🎯'
            : 'Spin The Wheel'}
        </span>
      </button>

      {/* SPECIAL EVENT: Manual Participant Dropdown with Filter Search */}
      {isSpecialEvent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A1D2E] border-2 border-violet-300 dark:border-violet-600/70 shadow-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                Select Participant from Dropdown
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-600 text-white shadow-xs">
              {eligibleParticipants.length} Available
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
            {isAllRoundsCompleted
              ? `All ${totalRounds} rounds completed. Please click Finish Event above to conclude.`
              : 'Choose a participant manually to view selection and enter task.'}
          </p>

          {/* Searchable Dropdown */}
          <SearchableParticipantDropdown
            participants={eligibleParticipants}
            selectedParticipant={manualSelectedParticipant}
            onSelectParticipant={setManualSelectedParticipant}
            onSendDirectly={handleSendDirectlyFromDropdown}
            disabled={isSpinning || isEvalLocked || eligibleCount === 0 || isAllRoundsCompleted}
            isEvalLocked={isEvalLocked}
          />

          {/* Next Button */}
          <button
            type="button"
            onClick={handleSendManual}
            disabled={!manualSelectedParticipant || isSpinning || isEvalLocked || isAllRoundsCompleted}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !manualSelectedParticipant || isSpinning || isEvalLocked || isAllRoundsCompleted
                ? 'bg-gray-100 dark:bg-[#252A3D] text-gray-700 dark:text-gray-200 border-2 border-dashed border-gray-300 dark:border-gray-500/80 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/35 ring-2 ring-violet-400/40 active:scale-[0.99]'
            }`}
          >
            {isAllRoundsCompleted ? (
              <span>All Rounds Completed</span>
            ) : isEvalLocked ? (
              <span>Evaluation in Progress (Scores Pending)</span>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

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
