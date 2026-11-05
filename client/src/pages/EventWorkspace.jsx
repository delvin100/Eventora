import React, { useState, useEffect } from 'react';
import { useParams, Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RotateCw,
  Shuffle,
  UsersRound,
  History,
  Award,
  Settings,
  Crown,
  FileText
} from 'lucide-react';
import { eventService } from '../services/eventService';
import { specialEventService } from '../services/specialEventService';
import { specialEventLiveService } from '../services/specialEventLiveService';
import SpecialEventDetailedReportModal from '../components/specialEvents/SpecialEventDetailedReportModal';
import { useAuth } from '../context/AuthContext';
import { slugify } from '../utils/slugUtils';

export default function EventWorkspace() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportScores, setReportScores] = useState([]);
  const [specialSettings, setSpecialSettings] = useState(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        setAccessDenied(false);
        const data = await eventService.getEventById(eventId);
        setEvent(data);
        if (data?.category === 'Special Event') {
          const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
          if (!isAdmin) {
            const grantedUsers = await specialEventService.getSpecialEventUserAccess(data.id);
            const hasAccess = grantedUsers.some(u =>
              (u.id && u.id === user?.id) ||
              (u.userId && u.userId === user?.id) ||
              (u.email && user?.email && u.email.toLowerCase() === user.email.toLowerCase())
            );
            if (!hasAccess) {
              setAccessDenied(true);
              setLoading(false);
              return;
            }
          }

          try {
            const known = JSON.parse(sessionStorage.getItem('eventora_special_event_ids') || '[]');
            const slug = data.name ? slugify(data.name) : '';
            let changed = false;
            if (data.id && !known.includes(data.id)) { known.push(data.id); changed = true; }
            if (slug && !known.includes(slug)) { known.push(slug); changed = true; }
            if (changed) sessionStorage.setItem('eventora_special_event_ids', JSON.stringify(known));
          } catch (_) {}
        }
        if (data?.name) {
          document.title = `${data.name} | Eventora`;
          const slug = slugify(data.name);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
          if (isUUID && slug) {
            const newPath = location.pathname.replace(eventId, slug);
            navigate(newPath + location.search, { replace: true, state: location.state });
          }
        }
      } catch (err) {
        console.error('Failed to load event from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();

    return () => {
      document.title = 'Eventora';
    };
  }, [eventId, user?.id, user?.email]);

  const isSpecialEvent = event?.category === 'Special Event' || location.state?.fromSpecialEvents;
  const backPath = isSpecialEvent ? '/app/special-events' : '/app/events';
  const backLabel = isSpecialEvent ? 'Special Events' : 'All Events';

  const currentSlug = event?.name ? slugify(event.name) : eventId;

  const tabs = [
    { name: 'Participants', to: `/app/events/${currentSlug}`, end: true, icon: Users },
    { name: 'Wheel', to: `/app/events/${currentSlug}/wheel`, icon: RotateCw },
    { name: 'Tasks & Missions', to: `/app/events/${currentSlug}/tasks`, icon: Award },
    { name: 'Shuffle', to: `/app/events/${currentSlug}/shuffle`, icon: Shuffle },
    { name: 'Groups', to: `/app/events/${currentSlug}/groups`, icon: UsersRound },
    { name: 'Results', to: `/app/events/${currentSlug}/results`, icon: History },
  ];

  // For Special Events only: add Settings tab after Results
  if (isSpecialEvent) {
    tabs.push({
      name: 'Settings',
      to: `/app/events/${currentSlug}/settings`,
      icon: Settings
    });
  }

  if (loading) {
    return <div className="py-20 text-center text-xs text-gray-400">Loading workspace...</div>;
  }

  if (accessDenied) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
          <Crown className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Special Event Access Restricted</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This is a restricted special event. You have not been granted access by the administrator to view or interact with this workspace.
        </p>
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
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
      {/* Back button & Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-gray-900 dark:text-white font-bold">{event.name}</span>
      </nav>

      {/* Workspace Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {isSpecialEvent ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 dark:bg-[#241C52] border border-violet-500/30 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold uppercase tracking-wider shadow-xs">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Special Event</span>
              </div>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF]">
                {event.category || 'General'}
              </span>
            )}
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
              state={isSpecialEvent ? { fromSpecialEvents: true } : undefined}
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
        <Outlet context={{ event, eventId: event?.id }} />
      </div>

      {/* Special Event Detailed Report Modal */}
      <SpecialEventDetailedReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        eventId={event?.id}
        eventName={event?.name || 'Special Event'}
        eventCategory={event?.category || 'Special Event'}
        participants={event?.participants || []}
        specialSettings={specialSettings}
        scores={reportScores}
      />
    </div>
  );
}
