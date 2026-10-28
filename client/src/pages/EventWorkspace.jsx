import React, { useState, useEffect } from 'react';
import { useParams, Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RotateCw,
  Shuffle,
  UsersRound,
  History,
  Calendar,
  Award
} from 'lucide-react';
import { eventService } from '../services/eventService';

export default function EventWorkspace() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        const data = await eventService.getEventById(eventId);
        setEvent(data);
      } catch (err) {
        console.error('Failed to load event from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const tabs = [
    { name: 'Participants', to: `/app/events/${eventId}`, end: true, icon: Users },
    { name: 'Wheel', to: `/app/events/${eventId}/wheel`, icon: RotateCw },
    { name: 'Tasks & Missions', to: `/app/events/${eventId}/tasks`, icon: Award },
    { name: 'Shuffle', to: `/app/events/${eventId}/shuffle`, icon: Shuffle },
    { name: 'Groups', to: `/app/events/${eventId}/groups`, icon: UsersRound },
    { name: 'Results', to: `/app/events/${eventId}/results`, icon: History },
  ];

  if (loading) {
    return <div className="py-20 text-center text-xs text-gray-400">Loading workspace from Supabase...</div>;
  }

  if (!event) {
    return (
      <div className="py-20 text-center space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Event not found</h3>
        <p className="text-xs text-gray-400">The event could not be found or belongs to another user.</p>
        <Link to="/app/events" className="text-xs font-semibold text-[#635BFF] hover:underline">
          Return to Events List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/app/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Events</span>
        </Link>
      </div>

      {/* Workspace Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF]">
              {event.category || 'General'}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Supabase Cloud Sync</span>
            </span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200">
            {event.participantCount || 0} Participants
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 dark:border-gray-800 pb-px overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.name}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#635BFF] text-[#635BFF] dark:text-[#8881FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Sub-view / Tab content outlet */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
