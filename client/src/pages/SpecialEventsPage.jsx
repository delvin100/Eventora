import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  UsersRound,
  ArrowRight,
  Trash2,
  CalendarDays,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Settings,
  Users
} from 'lucide-react';
import { specialEventService } from '../services/specialEventService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import UserAllocationModal from '../components/specialEvents/UserAllocationModal';
import SpecialEventUserAccessModal from '../components/specialEvents/SpecialEventUserAccessModal';
import { formatDate } from '../utils/dateUtils';
import { slugify } from '../utils/slugUtils';

export default function SpecialEventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Dialog State
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // User Allocation Modal State
  const [allocationEvent, setAllocationEvent] = useState(null);

  // User Access Settings Modal State (Admin only)
  const [userAccessEvent, setUserAccessEvent] = useState(null);

  const loadSpecialEvents = async () => {
    try {
      setLoading(true);
      const data = await specialEventService.getSpecialEvents(user);
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load special events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecialEvents();
  }, [user?.id, user?.email]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setModalError('Please enter an event name.');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');
      const created = await specialEventService.createSpecialEvent({
        name: eventName,
        description: eventDescription
      });

      setEvents(prev => [created, ...prev]);
      setEventName('');
      setEventDescription('');
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Failed to create special event.');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setDeleteLoading(true);
      await specialEventService.deleteSpecialEvent(eventToDelete.id);
      setEvents(prev => prev.filter(ev => ev.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      console.error('Failed to delete special event:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#2E1065] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Special Events
            </h1>
            <p className="text-sm text-violet-200/80 max-w-xl">
              Create high-priority events, manage privileged selections, and allocate specific users with controlled access levels.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Add Special Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      {events.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search special events..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151823] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {filteredEvents.length} special event{filteredEvents.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Main Content: List or Empty */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading special events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white dark:bg-[#151823] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No Special Events Yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {isAdmin
              ? 'Special events are customized events created only by admins. Once created, you can allocate users with specific access rights.'
              : 'You do not have access to any special events yet. Contact the administrator to grant you access.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Special Event</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to={`/app/events/${slugify(event.name)}`}
              state={{ fromSpecialEvents: true }}
              className="group relative flex flex-col justify-between bg-white dark:bg-[#151823] rounded-2xl border border-gray-200/90 dark:border-gray-800/90 p-5 hover:border-violet-500/60 dark:hover:border-violet-500/60 shadow-sm hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-200"
            >
              <div>
                {/* Card Top: Crown Tag + Admin Settings & Delete */}
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200/60 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-[11px] font-bold uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Special Event</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserAccessEvent(event);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                        title="User Access Settings (Grant access to other users)"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEventToDelete(event);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete Special Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Event Name */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                  {event.name}
                </h3>

                {/* Event Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                  {event.description || 'Special event with allocated access.'}
                </p>

                {/* User Allocation Action Pill (Admin only) */}
                {isAdmin && (
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAllocationEvent(event);
                    }}
                    className="mt-4 p-2.5 rounded-xl bg-gray-50 dark:bg-[#11131C] border border-gray-100 dark:border-gray-800 hover:border-violet-500/60 dark:hover:border-violet-500/60 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 flex items-center justify-between text-xs cursor-pointer transition-all group/alloc"
                    title="Click to allocate usernames & passwords for this event"
                  >
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold">User Allocation</span>
                    </div>
                    <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/80 px-2.5 py-1 rounded-lg border border-violet-200/50 dark:border-violet-800/50 group-hover/alloc:bg-violet-600 group-hover/alloc:text-white transition-all flex items-center gap-1">
                      <span>{event.allocatedUserCount > 0 ? `${event.allocatedUserCount} User${event.allocatedUserCount === 1 ? '' : 's'}` : 'Allocate Users +'}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>
                    {event.created_at ? formatDate(event.created_at) : 'Active'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Open Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* =====================================================================
          ADD SPECIAL EVENT MODAL
         ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-[#181B26] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-indigo-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/30">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Create Special Event
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Special Event Setup
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Event Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Special Event Name
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. VIP Gala Selection or Executive Raffle"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Description / Purpose (Optional)
                </label>
                <textarea
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Notes about this special event and allocated users..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-violet-600/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {modalLoading ? 'Creating...' : 'Create Special Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Stylish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        title={eventToDelete ? `Delete "${eventToDelete.name}"?` : 'Delete Special Event'}
        message="Are you sure you want to delete this special event? All participants and results will be permanently removed. This action cannot be undone."
        confirmText="Delete Special Event"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={confirmDeleteEvent}
        onCancel={() => setEventToDelete(null)}
      />

      {/* User Allocation Modal */}
      <UserAllocationModal
        isOpen={Boolean(allocationEvent)}
        onClose={() => setAllocationEvent(null)}
        event={allocationEvent}
        onAllocationsUpdated={(eventId, count) => {
          setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, allocatedUserCount: count } : ev));
        }}
      />

      {/* User Access Settings Modal (Admin) */}
      <SpecialEventUserAccessModal
        isOpen={Boolean(userAccessEvent)}
        onClose={() => setUserAccessEvent(null)}
        event={userAccessEvent}
        onUpdated={loadSpecialEvents}
      />
    </div>
  );
}

