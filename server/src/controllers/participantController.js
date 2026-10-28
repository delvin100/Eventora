import { supabase, isSupabaseEnabled } from '../config/supabase.js';

export const participantController = {
  async getParticipants(req, res, next) {
    try {
      const { eventId } = req.params;
      if (!isSupabaseEnabled || !supabase) {
        return res.json([]);
      }

      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async addParticipant(req, res, next) {
    try {
      const { eventId } = req.params;
      const { name, external_identifier, metadata } = req.body;
      if (!name) return res.status(400).json({ error: 'Participant name is required' });

      if (!isSupabaseEnabled || !supabase) {
        return res.status(201).json({
          id: 'p-' + Date.now(),
          event_id: eventId,
          name,
          external_identifier: external_identifier || '',
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });
      }

      const { data, error } = await supabase
        .from('participants')
        .insert([{
          event_id: eventId,
          name,
          external_identifier,
          metadata: metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async bulkAddParticipants(req, res, next) {
    try {
      const { eventId } = req.params;
      const { participants: items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Participants array is required' });
      }

      if (!isSupabaseEnabled || !supabase) {
        return res.status(201).json({ count: items.length, success: true });
      }

      const payload = items.map(p => ({
        event_id: eventId,
        name: p.name,
        external_identifier: p.external_identifier || '',
        metadata: p.metadata || {}
      }));

      const { data, error } = await supabase
        .from('participants')
        .insert(payload)
        .select();

      if (error) throw error;
      res.status(201).json({ count: data.length, participants: data });
    } catch (err) {
      next(err);
    }
  },

  async deleteParticipant(req, res, next) {
    try {
      const { eventId, participantId } = req.params;
      if (isSupabaseEnabled && supabase) {
        await supabase
          .from('participants')
          .delete()
          .eq('id', participantId)
          .eq('event_id', eventId);
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};
