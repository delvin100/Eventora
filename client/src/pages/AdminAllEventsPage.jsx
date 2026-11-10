import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import {
  Globe,
  Search,
  Users,
  CalendarDays,
  ArrowRight,
  Trash2,
  Filter,
  Sparkles,
  ShieldCheck,
  User,
  Crown,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
  Plus,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { userService } from '../services/userService';
import { formatDate } from '../utils/dateUtils';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';

function StylishOrganizerDropdown({ value, onChange, users, totalEventsCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => u.id === value);
  const isAll = !value || value === 'ALL';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[42px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:border-violet-500/50 dark:hover:border-violet-500/50 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 whitespace-nowrap min-w-[210px]"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
            {isAll ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
          </div>
          <span className="truncate">
            {isAll ? 'All Organizers' : selectedUser?.displayName || 'Organizer'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
            {isAll ? `${totalEventsCount}` : `${selectedUser?.eventsCount || 0}`}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
          {/* Option All */}
          <button
            type="button"
            onClick={() => {
              onChange('ALL');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
              isAll
                ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">All Organizers</p>
                <p className="text-[10px] text-gray-400">All users across platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {totalEventsCount}
              </span>
              {isAll && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
            </div>
          </button>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800/80" />

          {/* User List */}
          {users.map(u => {
            const isSelected = value === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange(u.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {u.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{u.displayName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {u.eventsCount || 0}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminAllEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('user') || 'ALL');
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const categories = ['All', 'Classroom', 'Team activity', 'Lucky draw', 'Tournament', 'Personal', 'General', 'Special Event'];

  // Sync selectedUserId with search params if changed externally
  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam && userParam !== selectedUserId) {
      setSelectedUserId(userParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allEvents, registeredUsers] = await Promise.all([
        eventService.getAllUsersEvents(user),
        userService.getUsers().catch(() => [])
      ]);

      setEvents(allEvents || []);
      setUsersList(registeredUsers || []);
    } catch (err) {
      console.error('Failed to load all users events:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load user events: ' + (err.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setDeleteLoading(true);
      await eventService.deleteEvent(eventToDelete.id);
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      setStatusMsg({
        type: 'success',
        text: `Event "${eventToDelete.name}" was successfully removed.`
      });
      setEventToDelete(null);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setStatusMsg({
        type: 'error',
        text: 'Failed to delete event: ' + (err.message || 'Unknown error')
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Selected user profile object if filtering by user
  const activeUserFilter = useMemo(() => {
    if (!selectedUserId || selectedUserId === 'ALL') return null;
    return usersList.find(u => u.id === selectedUserId) || null;
  }, [selectedUserId, usersList]);

  const handleUserFilterChange = (userId) => {
    setSelectedUserId(userId);
    if (userId === 'ALL') {
      searchParams.delete('user');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ user: userId });
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. User filter
      if (selectedUserId && selectedUserId !== 'ALL') {
        if (e.owner_id !== selectedUserId && e.owner?.id !== selectedUserId) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'All') {
        if (e.category !== selectedCategory) return false;
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = e.name && e.name.toLowerCase().includes(q);
        const matchesDesc = e.description && e.description.toLowerCase().includes(q);
        const matchesOwnerName = e.owner?.displayName && e.owner.displayName.toLowerCase().includes(q);
        const matchesOwnerEmail = e.owner?.email && e.owner.email.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesOwnerName || matchesOwnerEmail;
      }

      return true;
    });
  }, [events, selectedUserId, selectedCategory, search]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalParticipants = events.reduce((acc, curr) => acc + (curr.participantCount || 0), 0);
    const uniqueOwners = new Set(events.map(e => e.owner_id).filter(Boolean)).size;
    const specialCount = events.filter(e => e.category === 'Special Event').length;
    return { totalEvents, totalParticipants, uniqueOwners, specialCount };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#2E1065] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Super-Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              All User Events Explorer
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Inspect, supervise, and directly interact with any event created by registered users across Eventora.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Events</span>
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalEvents}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Participants</span>
              <span className="text-xl sm:text-2xl font-black text-violet-300">{stats.totalParticipants}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Organizers</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{stats.uniqueOwners}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Special</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{stats.specialCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Feedback */}
      {statusMsg.text && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event name, description, organizer name, or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
            />
          </div>

          {/* User / Organizer Selector */}
          <div className="flex items-center gap-2">
            <StylishOrganizerDropdown
              value={selectedUserId}
              onChange={handleUserFilterChange}
              users={usersList}
              totalEventsCount={events.length}
            />

            <Link
              to="/home/events/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </Link>
          </div>
        </div>

        {/* Active Filter Pill if filtering by specific user */}
        {activeUserFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs text-violet-800 dark:text-violet-200 w-fit">
            <span>
              Filtering by organizer: <strong>{activeUserFilter.displayName}</strong> ({activeUserFilter.email})
            </span>
            <button
              onClick={() => handleUserFilterChange('ALL')}
              className="p-0.5 rounded-md hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-600 dark:text-violet-300 transition-colors ml-1 cursor-pointer"
              title="Clear organizer filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#161925] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800/40 animate-pulse border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800">
          <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No user events found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== 'All' || selectedUserId !== 'ALL'
              ? 'No events match your current filter criteria. Try adjusting the search or filters.'
              : 'There are no events registered by any user in the system yet.'}
          </p>
          {(search || selectedCategory !== 'All' || selectedUserId !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                handleUserFilterChange('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-[#635BFF] bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const isSpecial = event.category === 'Special Event';
            const ownerName = event.owner?.displayName || 'Organizer';
            const ownerEmail = event.owner?.email || 'user@eventora.app';
            const ownerUsage = event.owner?.usageType || 'personal';

            return (
              <div
                key={event.id}
                onClick={() => navigate(`/home/events/${slugify(event.name) || event.id}`, { state: { eventId: event.id } })}
                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-violet-500/70 dark:hover:border-violet-500/70 transition-all p-5 shadow-xs hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="space-y-3.5">
                  {/* Category & Date Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isSpecial
                          ? 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]'
                      }`}
                    >
                      {isSpecial && <Crown className="w-3 h-3 text-amber-500" />}
                      {event.category || 'General'}
                    </span>

                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {event.created_at ? formatDate(event.created_at) : ''}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                      {event.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Creator / Owner Info Box */}
                  <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#1B1E2D] border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {ownerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                          {ownerName}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block">
                          {ownerEmail}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize shrink-0">
                      {ownerUsage}
                    </span>
                  </div>
                </div>

                {/* Footer with Metrics & Delete action */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      <strong className="text-gray-900 dark:text-white font-semibold">
                        {event.participantCount || 0}
                      </strong>{' '}
                      participants
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventToDelete(event);
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title="Delete event as Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        title="Delete Event"
        message={`Are you sure you want to permanently delete event "${eventToDelete?.name}"? All participants and generated results for this event will be deleted.`}
        confirmText={deleteLoading ? 'Deleting...' : 'Delete Event'}
        confirmVariant="danger"
        isLoading={deleteLoading}
        onConfirm={handleDeleteEvent}
        onClose={() => setEventToDelete(null)}
      />
    </div>
  );
}
