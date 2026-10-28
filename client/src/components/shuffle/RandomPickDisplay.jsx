import React from 'react';
import { Trophy, Sparkles, UserCheck } from 'lucide-react';

export default function RandomPickDisplay({ winners = [] }) {
  if (!winners || winners.length === 0) return null;

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-[#181B28] dark:via-[#161925] dark:to-[#1B1828] border border-indigo-200/80 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#635BFF] text-white flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-300" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
            Selected Winner{winners.length > 1 ? 's' : ''} ({winners.length})
          </h4>
          <p className="text-[11px] text-gray-400">Randomly selected without replacement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {winners.map((winner, idx) => (
          <div
            key={winner.id || idx}
            className="p-4 rounded-2xl bg-white dark:bg-[#141722] border border-indigo-100 dark:border-indigo-900/50 shadow-sm flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#635BFF] to-[#8881FF] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {winner.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#635BFF] dark:text-[#8881FF]">
                Pick #{idx + 1}
              </span>
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                {winner.name}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {winner.external_identifier || winner.metadata?.department || 'Selected'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
