import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Search,
  Users,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { specialEventService } from '../../services/specialEventService';

function StylishEventDropdown({
  events = [],
  selectedEventId,
  onSelectEvent,
  showOrganizer = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'standard', 'special'
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0] || null;

  const filteredEvents = events.filter(ev => {
    const isSpecial = ev.category === 'Special Event' || ev.isSpecialEvent;
    if (filterType === 'standard' && isSpecial) return false;
    if (filterType === 'special' && !isSpecial) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = ev.name?.toLowerCase().includes(q);
    const ownerMatch = (ev.creatorName && ev.creatorName.toLowerCase().includes(q)) ||
      (ev.owner?.displayName && ev.owner.displayName.toLowerCase().includes(q)) ||
      (ev.owner?.email && ev.owner.email.toLowerCase().includes(q));
    return nameMatch || ownerMatch;
  });

  const standardCount = events.filter(e => e.category !== 'Special Event' && !e.isSpecialEvent).length;
  const specialCount = events.filter(e => e.category === 'Special Event' || e.isSpecialEvent).length;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] hover:border-[#635BFF]/60 dark:hover:border-[#635BFF]/60 text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedEvent ? (
            <>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedEvent.category === 'Special Event' || selectedEvent.isSpecialEvent
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-violet-50 dark:bg-violet-950/60 text-[#635BFF] border border-violet-200/50 dark:border-violet-800/50'
              }`}>
                {selectedEvent.category === 'Special Event' || selectedEvent.isSpecialEvent ? (
                  <Crown className="w-4 h-4 text-amber-500" />
                ) : (
                  <CalendarDays className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-gray-900 dark:text-white truncate max-w-[190px]">
                    {selectedEvent.name}
                  </span>
                  {selectedEvent.category === 'Special Event' || selectedEvent.isSpecialEvent ? (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      Special Event
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      Standard
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-2 mt-0.5">
                  <span>{selectedEvent.participantCount || 0} participants</span>
                  {showOrganizer && (selectedEvent.creatorName || selectedEvent.owner?.displayName) && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[150px] text-violet-600 dark:text-violet-400 font-semibold">
                        Organizer: {selectedEvent.creatorName || selectedEvent.owner?.displayName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-gray-400 italic">Select an event...</span>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#635BFF]' : ''}`} />
      </button>

      {/* Options Panel (Rendered in-flow so it naturally expands the modal and never clips) */}
      {isOpen && (
        <div className="mt-2.5 rounded-2xl bg-gray-50/90 dark:bg-[#151826] border border-gray-200 dark:border-gray-700/80 p-3 space-y-2.5 animate-in fade-in duration-150">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter events by name..."
              className="w-full pl-8.5 pr-7 py-2 rounded-xl bg-white dark:bg-[#10121B] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-gray-200/60 dark:bg-[#0D0F17] rounded-xl text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-[#1F2438] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('standard')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'standard'
                  ? 'bg-white dark:bg-[#1F2438] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Standard ({standardCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('special')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'special'
                  ? 'bg-white dark:bg-[#1F2438] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Special ({specialCount})
            </button>
          </div>

          {/* Scrollable Events List */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {filteredEvents.map((ev) => {
              const isSelected = ev.id === selectedEventId;
              const isSpecial = ev.category === 'Special Event' || ev.isSpecialEvent;

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    onSelectEvent(ev.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-50 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800/80 text-[#635BFF] dark:text-violet-300 shadow-xs'
                      : 'bg-white dark:bg-[#12141F] border border-gray-100 dark:border-gray-800/60 hover:border-violet-300 dark:hover:border-violet-700/60 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSpecial
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-violet-50 dark:bg-violet-950/50 text-[#635BFF] border border-violet-200/40 dark:border-violet-800/40'
                    }`}>
                      {isSpecial ? (
                        <Crown className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CalendarDays className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs truncate max-w-[210px] text-gray-900 dark:text-white">
                          {ev.name}
                        </span>
                        {isSpecial ? (
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            Special
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{ev.participantCount || 0} participants</span>
                        {showOrganizer && (ev.creatorName || ev.owner?.displayName) && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px] text-violet-600 dark:text-violet-400 font-semibold">
                              Organizer: {ev.creatorName || ev.owner?.displayName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#635BFF] shrink-0" />
                  )}
                </button>
              );
            })}

            {filteredEvents.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                No matching events found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CopyToListModal({
  isOpen,
  onClose,
  list,
  events: initialEvents = [],
  onConfirmCopy
}) {
  const { user, profile } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
  const adminDisplayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';

  const [showAllUsers, setShowAllUsers] = useState(() => {
    try {
      return localStorage.getItem('eventora_admin_copy_list_all_events') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [eventsList, setEventsList] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [copying, setCopying] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Load standard and special events
  const loadEvents = async () => {
    try {
      setLoadingEvents(true);

      const [standardData, specialData] = await Promise.all([
        (isAdmin && showAllUsers)
          ? eventService.getAllUsersEvents(user)
          : eventService.getEvents(),
        specialEventService.getSpecialEvents(user).catch(() => [])
      ]);

      // Normalize special events
      const normalizedSpecial = (specialData || []).map(ev => ({
        ...ev,
        isSpecialEvent: true,
        category: 'Special Event'
      }));

      // Combine standard and special events, deduplicated by ID
      const map = new Map();
      (standardData || []).forEach(ev => map.set(ev.id, ev));
      normalizedSpecial.forEach(ev => {
        const existing = map.get(ev.id);
        map.set(ev.id, {
          ...existing,
          ...ev,
          owner: existing?.owner || ev.owner || (ev.owner_id === user?.id ? { displayName: adminDisplayName, email: user?.email } : null),
          isSpecialEvent: true,
          category: 'Special Event'
        });
      });

      const combined = Array.from(map.values()).map(ev => {
        const isCreatedByAdmin = Boolean(
          (user?.id && (ev.owner_id === user.id || ev.owner?.id === user.id)) ||
          (user?.email && ev.owner?.email && ev.owner.email.toLowerCase() === user.email.toLowerCase()) ||
          (isAdmin && (!ev.owner_id || ev.owner_id === user?.id))
        );
        const resolvedCreatorName = isCreatedByAdmin
          ? adminDisplayName
          : (ev.owner?.displayName || ev.owner?.email?.split('@')[0] || 'Organizer');

        return {
          ...ev,
          creatorName: resolvedCreatorName,
          isSpecialEvent: ev.category === 'Special Event' || Boolean(ev.isSpecialEvent)
        };
      });
      setEventsList(combined);

      if (combined.length > 0) {
        setSelectedEventId(prev => (combined.some(e => e.id === prev) ? prev : combined[0].id));
      }
    } catch (err) {
      console.error('Failed to load events for copy modal:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen, showAllUsers, isAdmin]);

  if (!isOpen || !list) return null;

  const handleToggleShowAllUsers = (checked) => {
    setShowAllUsers(checked);
    try {
      localStorage.setItem('eventora_admin_copy_list_all_events', String(checked));
    } catch (_) {}
  };

  const handleCopy = async () => {
    if (!selectedEventId || copying) return;
    try {
      setCopying(true);
      await onConfirmCopy(list, selectedEventId);
      setCopiedSuccess(true);
      setTimeout(() => {
        setCopiedSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error copying list to event:', err);
    } finally {
      setCopying(false);
    }
  };

  const targetEvent = eventsList.find(e => e.id === selectedEventId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-[#635BFF]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Copy List to Event</h3>
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Copying <strong className="text-gray-900 dark:text-white font-bold">{list.name}</strong> ({list.entries?.length || list.count || 0} participants) will create an independent snapshot in the selected event workspace.
          </p>

          {/* Admin toggle for all users' events */}
          {isAdmin && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/40">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAllUsers}
                  onChange={(e) => handleToggleShowAllUsers(e.target.checked)}
                  className="w-4 h-4 rounded text-[#635BFF] focus:ring-[#635BFF]/30 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer accent-[#635BFF]"
                />
                <span>Show all users' events</span>
              </label>
              {showAllUsers && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-200/70 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                  {eventsList.length} Total
                </span>
              )}
            </div>
          )}

          {/* Target Event Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Select Target Event
              </label>
              {loadingEvents && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-[#635BFF]" />
                  Loading...
                </span>
              )}
            </div>

            <StylishEventDropdown
              events={eventsList}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              showOrganizer={isAdmin && showAllUsers}
            />
          </div>

          {copiedSuccess ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Participants successfully copied to {targetEvent?.name || 'Event'}!</span>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!selectedEventId || copying || loadingEvents}
                className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Copying...</span>
                  </>
                ) : (
                  <>
                    <span>Copy to Event</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
