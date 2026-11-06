import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const resultService = {
  // Get all results for the logged-in user or event (excluding internal special event configuration records)
  async getResults(eventId = null) {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('results')
      .select('*, events(name)')
      .not('operation_type', 'like', 'special_event_%')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    } else {
      query = query.eq('owner_id', user.id);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const cleanResults = data.filter(r => {
        const type = (r.operation_type || r.type || '').toLowerCase();
        return !type.startsWith('special_event_') && type !== 'quiz';
      });

      return cleanResults.map(r => ({
        ...r,
        event_name: r.events?.name || 'General Event'
      }));
    }

    // Backend fallback for admin or shared events
    if (eventId) {
      try {
        const res = await fetch(`${API_BASE_URL}/ps/events/${eventId}/results`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.results)) {
            return json.results;
          }
        }
      } catch (_) {}
    }

    return [];
  },

  // Save a new draw/shuffle/group result
  async saveResult({ event_id, result_name, operation_type, settings = {}, result_snapshot }) {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('results')
        .insert([{
          event_id,
          owner_id: user.id,
          result_name,
          operation_type,
          settings,
          result_snapshot
        }])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (_) {}

    // Backend fallback (bypasses RLS for admin acting on other users' events)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/events/${event_id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_name,
          operation_type,
          settings,
          result_snapshot,
          owner_id: user.id
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.result) {
          return json.result;
        }
      }
    } catch (_) {}

    return null;
  },

  // Delete result
  async deleteResult(resultId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', resultId);

    if (error) throw error;
    return true;
  }
};
