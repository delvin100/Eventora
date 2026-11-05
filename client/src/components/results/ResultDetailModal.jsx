import React from 'react';
import { X, Trophy, Shuffle, Users, Calendar, Copy, Check } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';

export default function ResultDetailModal({ isOpen, onClose, result }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !result) return null;

  const handleCopySummary = () => {
    let summaryText = `Eventora Result: ${result.name}\nType: ${result.type}\nEvent: ${result.event_name || result.event}\nOutcome: ${result.details || result.winner || ''}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
              result.type === 'wheel' ? 'bg-[#635BFF]' : result.type === 'shuffle' ? 'bg-purple-600' : 'bg-emerald-600'
            }`}>
              {result.type === 'wheel' && <Trophy className="w-4 h-4" />}
              {result.type === 'shuffle' && <Shuffle className="w-4 h-4" />}
              {result.type === 'groups' && <Users className="w-4 h-4" />}
            </span>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                {result.name}
              </h3>
              <p className="text-[11px] text-gray-400">
                {result.event_name || result.event} • {formatDateTime(result.created_at || result.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Snapshot */}
        <div className="p-6 space-y-4">
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141722] border border-gray-100 dark:border-gray-800 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Recorded Outcome
            </p>
            {result.winner ? (
              <div className="flex items-center gap-3 pt-1">
                <Trophy className="w-6 h-6 text-amber-500" />
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {result.winner}
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {result.details || `${result.count || ''} items processed`}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>Result Type: <strong className="capitalize">{result.type}</strong></span>
            <span>Recorded ID: <code className="font-mono">{result.id}</code></span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
