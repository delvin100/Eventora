import React from 'react';
import { History, Trophy, Trash2, Clock, X } from 'lucide-react';

export default function WheelHistoryDrawer({
  history = [],
  onClearHistory,
  isOpen,
  onToggle
}) {
  return (
    <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#635BFF]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Spin History ({history.length})
          </h4>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[11px] font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
            title="Clear spin history"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          <Trophy className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p>No spins recorded yet.</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Spin the wheel to crown a winner!</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {history.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#141722] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] font-bold text-[10px] flex items-center justify-center shrink-0">
                  {history.length - idx}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">
                    {item.winner?.name || item.name}
                  </p>
                  {item.assignedTask ? (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold truncate">
                      🎯 {item.assignedTask.title}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400">
                      {item.time || 'Just now'}
                    </p>
                  )}
                </div>
              </div>

              {item.assignedTask ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                  Task
                </span>
              ) : (
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
