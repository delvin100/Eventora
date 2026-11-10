import React, { useEffect } from 'react';
import { Radio, X, Rocket, ArrowRight } from 'lucide-react';

export default function LiveArenaComingSoonModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#141622] border border-gray-200/80 dark:border-violet-500/20 shadow-2xl shadow-violet-500/15 p-6 sm:p-8 text-center space-y-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-20 -left-20 w-52 h-52 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Arena Icon Container */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 opacity-20 blur-lg" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 ring-4 ring-white/10 dark:ring-violet-500/20">
            <Radio className="w-10 h-10 drop-shadow-md text-white" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
            <Rocket className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>In Development</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Live Device Arena
          </h2>
          <p className="text-sm font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-400 bg-clip-text text-transparent">
            Coming Soon to Eventora
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Got It, Thanks!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

