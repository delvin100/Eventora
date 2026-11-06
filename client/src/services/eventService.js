import { supabase } from '../lib/supabase';
import { slugify } from '../utils/slugUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const eventService = {
  // Fetch all events for the current user from Supabase
  async getEvents() {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('events')
      .select('*, participants(id)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events from Supabase:', error);
      return [];
    }

    return (data || []).map(ev => ({
      ...ev,
      participantCount: ev.participants ? ev.participants.length : 0
    }));
  },

  // Get a single event by ID or by Slug/Name
  async getEventById(idOrSlug) {
    if (!idOrSlug) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    if (supabase && isUUID) {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants(id)')
        .eq('id', idOrSlug)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          participantCount: data.participants ? data.participants.length : 0
        };
      }
    }

    // Slug / Name match in Supabase
    if (supabase) {
      const targetSlug = slugify(idOrSlug);
      const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim().toLowerCase();

      const { data, error } = await supabase
        .from('events')
        .select('*, participants(id)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const matched = (data || []).find(ev => {
          const evSlug = slugify(ev.name);
          return evSlug === targetSlug || ev.name.toLowerCase() === cleanName;
        }) || (data || []).find(ev => {
          return ev.name.toLowerCase().includes(cleanName);
        });

        if (matched) {
          return {
            ...matched,
            participantCount: matched.participants ? matched.participants.length : 0
          };
        }
      }
    }

    // Fallback: Query backend API for Special Events (bypasses RLS for authorized normal users)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/special-events/${encodeURIComponent(idOrSlug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.event) {
          return json.event;
        }
      }
    } catch (_) {}

    return null;
  },

  // Create an event
  async createEvent({ name, description, category, accent_color }) {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('events')
      .insert([{
        owner_id: user.id,
        name,
        description: description || '',
        category: category || 'General',
        accent_color: accent_color || '#635BFF',
        status: 'active',
        is_favorite: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Toggle favorite
  async toggleFavorite(eventId, currentFavorite) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('events')
      .update({ is_favorite: !currentFavorite })
      .eq('id', eventId)
      .select()
      .single();

    if (error) console.error('Error toggling favorite:', error);
    return data;
  },

  // Delete event and all associated participants, results, and caches completely
  async deleteEvent(eventId) {
    if (!eventId) return;

    // 1. Try backend API first
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch (_) {}

    if (supabase) {
      // 2. Explicitly delete related participants
      try {
        await supabase
          .from('participants')
          .delete()
          .eq('event_id', eventId);
      } catch (err) {
        console.warn('Error deleting participants for event:', err);
      }

      // 3. Explicitly delete related results (draws, spins, groups, shuffles)
      try {
        await supabase
          .from('results')
          .delete()
          .eq('event_id', eventId);
      } catch (err) {
        console.warn('Error deleting results for event:', err);
      }

      // 4. Delete the event itself
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    }

    // 5. Clean any localStorage keys related to this event
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(eventId)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    return true;
  }
};
