import { supabase, isSupabaseEnabled } from '../config/supabase.js';

export const eventController = {
  async getAllEvents(req, res, next) {
    try {
      if (!isSupabaseEnabled || !supabase) {
        return res.status(503).json({ error: 'Supabase database is not configured' });
      }

      const { data, error } = await supabase
        .from('events')
        .select('*, participants(count)')
        .eq('owner_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      next(err);
    }
  },

  async createEvent(req, res, next) {
    try {
      const { name, description, category, accent_color } = req.body;
      if (!name) return res.status(400).json({ error: 'Event name is required' });

      if (!isSupabaseEnabled || !supabase) {
        const newEvent = {
          id: 'event-' + Date.now(),
          name,
          description: description || '',
          category: category || 'General',
          accent_color: accent_color || '#635BFF',
          created_at: new Date().toISOString()
        };
        return res.status(201).json(newEvent);
      }

      const { data, error } = await supabase
        .from('events')
        .insert([{
          owner_id: req.user.id,
          name,
          description,
          category: category || 'General',
          accent_color: accent_color || '#635BFF'
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async getEventById(req, res, next) {
    try {
      const { eventId } = req.params;
      if (!isSupabaseEnabled || !supabase) {
        return res.status(503).json({ error: 'Supabase database is not configured' });
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('owner_id', req.user.id)
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async deleteEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      if (isSupabaseEnabled && supabase) {
        await supabase
          .from('events')
          .delete()
          .eq('id', eventId)
          .eq('owner_id', req.user.id);
      }
      res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
      next(err);
    }
  }
};
