import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  AlignLeft,
  FileSpreadsheet,
  Download,
  Search,
  Trash2,
  Edit2,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck,
  ChevronDown,
  Check
} from 'lucide-react';
import { participantService } from '../../services/participantService';
import { exportParticipantsToExcel } from '../../utils/excelUtils';
import AddParticipantModal from './AddParticipantModal';
import BulkAddModal from './BulkAddModal';
import ImportModal from './ImportModal';
import ConfirmDialog from '../common/ConfirmDialog';

function StylishDropdown({ value, onChange, options, minWidth = 'w-48' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-[#1B1E2D] flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 whitespace-nowrap"
      >
        <span>{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#635BFF]' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 mt-1.5 ${minWidth} rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-700 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100`}>
          {options.map((opt) => {
            const isMatch = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isMatch
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/60 text-[#635BFF] dark:text-[#8881FF] font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>{opt.label}</span>
                {isMatch && <Check className="w-3.5 h-3.5 text-[#635BFF] dark:text-[#8881FF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EventParticipantsView({ eventId, eventName = 'Event', onParticipantCountChange }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('az'); // az, za, newest, oldest
  const [selectedDept, setSelectedDept] = useState('All');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm delete dialog state
  const [confirmDeleteConfig, setConfirmDeleteConfig] = useState(null);

  // Load participants
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await participantService.getParticipants(eventId);
      setParticipants(data);
      if (onParticipantCountChange) {
        onParticipantCountChange(data ? data.length : 0);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
  }, [eventId]);

  // Filter & Sort
  const filtered = participants
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name);
      if (sortBy === 'za') return b.name.localeCompare(a.name);
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return 0;
    });

  // Handlers
  const handleAddOrEdit = async (data) => {
    if (editingItem) {
      await participantService.updateParticipant(eventId, editingItem.id, data);
    } else {
      await participantService.addParticipant(eventId, data);
    }
    setEditingItem(null);
    loadData();
  };

  const handleBulkAdd = async (items) => {
    await participantService.bulkAddParticipants(eventId, items);
    loadData();
  };

  const handleDeleteOne = (id, name) => {
    setConfirmDeleteConfig({
      title: `Remove "${name}"?`,
      message: `Are you sure you want to remove "${name}" from this event?`,
      confirmText: 'Remove Participant',
      action: async () => {
        await participantService.deleteParticipant(eventId, id);
        loadData();
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteConfig({
      title: `Remove ${selectedIds.size} Participants?`,
      message: `Are you sure you want to remove all ${selectedIds.size} selected participants from this event?`,
      confirmText: `Remove ${selectedIds.size} Participants`,
      action: async () => {
        await participantService.bulkDelete(eventId, Array.from(selectedIds));
        setSelectedIds(new Set());
        loadData();
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExport = () => {
    exportParticipantsToExcel(participants, eventName);
  };

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search & Sort */}
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 shadow-xs"
            />
          </div>

          <StylishDropdown
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'az', label: 'Sort: A to Z' },
              { value: 'za', label: 'Sort: Z to A' },
              { value: 'newest', label: 'Sort: Recently Added' },
              { value: 'oldest', label: 'Sort: First Added' }
            ]}
            minWidth="w-48"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="h-10 px-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={() => setIsImportOpen(true)}
            className="h-10 px-3.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Import Excel or CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExport}
            disabled={participants.length === 0}
            className="h-10 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161925] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
            title="Export roster to spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-gray-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsBulkOpen(true)}
            className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161925] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <AlignLeft className="w-4 h-4 text-[#635BFF]" />
            <span>Bulk Add</span>
          </button>

          <button
            onClick={() => { setEditingItem(null); setIsAddOpen(true); }}
            className="h-10 px-4 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Single</span>
          </button>
        </div>
      </div>

      {/* Participants Table Container */}
      <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading roster...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-gray-900 dark:text-white">No participants yet</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Get started by adding participants individually, pasting multiple names at once, or importing an Excel spreadsheet.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all cursor-pointer"
              >
                Import from Excel
              </button>
              <button
                onClick={() => setIsBulkOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
              >
                Quick Paste Names
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/80 dark:bg-[#141722] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer inline-flex items-center justify-center"
                    >
                      {selectedIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#635BFF]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 w-16 text-center">#</th>
                  <th className="px-6 py-3.5 text-center">Participant Name</th>
                  <th className="px-4 py-3.5 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-gray-700 dark:text-gray-300">
                {filtered.map((p, idx) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleSelectOne(p.id)}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#635BFF]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 font-mono font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">
                        <div className="inline-flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] text-[11px] font-bold flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditingItem(p); setIsAddOpen(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#635BFF] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Edit participant"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOne(p.id, p.name)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Remove participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-[#141722] border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
          <span>Showing {filtered.length} of {participants.length} participants</span>
          <span>{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Click checkboxes to bulk edit'}</span>
        </div>
      </div>

      {/* Modals */}
      <AddParticipantModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setEditingItem(null); }}
        onSave={handleAddOrEdit}
        editingParticipant={editingItem}
      />

      <BulkAddModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onBulkSave={handleBulkAdd}
        existingParticipants={participants}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleBulkAdd}
        existingParticipants={participants}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteConfig)}
        title={confirmDeleteConfig?.title || 'Are you sure?'}
        message={confirmDeleteConfig?.message || 'This action cannot be undone.'}
        confirmText={confirmDeleteConfig?.confirmText || 'Delete'}
        cancelText="Cancel"
        isDanger={true}
        onConfirm={async () => {
          if (confirmDeleteConfig?.action) {
            await confirmDeleteConfig.action();
          }
          setConfirmDeleteConfig(null);
        }}
        onCancel={() => setConfirmDeleteConfig(null)}
      />
    </div>
  );
}
