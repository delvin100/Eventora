import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCw,
  UserMinus,
  Sparkles,
  Award,
  CheckCircle2,
  BookOpen,
  Heart,
  RefreshCw,
  Star,
  UserCheck,
  Radio,
  Send,
  Lock,
  Clock,
  Flag
} from 'lucide-react';
import { ENCOURAGING_AFFIRMATIONS } from '../../utils/taskBank';
import { specialEventLiveService } from '../../services/specialEventLiveService';

const SELECTED_BANNER_TEXT = "Congratulations on being selected! 🎊";

export default function WinnerDialog({
  isOpen,
  winner,
  onClose,
  onRemoveWinner,
  onSpinAgain,
  onNextSpinRemove,
  onSpinAgainKeep,
  isFairTurn = false,
  canRemove = true,
  assignedTask = null,
  onDrawAnotherTask = null,
  eligibleCount = 0,
  remainingInRound = 0,
  allParticipantsCount = 0,
  isSpecialEvent = false,
  currentRound = 1,
  currentRoundTask = '',
  totalRounds = 1,
  liveState = null,
  onStartEvaluation = null,
  onFinishEvent = null,
  onManualSelectNext = null,
  onUpdateRoundTask = null
}) {
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [isTaskSubmitted, setIsTaskSubmitted] = useState(false);
  const [taskError, setTaskError] = useState('');

  const isEvalActive = isSpecialEvent && liveState?.status === 'evaluating' && liveState?.currentStudent?.id === winner?.id;

  const effectiveRoundTask = (currentRoundTask && currentRoundTask.trim()) || (liveState?.roundTask && liveState.roundTask.trim()) || '';
  const hasExistingRoundTask = Boolean(effectiveRoundTask);

  // Sync task input whenever dialog opens, winner changes, or round changes
  useEffect(() => {
    if (isOpen && winner) {
      if (hasExistingRoundTask) {
        setTaskInput(effectiveRoundTask);
        setIsTaskSubmitted(true);
      } else {
        setTaskInput('');
        setIsTaskSubmitted(false);
      }
      setTaskError('');
    }
  }, [isOpen, winner?.id, currentRound, hasExistingRoundTask, effectiveRoundTask]);

  const handleSubmitTask = (e) => {
    if (e) e.preventDefault();
    const trimmed = taskInput.trim();
    if (!trimmed) {
      setTaskError('Please enter a task name before submitting.');
      return;
    }
    setTaskError('');
    setIsTaskSubmitted(true);
    if (onUpdateRoundTask) {
      onUpdateRoundTask(trimmed);
    }
  };

  const handleSendToEvaluators = () => {
    const chosenTask = (hasExistingRoundTask ? effectiveRoundTask : taskInput).trim();
    if (!chosenTask) {
      setTaskError('Please enter a task name before sending to evaluators.');
      return;
    }
    setIsTaskSubmitted(true);
    if (onUpdateRoundTask) {
      onUpdateRoundTask(chosenTask);
    }
    if (onStartEvaluation) {
      onStartEvaluation(winner, chosenTask);
    }
  };

  if (!isOpen || !winner) return null;

  const requiredEvaluators = liveState?.requiredEvaluators || [];
  const submissions = liveState?.submissions || {};
  const submittedCount = requiredEvaluators.filter(u => Boolean(submissions[u])).length;
  const allEvaluatorsSubmitted = requiredEvaluators.length === 0 || submittedCount >= requiredEvaluators.length;
  const isSpinLocked = isSpecialEvent && isEvalActive && !allEvaluatorsSubmitted;

  const isRoundComplete = isSpecialEvent && remainingInRound === 0;
  const isEventComplete = isRoundComplete && currentRound >= totalRounds;
  const canAdvanceToNextRound = isRoundComplete && currentRound < totalRounds;

  const isNextSpinDisabled = isSpecialEvent ? (!isEvalActive || isSpinLocked) : isSpinLocked;
  const nextSpinSubtitle = isSpecialEvent && !isEvalActive
    ? 'Send to evaluators first'
    : isSpinLocked
    ? 'Locked until all evaluators submit scores'
    : isEventComplete
    ? `All students finished final Round ${currentRound}! Conclude event`
    : canAdvanceToNextRound
    ? `All students finished Round ${currentRound}! Start Round ${currentRound + 1}`
    : `Remove ${winner.name} & spin for next student (${remainingInRound} left in R${currentRound})`;

  const manualSelectSubtitle = isSpecialEvent && !isEvalActive
    ? 'Send to evaluators first'
    : isSpinLocked
    ? 'Locked until all evaluators submit scores'
    : canAdvanceToNextRound
    ? `All students finished Round ${currentRound}! Pick manually for Round ${currentRound + 1}`
    : `Remove ${winner.name} & choose next student from list (${remainingInRound} left in R${currentRound})`;

  const handleMarkTaskCompleted = () => {
    setTaskCompleted(true);
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#635BFF', '#EC4899', '#3B82F6']
    });
  };

  const handleRerollTask = () => {
    if (onDrawAnotherTask) {
      setTaskCompleted(false);
      onDrawAnotherTask();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg sm:max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner with celebratory gradient */}
        <div className="relative bg-gradient-to-br from-[#635BFF] via-[#7B74FF] to-[#9089FF] p-6 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            {assignedTask ? (
              <Star className="w-9 h-9 text-amber-300 drop-shadow-md animate-pulse" />
            ) : (
              <Trophy className="w-9 h-9 text-amber-300 drop-shadow-md" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Participant Selected!</span>
          </div>

          <h3 className="text-3xl font-black tracking-tight drop-shadow-sm">
            {winner.name}
          </h3>

          {(winner.external_identifier || winner.metadata?.department) && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-indigo-100">
              {winner.external_identifier && (
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded-md">
                  {winner.external_identifier}
                </span>
              )}
              {winner.metadata?.department && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md">
                  {winner.metadata.department}
                </span>
              )}
            </div>
          )}

          {/* Uplifting Affirmation Banner */}
          <div className="mt-3 text-xs font-medium text-white/90 bg-white/15 backdrop-blur-xs py-1.5 px-3 rounded-full inline-block">
            {SELECTED_BANNER_TEXT}
          </div>
        </div>

        {/* Assigned Task / Mission Card (If Task Mode Enabled) */}
        {assignedTask && (
          <div className="px-6 pt-5 pb-2">
            <div className={`p-4 rounded-2xl border transition-all ${
              taskCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#161925] text-[#635BFF] dark:text-[#8881FF] shadow-xs">
                  {assignedTask.category}
                </span>

                {onDrawAnotherTask && !taskCompleted && (
                  <button
                    onClick={handleRerollTask}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[#635BFF] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Draw another task</span>
                  </button>
                )}
              </div>

              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{assignedTask.title}</span>
              </h4>

              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                {assignedTask.instruction}
              </p>

              {/* Task Completion Button */}
              <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>+{assignedTask.points || 10} Participation Points</span>
                </span>

                {taskCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed! Great Job!</span>
                  </span>
                ) : (
                  <button
                    onClick={handleMarkTaskCompleted}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Task Completed!</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Special Event Live Evaluator Synchronization Card */}
        {isSpecialEvent && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isEvalActive ? 'text-emerald-400 animate-pulse' : 'text-violet-400'}`} />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Special Event Evaluation
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30">
                Round {currentRound}
              </span>
            </div>

            {isEvalActive && (liveState?.roundTask || taskInput || currentRoundTask) && (
              <div className="text-[11px] text-violet-700 dark:text-violet-300 font-medium bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/20">
                <strong className="text-violet-900 dark:text-violet-200">Task:</strong> {liveState?.roundTask || taskInput || currentRoundTask}
              </div>
            )}

            {!isEvalActive ? (
              <div className="space-y-3">
                {/* Enter / Display Task Section */}
                {hasExistingRoundTask ? (
                  <div className="space-y-1.5 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                        <span>Round {currentRound} Task</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#12141F]/80 border border-violet-400/30">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {effectiveRoundTask}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                        <span>Enter Task (Round {currentRound}):</span>
                      </span>
                      {isTaskSubmitted && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" /> Task Set & Locked
                        </span>
                      )}
                    </label>

                    {!isTaskSubmitted ? (
                      <form onSubmit={handleSubmitTask} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={taskInput}
                            onChange={(e) => {
                              setTaskInput(e.target.value);
                              if (taskError) setTaskError('');
                            }}
                            placeholder={`Enter task for Round ${currentRound}...`}
                            autoFocus
                            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#12141F] border border-violet-300 dark:border-violet-700/60 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-sm hover:shadow-violet-600/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Set Task</span>
                          </button>
                        </div>
                        {taskError && (
                          <p className="text-[11px] text-red-500 font-semibold px-0.5">{taskError}</p>
                        )}
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#12141F]/80 border border-violet-400/30">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {taskInput.trim()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Click below to activate <strong>{winner.name}</strong> on all evaluator screens simultaneously.
                </p>

                <button
                  type="button"
                  disabled={!hasExistingRoundTask && !isTaskSubmitted && !taskInput.trim()}
                  onClick={handleSendToEvaluators}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                    (hasExistingRoundTask || isTaskSubmitted || taskInput.trim())
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/30 cursor-pointer active:scale-[0.99]'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none border border-gray-300 dark:border-gray-700/60'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Send to Evaluators (Load Scoring Page)</span>
                </button>

                {!hasExistingRoundTask && !isTaskSubmitted && !taskInput.trim() && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium">
                    Enter the task above to enable sending to evaluators.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Evaluator Submissions:
                  </span>
                  <span className="font-extrabold text-violet-600 dark:text-violet-400">
                    {submittedCount} / {requiredEvaluators.length} Submitted
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: requiredEvaluators.length > 0
                        ? `${Math.round((submittedCount / requiredEvaluators.length) * 100)}%`
                        : '100%'
                    }}
                  />
                </div>

                {/* Individual Evaluator status pills */}
                {requiredEvaluators.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {requiredEvaluators.map(user => {
                      const done = Boolean(submissions[user]);
                      return (
                        <span
                          key={user}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                            done
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          }`}
                        >
                          {done ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                          <span>{user}: {done ? 'Submitted' : 'Pending...'}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Locking status message */}
                {isSpinLocked ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Spin locked: Waiting for all evaluators to submit scores...</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>All evaluators submitted! Spin buttons unlocked.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Result has been logged to event history. What would you like to do next?
          </p>

          {isSpecialEvent || isFairTurn ? (
            <div className="space-y-3 pt-1">
              {/* SPECIAL EVENT: If event is fully complete, show Conclude Event button */}
              {isSpecialEvent && isEventComplete ? (
                <button
                  disabled={isNextSpinDisabled}
                  onClick={() => {
                    setTaskCompleted(false);
                    if (onFinishEvent) {
                      onFinishEvent();
                    } else {
                      onClose();
                    }
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold text-xs shadow-md flex flex-col items-center justify-center gap-0.5 transition-all bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-600 hover:to-red-700 shadow-rose-600/25 ${
                    isNextSpinDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <Flag className="w-4 h-4" />
                    <span>Conclude Special Event (View Report)</span>
                  </span>
                  <span className="text-[11px] text-white/90 font-normal">
                    {nextSpinSubtitle}
                  </span>
                </button>
              ) : isSpecialEvent ? (
                /* SPECIAL EVENT (In Progress): Show Next Spin AND Manual Select buttons side-by-side */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Left: Next Spin button (spins automatically) */}
                  <button
                    disabled={isNextSpinDisabled}
                    onClick={() => {
                      setTaskCompleted(false);
                      if (onNextSpinRemove) {
                        onNextSpinRemove(winner);
                      } else {
                        onRemoveWinner(winner);
                        onClose();
                        onSpinAgain();
                      }
                    }}
                    className={`py-3 px-3 rounded-xl text-white font-semibold shadow-md flex flex-col items-center justify-center gap-0.5 transition-all bg-[#635BFF] hover:bg-[#5145E5] shadow-[#635BFF]/25 ${
                      isNextSpinDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-xs sm:text-[13px] whitespace-nowrap">
                      <RotateCw className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">
                        {canAdvanceToNextRound
                          ? `Complete R${currentRound} & Spin (R${currentRound + 1})`
                          : `Next Spin (Round ${currentRound})`}
                      </span>
                    </span>
                    <span className="text-[11px] text-white/80 font-normal truncate max-w-full">
                      {nextSpinSubtitle}
                    </span>
                  </button>

                  {/* Right: Manual Select button (navigates to manual dropdown selection) */}
                  <button
                    disabled={isNextSpinDisabled}
                    onClick={() => {
                      setTaskCompleted(false);
                      if (onManualSelectNext) {
                        onManualSelectNext(winner);
                      } else {
                        onRemoveWinner(winner);
                        onClose();
                      }
                    }}
                    className={`py-3 px-3 rounded-xl text-white font-semibold shadow-md flex flex-col items-center justify-center gap-0.5 transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/30 ${
                      isNextSpinDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-xs sm:text-[13px] whitespace-nowrap">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">
                        {canAdvanceToNextRound
                          ? `Complete R${currentRound} & Select (R${currentRound + 1})`
                          : `Select Manually (Round ${currentRound})`}
                      </span>
                    </span>
                    <span className="text-[11px] text-white/80 font-normal truncate max-w-full">
                      {manualSelectSubtitle}
                    </span>
                  </button>
                </div>
              ) : (
                /* Regular Non-Special Event with Fair Turn */
                <button
                  disabled={isNextSpinDisabled}
                  onClick={() => {
                    setTaskCompleted(false);
                    if (onNextSpinRemove) {
                      onNextSpinRemove(winner);
                    } else {
                      onRemoveWinner(winner);
                      onClose();
                      onSpinAgain();
                    }
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold text-xs shadow-md flex flex-col items-center justify-center gap-0.5 transition-all bg-[#635BFF] hover:bg-[#5145E5] shadow-[#635BFF]/25 ${
                    isNextSpinDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <RotateCw className="w-4 h-4" />
                    <span>Next Spin</span>
                  </span>
                  <span className="text-[11px] text-white/80 font-normal">
                    {nextSpinSubtitle}
                  </span>
                </button>
              )}

              {/* 2. In space of remove and close: Close button before sending to evaluators; Remove & Close after */}
              <div className="flex items-center justify-center pt-0.5">
                {isSpecialEvent && !isEvalActive ? (
                  <button
                    onClick={() => {
                      setTaskCompleted(false);
                      onClose();
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    disabled={isSpinLocked}
                    onClick={async () => {
                      setTaskCompleted(false);
                      if (isSpecialEvent) {
                        try {
                          await specialEventLiveService.finishStudent();
                        } catch (_) {}
                      }
                      onRemoveWinner(winner);
                      onClose();
                    }}
                    className={`text-xs font-semibold transition-colors ${
                      isSpinLocked
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline cursor-pointer'
                    }`}
                  >
                    {isSpecialEvent ? 'Close Dialog' : 'Remove & Close'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {canRemove && (
                  <button
                    onClick={() => {
                      setTaskCompleted(false);
                      onRemoveWinner(winner);
                      onClose();
                    }}
                    className="py-2.5 px-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Remove From Wheel</span>
                  </button>
                )}

                <button
                  disabled={isSpinLocked}
                  onClick={() => {
                    setTaskCompleted(false);
                    onClose();
                    onSpinAgain();
                  }}
                  className={`py-2.5 px-3.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-xs shadow-md shadow-[#635BFF]/25 flex items-center justify-center gap-1.5 transition-all ${
                    isSpinLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{assignedTask ? 'Next Student' : 'Keep and Spin Again'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setTaskCompleted(false);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Keep in Wheel & Close
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
