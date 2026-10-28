import React, { useState } from 'react';
import { X, Copy, ArrowRight, CalendarDays, Check } from 'lucide-react';

export default function CopyToListModal({ isOpen, onClose, list, events = [], onConfirmCopy }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!isOpen || !list) return null;

  const handleCopy = () => {
    if (!selectedEventId) return;
    onConfirmCopy(list, selectedEventId);
    setCopiedSuccess(true);
    setTimeout(() => {
      setCopiedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-[#635BFF]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Copy List to Event</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Copying <strong className="text-gray-900 dark:text-white font-bold">{list.name}</strong> ({list.entries?.length || list.count || 0} participants) will create an independent snapshot in the selected event workspace.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Select Target Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.category})
                </option>
              ))}
            </select>
          </div>

          {copiedSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>Participants successfully copied!</span>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!selectedEventId}
                className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Copy to Event</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
