import React, { useState } from 'react';
import { Search, ArrowRight, User, CheckCircle2 } from 'lucide-react';

export default function ShuffleOrderList({ originalList = [], shuffledList = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const displayList = shuffledList.length > 0 ? shuffledList : originalList;
  const isShuffled = shuffledList.length > 0;

  const filtered = displayList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.external_identifier && p.external_identifier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <span>{isShuffled ? 'Randomized Sequence Order' : 'Current Roster Order'}</span>
            {isShuffled && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                Shuffled
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isShuffled ? 'Unbiased presentation or speaking sequence' : 'Original roster arrangement'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search position by name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141D] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
          />
        </div>
      </div>

      {/* Grid of Numbered Participant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
        {filtered.map((item, index) => {
          // If searching, find the real index in displayList
          const realIndex = displayList.findIndex(p => p.id === item.id);
          const position = realIndex + 1;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isShuffled
                  ? 'border-indigo-100 dark:border-indigo-950/50 bg-gray-50/60 dark:bg-[#141722] hover:border-indigo-300'
                  : 'border-gray-200/70 dark:border-gray-800 bg-white dark:bg-[#161925]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                  position <= 3 && isShuffled
                    ? 'bg-[#635BFF] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  #{position}
                </span>

                <div className="min-w-0">
                  <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {item.external_identifier || item.metadata?.department || 'Participant'}
                  </p>
                </div>
              </div>

              {isShuffled && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
