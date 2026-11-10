import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, CalendarDays, Star, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import UserFilterDropdown from '../components/common/UserFilterDropdown';

export default function EventsListPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
  const adminDisplayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(() => {
    try {
      return localStorage.getItem('eventora_admin_show_all_events') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [selectedUserId, setSelectedUserId] = useState('ALL');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleToggleShowAllUsers = (checked) => {
    setShowAllUsers(checked);
    if (!checked) setSelectedUserId('ALL');
    try {
      localStorage.setItem('eventora_admin_show_all_events', String(checked));
    } catch (_) {}
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = (isAdmin && showAllUsers)
        ? await eventService.getAllUsersEvents(user)
        : await eventService.getEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [showAllUsers, isAdmin]);

  const handleToggleFavorite = async (eventId, currentFavorite) => {
    await eventService.toggleFavorite(eventId, currentFavorite);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_favorite: !currentFavorite } : e));
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setDeleteLoading(true);
      await eventService.deleteEvent(eventToDelete.id);
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Find currently selected user object if filtering
  const selectedUserObj = useMemo(() => {
    if (!selectedUserId || selectedUserId === 'ALL') return null;
    const match = events.find(e => (e.owner_id === selectedUserId || e.owner?.id === selectedUserId));
    return match?.owner || { id: selectedUserId, displayName: 'User' };
  }, [selectedUserId, events]);

  const filtered = events.filter(e => {
    // Keep Special Events separated from standard events
    if (e.category === 'Special Event') return false;

    // Filter by specific user if selected
    if (selectedUserId && selectedUserId !== 'ALL') {
      const ownerId = e.owner_id || e.owner?.id;
      if (ownerId !== selectedUserId) return false;
    }

    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    const matchesName = e.name && e.name.toLowerCase().includes(s);
    const matchesDesc = e.description && e.description.toLowerCase().includes(s);
    const matchesOwner = (e.owner?.displayName && e.owner.displayName.toLowerCase().includes(s)) ||
                         (e.owner?.email && e.owner.email.toLowerCase().includes(s));
    return matchesName || matchesDesc || matchesOwner;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#311068] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Event Operations Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin && showAllUsers
                ? (selectedUserObj ? `${selectedUserObj.displayName}'s Events` : "All Users' Events")
                : "My Events"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Organize participants, interactive spinning wheels, randomized shuffles, and balanced team groupings by event.
            </p>
          </div>

          <Link
            to="/home/events/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold transition-colors shrink-0 shadow-md shadow-[#635BFF]/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </div>

      {/* Search & Admin All-Users Checkbox + Specific User Filter */}
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
                    ? `Search ${selectedUserObj.displayName}'s events...`
                    : "Search all users' events by name or organizer...")
                : "Search events by name..."
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400"
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
                <span>Show all users&apos; events</span>
                {showAllUsers && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
                    {events.length}
                  </span>
                )}
              </span>
            </label>

            {showAllUsers && (
              <UserFilterDropdown
                value={selectedUserId}
                onChange={setSelectedUserId}
                items={events}
                currentUserId={user?.id}
                itemLabel="events"
                allLabel="All Organizers"
              />
            )}
          </div>
        )}
      </div>

      {/* Active User Filter Badge (when filtering down to a specific user) */}
      {isAdmin && showAllUsers && selectedUserId !== 'ALL' && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs text-violet-900 dark:text-violet-200">
          <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <span>
            Filtering by organizer: <strong>{selectedUserObj?.displayName || 'User'}</strong> ({filtered.length} {filtered.length === 1 ? 'event' : 'events'})
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

      {/* Events Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading events...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(event => {
            const isCreatedByAdmin = Boolean(user?.id && (event.owner_id === user.id || event.owner?.id === user.id));
            const creatorName = isCreatedByAdmin
              ? (event.owner?.displayName || adminDisplayName)
              : (event.owner?.displayName || event.owner?.email || 'Organizer');

            return (
              <div
                key={event.id}
                onClick={() => navigate(`/home/events/${slugify(event.name)}`, { state: { fromEvents: true } })}
                className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-[#635BFF]/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-end mb-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(event.id, event.is_favorite);
                        }}
                        className="text-gray-400 hover:text-amber-500 cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={event.is_favorite ? 'Favorited' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${event.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventToDelete(event);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {event.participantCount || 0} Participants
                  </span>
                  {showAllUsers && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 truncate max-w-[150px]"
                      title={`Created by ${creatorName}`}
                    >
                      <Users className="w-3 h-3 shrink-0 text-violet-500" />
                      <span className="truncate">{creatorName}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-[#161925] rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
              <CalendarDays className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">No events found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {selectedUserId !== 'ALL'
                  ? `No events found for ${selectedUserObj?.displayName || 'this user'}.`
                  : search
                    ? 'Try clearing your search query.'
                    : 'Get started by creating your first event.'}
              </p>
              {selectedUserId !== 'ALL' ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserId('ALL')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 text-xs font-semibold cursor-pointer hover:bg-violet-200 transition-colors"
                  >
                    <span>View All Organizers&apos; Events</span>
                  </button>
                </div>
              ) : !search && (
                <div className="pt-2">
                  <Link
                    to="/home/events/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Event</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Event Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        title={`Delete "${eventToDelete?.name}"?`}
        message={`Are you sure you want to permanently delete "${eventToDelete?.name}" and all of its participants, draw results, and activity history? This action cannot be undone.`}
        confirmText="Yes, Permanently Delete"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDeleteEvent}
        onCancel={() => setEventToDelete(null)}
      />
    </div>
  );
}
