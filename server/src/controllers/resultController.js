import { supabase, isSupabaseEnabled } from '../config/supabase.js';

export const resultController = {
  async getEventResults(req, res, next) {
    try {
      const { eventId } = req.params;
      if (!isSupabaseEnabled || !supabase) {
        return res.json([]);
      }

      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('event_id', eventId)
        .not('operation_type', 'like', 'special_event_%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const cleanData = (data || []).filter(r => !(r.operation_type || '').toLowerCase().startsWith('special_event_'));
      res.json(cleanData);
    } catch (err) {
      next(err);
    }
  },

  async createResult(req, res, next) {
    try {
      const { event_id, result_name, operation_type, settings, result_snapshot } = req.body;
      if (!result_name || !operation_type || !result_snapshot) {
        return res.status(400).json({ error: 'Missing required result fields' });
      }

      if (!isSupabaseEnabled || !supabase) {
        const newResult = {
          id: 'res-' + Date.now(),
          event_id,
          owner_id: req.user.id,
          result_name,
          operation_type,
          settings: settings || {},
          result_snapshot,
          created_at: new Date().toISOString()
        };
        return res.status(201).json(newResult);
      }

      const { data, error } = await supabase
        .from('results')
        .insert([{
          event_id,
          owner_id: req.user.id,
          result_name,
          operation_type,
          settings: settings || {},
          result_snapshot
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async deleteResult(req, res, next) {
    try {
      const { resultId } = req.params;
      if (isSupabaseEnabled && supabase) {
        await supabase
          .from('results')
          .delete()
          .eq('id', resultId)
          .eq('owner_id', req.user.id);
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};
