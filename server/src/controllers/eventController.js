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

      const isAdmin = req.user?.email === 'admin@gmail.com' || req.user?.user_metadata?.role === 'admin';

      let query = supabase
        .from('events')
        .select('*')
        .eq('id', eventId);

      if (!isAdmin) {
        query = query.eq('owner_id', req.user.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async deleteEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const isAdmin = req.user?.email === 'admin@gmail.com' || req.user?.user_metadata?.role === 'admin';

      if (isSupabaseEnabled && supabase) {
        if (!isAdmin) {
          const { data: ev } = await supabase.from('events').select('owner_id').eq('id', eventId).single();
          if (!ev || ev.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Permission denied' });
          }
        }

        // Explicitly wipe related participants and results
        await supabase.from('participants').delete().eq('event_id', eventId);
        await supabase.from('results').delete().eq('event_id', eventId);
        await supabase
          .from('events')
          .delete()
          .eq('id', eventId);
      }
      res.json({ success: true, message: 'Event and all related data deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
};
