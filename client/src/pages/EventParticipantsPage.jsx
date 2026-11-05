import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import EventParticipantsView from '../components/participants/EventParticipantsView';
import { eventService } from '../services/eventService';

export default function EventParticipantsPage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const [resolvedEvent, setResolvedEvent] = useState(outletCtx?.event || null);

  useEffect(() => {
    if (outletCtx?.event) {
      setResolvedEvent(outletCtx.event);
      return;
    }
    async function fetchEvent() {
      try {
        const ev = await eventService.getEventById(paramId);
        if (ev) setResolvedEvent(ev);
      } catch (e) {
        console.error('Failed to fetch event:', e);
      }
    }
    fetchEvent();
  }, [paramId, outletCtx?.event]);

  const effectiveId = resolvedEvent?.id || outletCtx?.eventId || paramId;
  const effectiveName = resolvedEvent?.name || 'Event';

  return (
    <EventParticipantsView
      eventId={effectiveId}
      eventName={effectiveName}
      onParticipantCountChange={outletCtx?.onParticipantCountChange}
    />
  );
}
