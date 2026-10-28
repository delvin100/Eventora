import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  ListOrdered,
  History,
  Plus,
  RotateCw,
  Shuffle,
  UsersRound,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Star,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { eventService } from '../services/eventService';
import { resultService } from '../services/resultService';
import { listService } from '../services/listService';

export default function DashboardOverview() {
  const { user, profile } = useAuth();

  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [savedListsCount, setSavedListsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [eventsData, resultsData, listsData] = await Promise.all([
        eventService.getEvents(),
        resultService.getResults(),
        listService.getSavedLists()
      ]);

      setEvents(eventsData);
      setResults(resultsData);
      setSavedListsCount(listsData.length);
    } catch (err) {
      console.error('Error loading dashboard from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Organizer';
  const totalParticipants = events.reduce((acc, ev) => acc + (ev.participantCount || 0), 0);

  const handleToggleFavorite = async (eventId, currentFavorite) => {
    await eventService.toggleFavorite(eventId, currentFavorite);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_favorite: !currentFavorite } : e));
  };

  return (
    <div className="space-y-8">
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/70 dark:border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span>Welcome, {displayName}</span>
            <Sparkles className="w-5 h-5 text-[#635BFF] animate-pulse" />
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time event overview powered by Supabase.
          </p>
        </div>

        <Link
          to="/app/events/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-sm shadow-md shadow-[#635BFF]/25 hover:shadow-lg transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* 2. STATS / METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Events */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Events</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{events.length}</p>
          </div>
        </div>

        {/* Total Participants */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Participants</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{totalParticipants}</p>
          </div>
        </div>

        {/* Saved Lists */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reusable Lists</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{savedListsCount}</p>
          </div>
        </div>

        {/* Saved Results */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Draw History</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{results.length}</p>
          </div>
        </div>

      </div>

      {/* 3. QUICK ACTIONS BAR */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to={events.length > 0 ? `/app/events/${events[0].id}/wheel` : '/app/events/new'}
            className="p-4 rounded-xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <RotateCw className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">Spin Wheel</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Interactive draw</span>
          </Link>

          <Link
            to={events.length > 0 ? `/app/events/${events[0].id}/shuffle` : '/app/events/new'}
            className="p-4 rounded-xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Shuffle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">Shuffle List</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Random order</span>
          </Link>

          <Link
            to={events.length > 0 ? `/app/events/${events[0].id}/groups` : '/app/events/new'}
            className="p-4 rounded-xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UsersRound className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">Create Groups</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Balanced teams</span>
          </Link>

          <Link
            to="/app/events/new"
            className="p-4 rounded-xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">Create & Import</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Upload spreadsheet</span>
          </Link>
        </div>
      </div>

      {/* 4. MAIN CONTENT: RECENT EVENTS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Active Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Events</h2>
            <Link to="/app/events" className="text-xs font-semibold text-[#635BFF] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading events from Supabase...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#161925] rounded-3xl border border-gray-200/80 dark:border-gray-800 space-y-3">
              <CalendarDays className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">No events created yet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Create your first event workspace to organize participants, spin the wheel, and form teams.
              </p>
              <div className="pt-1">
                <Link
                  to="/app/events/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Event</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF]">
                        {event.category || 'General'}
                      </span>
                      <button
                        onClick={() => handleToggleFavorite(event.id, event.is_favorite)}
                        className="text-gray-400 hover:text-amber-500 cursor-pointer"
                        title={event.is_favorite ? 'Favorited' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${event.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                      <Link to={`/app/events/${event.id}`} className="hover:text-[#635BFF] transition-colors">
                        {event.name}
                      </Link>
                    </h3>
                    {event.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {event.participantCount || 0} Participants
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Active</span>
                      </p>
                    </div>

                    <Link
                      to={`/app/events/${event.id}`}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-[#635BFF] hover:text-white text-gray-600 dark:text-gray-300 transition-colors"
                      title="Open Workspace"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Recent Results Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Results</h2>
            <Link to="/app/results" className="text-xs font-semibold text-[#635BFF] hover:underline">
              View History
            </Link>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            {results.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <History className="w-6 h-6 mx-auto mb-1 text-gray-300 dark:text-gray-600" />
                <p>No results logged yet.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Spins, shuffles, and groups will appear here.</p>
              </div>
            ) : (
              results.slice(0, 4).map((res) => (
                <div key={res.id} className="pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{res.result_name}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(res.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Type: <strong className="capitalize text-[#635BFF]">{res.operation_type}</strong>
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">{res.event_name}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
