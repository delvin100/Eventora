import React, { useState, useEffect } from 'react';
import { Plus, ListOrdered, Copy, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import CreateListModal from '../components/lists/CreateListModal';
import CopyToListModal from '../components/lists/CopyToListModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { listService } from '../services/listService';
import { eventService } from '../services/eventService';
import { participantService } from '../services/participantService';
import { formatDate } from '../utils/dateUtils';

export default function SavedListsPage() {
  const [lists, setLists] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListToCopy, setSelectedListToCopy] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedLists, fetchedEvents] = await Promise.all([
        listService.getSavedLists(),
        eventService.getEvents()
      ]);
      setLists(fetchedLists);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error loading saved lists from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateList = async (newList) => {
    try {
      setErrorMsg('');
      await listService.createSavedList(newList);
      await loadData();
    } catch (err) {
      console.error('Failed to create saved list:', err);
      setErrorMsg('Failed to save list: ' + (err.message || 'Unknown error'));
    }
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    try {
      setDeleteLoading(true);
      await listService.deleteSavedList(listToDelete.id);
      setLists(prev => prev.filter(l => l.id !== listToDelete.id));
      setListToDelete(null);
    } catch (err) {
      console.error('Failed to delete saved list:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmCopy = async (list, eventId) => {
    if (!list.entries || list.entries.length === 0) return;
    const items = list.entries.map(e => ({
      name: e.name,
      external_identifier: e.external_identifier || '',
      metadata: { sourceList: list.name }
    }));
    await participantService.bulkAddParticipants(eventId, items);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Reusable Lists</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maintain master participant rosters that can be copied into any event without altering the source.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Reusable List</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-xs text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
          <span>Loading reusable lists...</span>
        </div>
      ) : lists.length === 0 ? (
        <div className="py-20 px-6 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <ListOrdered className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="font-bold text-base text-gray-900 dark:text-white">No reusable lists yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Create master rosters of students, team members, or participants to easily reuse across multiple events.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-semibold shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Master List</span>
          </button>
        </div>
      ) : (
        /* Lists Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lists.map(list => {
            const count = list.entries ? list.entries.length : (list.count || 0);
            return (
              <div
                key={list.id}
                className="p-6 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                      {list.category || 'General'}
                    </span>
                    <button
                      onClick={() => setListToDelete(list)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Delete list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">{list.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {count} {count === 1 ? 'Entry' : 'Entries'}
                  </p>

                  {/* Sample entry preview */}
                  {list.entries && list.entries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {list.entries.slice(0, 3).map((e, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {e.name}
                        </span>
                      ))}
                      {list.entries.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">
                          +{list.entries.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    {list.created_at ? formatDate(list.created_at) : 'Saved'}
                  </span>
                  <button
                    onClick={() => setSelectedListToCopy(list)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-[#635BFF] hover:text-white text-[#635BFF] dark:text-[#8881FF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Event</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateListModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateList={handleCreateList}
      />

      <CopyToListModal
        isOpen={Boolean(selectedListToCopy)}
        onClose={() => setSelectedListToCopy(null)}
        list={selectedListToCopy}
        events={events}
        onConfirmCopy={handleConfirmCopy}
      />

      <ConfirmDialog
        isOpen={Boolean(listToDelete)}
        title={listToDelete ? `Delete "${listToDelete.name}"?` : 'Delete List'}
        message="Are you sure you want to delete this reusable list? All list entries will be permanently deleted."
        confirmText="Delete List"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={confirmDeleteList}
        onCancel={() => setListToDelete(null)}
      />
    </div>
  );
}
