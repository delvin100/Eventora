import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { QUIZ_TYPES } from '../../services/quizService';

export default function StylishQuizTypeDropdown({ selectedTypeId, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentType = QUIZ_TYPES.find(t => t.id === selectedTypeId) || null;

  const getBadgeLabel = (type) => {
    if (!type) return 'MCQ';
    if (type.mode === 'direct') return 'Direct Q&A';
    if (type.mode === 'mcq_2') return '2 Chances';
    if (type.mode === 'media') return 'Media';
    return 'MCQ';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:border-violet-500/60 dark:hover:border-violet-500/60 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 text-left"
      >
        <div className="space-y-0.5 min-w-0 flex-1">
          {currentType ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {currentType.name}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                  {getBadgeLabel(currentType)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {currentType.description}
              </p>
            </>
          ) : (
            <div className="py-1">
              <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                Select Quiz Type
              </span>
            </div>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
          {QUIZ_TYPES.map((type) => {
            const isSelected = selectedTypeId === type.id;
            const isAvail = type.isAvailable;

            return (
              <button
                key={type.id}
                type="button"
                disabled={!isAvail}
                onClick={() => {
                  if (isAvail) {
                    onChange(type.id);
                    setIsOpen(false);
                  }
                }}
                className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-800/60 text-violet-700 dark:text-violet-300'
                    : isAvail
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isSelected ? 'text-violet-900 dark:text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                      {type.name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100/70 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                      {getBadgeLabel(type)}
                    </span>
                    {!isAvail && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

