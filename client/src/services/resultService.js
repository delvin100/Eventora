import { supabase } from '../lib/supabase';

export const resultService = {
  // Get all results for the logged-in user or event
  async getResults(eventId = null) {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('results')
      .select('*, events(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching results from Supabase:', error);
      return [];
    }

    return (data || []).map(r => ({
      ...r,
      event_name: r.events?.name || 'General Event'
    }));
  },

  // Save a new draw/shuffle/group result
  async saveResult({ event_id, result_name, operation_type, settings = {}, result_snapshot }) {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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

    if (error) {
      console.error('Error saving result to Supabase:', error);
      throw error;
    }

    return data;
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
