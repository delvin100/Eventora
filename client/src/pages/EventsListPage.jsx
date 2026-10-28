import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CalendarDays, Star, ArrowRight } from 'lucide-react';
import { eventService } from '../services/eventService';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Classroom', 'Team activity', 'Lucky draw', 'Tournament', 'Personal', 'General'];

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error loading events from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleToggleFavorite = async (eventId, currentFavorite) => {
    await eventService.toggleFavorite(eventId, currentFavorite);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_favorite: !currentFavorite } : e));
  };

  const filtered = events.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">My Events</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Organize participants, spinning wheels, shuffles, and groups by event.
          </p>
        </div>

        <Link
          to="/app/events/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold shadow-md shadow-[#635BFF]/25 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by name or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#635BFF] text-white shadow-sm'
                  : 'bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading events from Supabase...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(event => (
            <div
              key={event.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-[#635BFF]/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
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
                <Link
                  to={`/app/events/${event.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#635BFF] hover:underline"
                >
                  <span>Open Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-[#161925] rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
              <CalendarDays className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">No events found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {search ? 'Try clearing your search filters.' : 'Get started by creating your first event.'}
              </p>
              {!search && (
                <div className="pt-2">
                  <Link
                    to="/app/events/new"
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
    </div>
  );
}
