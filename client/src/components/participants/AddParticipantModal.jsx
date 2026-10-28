import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check } from 'lucide-react';

export default function AddParticipantModal({ isOpen, onClose, onSave, editingParticipant = null }) {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    if (editingParticipant) {
      setName(editingParticipant.name || '');
      setIdentifier(editingParticipant.external_identifier || '');
      setDepartment(editingParticipant.metadata?.department || '');
    } else {
      setName('');
      setIdentifier('');
      setDepartment('');
    }
  }, [editingParticipant, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      external_identifier: identifier.trim(),
      metadata: { department: department.trim() }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#635BFF]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              {editingParticipant ? 'Edit Participant' : 'Add Participant'}
            </h3>
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
              Full Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emma Watson"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Student / Employee ID (Optional)
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. STU-1001 or EMP-402"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Department / Group / Tag (Optional)
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Science, Grade 10A, Team Alpha"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
            />
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
              className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all cursor-pointer"
            >
              {editingParticipant ? 'Save Changes' : 'Add to Roster'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
