import React, { useState } from 'react';
import { X, AlignLeft, CheckCircle2 } from 'lucide-react';

export default function BulkAddModal({ isOpen, onClose, onBulkSave, existingParticipants = [] }) {
  const [text, setText] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  if (!isOpen) return null;

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const existingSet = new Set(existingParticipants.map(p => p.name.toLowerCase()));
  const validLines = skipDuplicates ? lines.filter(name => !existingSet.has(name.toLowerCase())) : lines;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validLines.length === 0) return;

    const items = validLines.map(name => ({
      name,
      external_identifier: '',
      metadata: {}
    }));

    onBulkSave(items);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-[#635BFF]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Quick Add Multiple Names</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Paste or type names (one per line)
            </label>
            <textarea
              rows={8}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Emma Watson&#10;Liam Davis&#10;Sophia Chen&#10;Noah Miller"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600 dark:text-gray-400">
              {validLines.length} valid {validLines.length === 1 ? 'name' : 'names'} ready
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 text-[#635BFF] rounded"
              />
              <span>Skip duplicates</span>
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={validLines.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              Add {validLines.length} Participants
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
