import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  X,
  RotateCw,
  UserMinus,
  Sparkles,
  Award,
  CheckCircle2,
  BookOpen,
  Heart,
  RefreshCw,
  Star
} from 'lucide-react';
import { ENCOURAGING_AFFIRMATIONS } from '../../utils/taskBank';

export default function WinnerDialog({
  isOpen,
  winner,
  onClose,
  onRemoveWinner,
  onSpinAgain,
  canRemove = true,
  assignedTask = null,
  onDrawAnotherTask = null
}) {
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [currentAffirmation, setCurrentAffirmation] = useState(() => {
    return ENCOURAGING_AFFIRMATIONS[Math.floor(Math.random() * ENCOURAGING_AFFIRMATIONS.length)];
  });

  if (!isOpen || !winner) return null;

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
      setCurrentAffirmation(
        ENCOURAGING_AFFIRMATIONS[Math.floor(Math.random() * ENCOURAGING_AFFIRMATIONS.length)]
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner with celebratory gradient */}
        <div className="relative bg-gradient-to-br from-[#635BFF] via-[#7B74FF] to-[#9089FF] p-6 text-center text-white">
          <button
            onClick={() => {
              setTaskCompleted(false);
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            {assignedTask ? (
              <Star className="w-9 h-9 text-amber-300 drop-shadow-md animate-pulse" />
            ) : (
              <Trophy className="w-9 h-9 text-amber-300 drop-shadow-md" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{assignedTask ? "Today's Student Spotlight!" : "We Have a Winner!"}</span>
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
            {currentAffirmation}
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

        {/* Action Buttons */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Result has been logged to event history. What would you like to do next?
          </p>

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
              onClick={() => {
                setTaskCompleted(false);
                onClose();
                onSpinAgain();
              }}
              className="py-2.5 px-3.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-xs shadow-md shadow-[#635BFF]/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>{assignedTask ? 'Next Student' : 'Spin Again'}</span>
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
        </div>

      </div>
    </div>
  );
}
