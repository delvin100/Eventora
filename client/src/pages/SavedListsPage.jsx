import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ListOrdered, Copy, Trash2, Loader2, Search, Users, X } from 'lucide-react';
import CreateListModal from '../components/lists/CreateListModal';
import CopyToListModal from '../components/lists/CopyToListModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import UserFilterDropdown from '../components/common/UserFilterDropdown';
import { useAuth } from '../context/AuthContext';
import { listService } from '../services/listService';
import { eventService } from '../services/eventService';
import { participantService } from '../services/participantService';
import { formatDate } from '../utils/dateUtils';

export default function SavedListsPage() {
  const { user, profile } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
  const adminDisplayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';

  const [lists, setLists] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(() => {
    try {
      return localStorage.getItem('eventora_admin_show_all_lists') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [selectedUserId, setSelectedUserId] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListToCopy, setSelectedListToCopy] = useState(null);
  const [listToDelete, setListToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleShowAllUsers = (checked) => {
    setShowAllUsers(checked);
    if (!checked) setSelectedUserId('ALL');
    try {
      localStorage.setItem('eventora_admin_show_all_lists', String(checked));
    } catch (_) {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedLists, fetchedEvents] = await Promise.all([
        (isAdmin && showAllUsers)
          ? listService.getAllUsersLists(user)
          : listService.getSavedLists(),
        eventService.getEvents()
      ]);
      setLists(fetchedLists || []);
      setEvents(fetchedEvents || []);
    } catch (err) {
      console.error('Error loading saved lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showAllUsers, isAdmin]);

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
      await listService.deleteSavedList(listToDelete.id, user);
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

  const selectedUserObj = useMemo(() => {
    if (!selectedUserId || selectedUserId === 'ALL') return null;
    const match = lists.find(l => (l.owner_id === selectedUserId || l.owner?.id === selectedUserId));
    return match?.owner || { id: selectedUserId, displayName: 'User' };
  }, [selectedUserId, lists]);

  const filteredLists = lists.filter(l => {
    // Filter by specific user if selected
    if (selectedUserId && selectedUserId !== 'ALL') {
      const ownerId = l.owner_id || l.owner?.id;
      if (ownerId !== selectedUserId) return false;
    }

    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    return (
      (l.name && l.name.toLowerCase().includes(s)) ||
      (l.description && l.description.toLowerCase().includes(s)) ||
      (l.owner?.displayName && l.owner.displayName.toLowerCase().includes(s)) ||
      (l.owner?.email && l.owner.email.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#311068] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Master Participant Rosters</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin && showAllUsers
                ? (selectedUserObj ? `${selectedUserObj.displayName}'s Lists` : "All Users' Lists")
                : "Reusable Lists"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Maintain master participant rosters that can be copied into any standard or special event workspace without altering the source.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold transition-colors shrink-0 shadow-md shadow-[#635BFF]/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Reusable List</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
          {errorMsg}
        </div>
      )}

      {/* Search Bar & Admin All-Users Checkbox + Specific User Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              showAllUsers
                ? (selectedUserObj
                    ? `Search ${selectedUserObj.displayName}'s lists...`
                    : "Search all users' lists by name or organizer...")
                : "Search reusable lists by name..."
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
          />
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-violet-500/50 transition-all cursor-pointer select-none shrink-0 shadow-xs">
              <input
                type="checkbox"
                checked={showAllUsers}
                onChange={(e) => handleToggleShowAllUsers(e.target.checked)}
                className="w-4 h-4 rounded text-[#635BFF] focus:ring-[#635BFF]/30 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer accent-[#635BFF]"
              />
              <span className="flex items-center gap-1.5">
                <span>Show all users&apos; lists</span>
                {showAllUsers && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
                    {lists.length}
                  </span>
                )}
              </span>
            </label>

            {showAllUsers && (
              <UserFilterDropdown
                value={selectedUserId}
                onChange={setSelectedUserId}
                items={lists}
                currentUserId={user?.id}
                itemLabel="lists"
                allLabel="All Organizers"
              />
            )}
          </div>
        )}
      </div>

      {/* Active User Filter Badge */}
      {isAdmin && showAllUsers && selectedUserId !== 'ALL' && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs text-violet-900 dark:text-violet-200">
          <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <span>
            Filtering by organizer: <strong>{selectedUserObj?.displayName || 'User'}</strong> ({filteredLists.length} {filteredLists.length === 1 ? 'list' : 'lists'})
          </span>
          <button
            type="button"
            onClick={() => setSelectedUserId('ALL')}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Show all organizers</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-xs text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
          <span>Loading reusable lists...</span>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="py-20 px-6 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <ListOrdered className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="font-bold text-base text-gray-900 dark:text-white">
            {selectedUserId !== 'ALL'
              ? `No lists found for ${selectedUserObj?.displayName || 'this user'}`
              : search
                ? 'No reusable lists match your search'
                : 'No reusable lists yet'}
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {selectedUserId !== 'ALL'
              ? 'This organizer has not created any reusable participant lists yet.'
              : search
                ? 'Try adjusting your search query or clear the filter.'
                : 'Create master rosters of students, team members, or participants to easily reuse across multiple events.'}
          </p>
          {selectedUserId !== 'ALL' ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserId('ALL')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 text-xs font-semibold cursor-pointer hover:bg-violet-200 transition-colors"
              >
                <span>View All Organizers&apos; Lists</span>
              </button>
            </div>
          ) : !search && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Master List</span>
            </button>
          )}
        </div>
      ) : (
        /* Lists Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLists.map(list => {
            const count = list.entries ? list.entries.length : (list.count || 0);
            const isCreatedByAdmin = Boolean(user?.id && (list.owner_id === user.id || list.owner?.id === user.id));
            const creatorName = isCreatedByAdmin
              ? (list.owner?.displayName || adminDisplayName)
              : (list.owner?.displayName || list.owner?.email || 'Organizer');

            return (
              <div
                key={list.id}
                className="p-6 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[#635BFF]">
                      <ListOrdered className="w-4 h-4" />
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        Master Roster
                      </span>
                    </div>
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
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-400">
                      {list.created_at ? formatDate(list.created_at) : 'Saved'}
                    </span>
                    {showAllUsers && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 truncate max-w-[140px]"
                        title={`Created by ${creatorName}`}
                      >
                        <Users className="w-3 h-3 shrink-0 text-violet-500" />
                        <span className="truncate">{creatorName}</span>
                      </span>
                    )}
                  </div>
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
