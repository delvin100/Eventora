import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const participantService = {
  // Fetch participants for an event directly from Supabase with backend fallback for special events
  async getParticipants(eventId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }

    // Fallback: Query backend API for Special Events (bypasses RLS for granted normal users)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.participants)) {
          return json.participants;
        }
      }
    } catch (_) {}

    return [];
  },

  // Add single participant directly to Supabase with backend fallback for special events
  async addParticipant(eventId, { name, external_identifier = '', metadata = {} }) {
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Participant name cannot be empty');

    const newRecord = {
      event_id: eventId,
      name: cleanName,
      external_identifier: (external_identifier || '').trim(),
      metadata: metadata || {}
    };

    // 1. Try Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('participants')
        .insert([newRecord])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    }

    // 2. Fallback: Backend API (bypasses RLS for granted special event users)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.participant) {
          return json.participant;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.message) throw new Error(errJson.message);
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('fetch')) {
        throw apiErr;
      }
    }

    throw new Error('Could not add participant. Please try again.');
  },

  // Bulk add participants directly to Supabase with backend fallback for special events
  async bulkAddParticipants(eventId, items) {
    const formatted = items.map(item => ({
      event_id: eventId,
      name: (item.name || '').trim(),
      external_identifier: (item.external_identifier || item.id || '').trim(),
      metadata: item.metadata || {}
    })).filter(p => p.name.length > 0);

    if (formatted.length === 0) return [];

    // 1. Try Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('participants')
        .insert(formatted)
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }

    // 2. Fallback: Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formatted })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.participants)) {
          return json.participants;
        }
      }
    } catch (_) {}

    return [];
  },

  // Update participant with backend fallback
  async updateParticipant(eventId, participantId, updates) {
    // 1. Try Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('participants')
        .update(updates)
        .eq('id', participantId)
        .eq('event_id', eventId)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    }

    // 2. Fallback: Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.participant) {
          return json.participant;
        }
      }
    } catch (_) {}

    return null;
  },

  // Delete participant with backend fallback
  async deleteParticipant(eventId, participantId) {
    // 1. Try Supabase
    if (supabase) {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId)
        .eq('event_id', eventId);

      if (!error) return true;
    }

    // 2. Fallback: Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE'
      });
      if (res.ok) return true;
    } catch (_) {}

    return true;
  },

  // Bulk delete with backend fallback
  async bulkDelete(eventId, participantIds) {
    if (!participantIds || participantIds.length === 0) return true;

    // 1. Try Supabase
    if (supabase) {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', participantIds)
        .eq('event_id', eventId);

      if (!error) return true;
    }

    // 2. Fallback: Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds })
      });
      if (res.ok) return true;
    } catch (_) {}

    return true;
  }
};
