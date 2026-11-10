import React, { useState } from 'react';
import { X, Plus, ListOrdered } from 'lucide-react';

export default function CreateListModal({ isOpen, onClose, onCreateList }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [namesText, setNamesText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const entries = namesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(cleanName => ({
        id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name: cleanName
      }));

    onCreateList({
      name: name.trim(),
      description: description.trim(),
      entries
    });

    setName('');
    setDescription('');
    setNamesText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#635BFF]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Create Reusable Master List</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              List Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Student Roster or Team Members"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Participants / Entries (One per line)
            </label>
            <textarea
              rows={6}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Emma Watson&#10;Liam Davis&#10;Sophia Chen&#10;Noah Miller"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 cursor-pointer"
            >
              Save Reusable List
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
