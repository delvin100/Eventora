import React, { useState, useEffect } from 'react';
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
  FileCheck
} from 'lucide-react';
import { participantService } from '../../services/participantService';
import { exportParticipantsToExcel } from '../../utils/excelUtils';
import AddParticipantModal from './AddParticipantModal';
import BulkAddModal from './BulkAddModal';
import ImportModal from './ImportModal';

export default function EventParticipantsView({ eventId, eventName = 'Event' }) {
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

  // Load participants
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await participantService.getParticipants(eventId);
      setParticipants(data);
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

  // Unique departments for filter
  const departments = ['All', ...new Set(
    participants
      .map(p => p.metadata?.department || p.category)
      .filter(Boolean)
  )];

  // Filter & Sort
  const filtered = participants
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.external_identifier && p.external_identifier.toLowerCase().includes(search.toLowerCase()));
      const dept = p.metadata?.department || p.category || '';
      const matchDept = selectedDept === 'All' || dept === selectedDept;
      return matchSearch && matchDept;
    })
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

  const handleDeleteOne = async (id, name) => {
    if (window.confirm(`Remove "${name}" from this event?`)) {
      await participantService.deleteParticipant(eventId, id);
      loadData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to remove ${selectedIds.size} selected participants?`)) {
      await participantService.bulkDelete(eventId, Array.from(selectedIds));
      setSelectedIds(new Set());
      loadData();
    }
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
        {/* Search & Dept Filter */}
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID code..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
            />
          </div>

          {departments.length > 2 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs text-gray-700 dark:text-gray-300"
            >
              {departments.map(d => <option key={d} value={d}>Group: {d}</option>)}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs text-gray-700 dark:text-gray-300"
          >
            <option value="az">Sort: A to Z</option>
            <option value="za">Sort: Z to A</option>
            <option value="newest">Sort: Recently Added</option>
            <option value="oldest">Sort: First Added</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import Excel or CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExport}
            disabled={participants.length === 0}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="Export roster to spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlignLeft className="w-4 h-4 text-[#635BFF]" />
            <span>Bulk Add</span>
          </button>

          <button
            onClick={() => { setEditingItem(null); setIsAddOpen(true); }}
            className="px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 transition-all cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Import from Excel
              </button>
              <button
                onClick={() => setIsBulkOpen(true)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                Quick Paste Names
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-[#141722] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {selectedIds.size === filtered.length ? (
                        <CheckSquare className="w-4 h-4 text-[#635BFF]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Participant Name</th>
                  <th className="px-4 py-3">Identifier / Code</th>
                  <th className="px-4 py-3">Group / Dept</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleSelectOne(p.id)}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#635BFF]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">
                        {p.external_identifier || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(p.metadata?.department || p.category) ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {p.metadata?.department || p.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
