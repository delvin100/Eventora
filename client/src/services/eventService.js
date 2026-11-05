import { supabase } from '../lib/supabase';
import { slugify } from '../utils/slugUtils';

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
    if (!supabase || !idOrSlug) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    if (isUUID) {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants(id)')
        .eq('id', idOrSlug)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event by id:', error);
        return null;
      }

      return data ? {
        ...data,
        participantCount: data.participants ? data.participants.length : 0
      } : null;
    }

    // Slug / Name match:
    const targetSlug = slugify(idOrSlug);
    const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim().toLowerCase();

    // Query events
    const { data, error } = await supabase
      .from('events')
      .select('*, participants(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event by slug:', error);
      return null;
    }

    const matched = (data || []).find(ev => {
      const evSlug = slugify(ev.name);
      return evSlug === targetSlug || ev.name.toLowerCase() === cleanName;
    }) || (data || []).find(ev => {
      return ev.name.toLowerCase().includes(cleanName);
    });

    if (!matched) return null;

    return {
      ...matched,
      participantCount: matched.participants ? matched.participants.length : 0
    };
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

  // Delete event
  async deleteEvent(eventId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  }
};
