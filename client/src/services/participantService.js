import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const participantService = {
  // Fetch participants for an event directly from Supabase
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

    // Fallback: Query backend API for Special Events (bypasses RLS)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/participants`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.participants) && json.participants.length > 0) {
          return json.participants;
        }
      }
    } catch (_) {}

    return [];
  },

  // Add single participant directly to Supabase
  async addParticipant(eventId, { name, external_identifier = '', metadata = {} }) {
    if (!supabase) throw new Error('Supabase is not configured');

    const newRecord = {
      event_id: eventId,
      name: name.trim(),
      external_identifier: (external_identifier || '').trim(),
      metadata: metadata || {}
    };

    const { data, error } = await supabase
      .from('participants')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('Error adding participant to Supabase:', error);
      throw error;
    }

    return data;
  },

  // Bulk add participants directly to Supabase
  async bulkAddParticipants(eventId, items) {
    if (!supabase) throw new Error('Supabase is not configured');

    const formatted = items.map(item => ({
      event_id: eventId,
      name: (item.name || '').trim(),
      external_identifier: (item.external_identifier || item.id || '').trim(),
      metadata: item.metadata || {}
    })).filter(p => p.name.length > 0);

    if (formatted.length === 0) return [];

    const { data, error } = await supabase
      .from('participants')
      .insert(formatted)
      .select();

    if (error) {
      console.error('Error bulk adding participants to Supabase:', error);
      throw error;
    }

    return data;
  },

  // Update participant
  async updateParticipant(eventId, participantId, updates) {
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', participantId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating participant in Supabase:', error);
      throw error;
    }

    return data;
  },

  // Delete participant
  async deleteParticipant(eventId, participantId) {
    if (!supabase) return;

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error deleting participant from Supabase:', error);
      throw error;
    }

    return true;
  },

  // Bulk delete
  async bulkDelete(eventId, participantIds) {
    if (!supabase || participantIds.length === 0) return;

    const { error } = await supabase
      .from('participants')
      .delete()
      .in('id', participantIds)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error bulk deleting participants from Supabase:', error);
      throw error;
    }

    return true;
  }
};
