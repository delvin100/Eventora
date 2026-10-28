import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import EventParticipantsView from '../components/participants/EventParticipantsView';
import { eventService } from '../services/eventService';

export default function EventParticipantsPage() {
  const { eventId } = useParams();
  const [eventName, setEventName] = useState('Event');

  useEffect(() => {
    async function fetchName() {
      try {
        const ev = await eventService.getEventById(eventId);
        if (ev?.name) {
          setEventName(ev.name);
        }
      } catch (e) {
        console.error('Failed to fetch event name from Supabase:', e);
      }
    }
    fetchName();
  }, [eventId]);

  return <EventParticipantsView eventId={eventId} eventName={eventName} />;
}
