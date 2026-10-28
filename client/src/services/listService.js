import { supabase } from '../lib/supabase';

export const listService = {
  // Fetch all saved lists with their entries for the logged-in user
  async getSavedLists() {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_lists')
      .select('*, saved_list_entries(*)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved lists from Supabase:', error);
      return [];
    }

    return (data || []).map(l => ({
      ...l,
      entries: l.saved_list_entries || []
    }));
  },

  // Create a new saved list with entries
  async createSavedList({ name, description = '', category = 'General', entries = [] }) {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Create list
    const { data: list, error: listError } = await supabase
      .from('saved_lists')
      .insert([{
        owner_id: user.id,
        name,
        description,
        category
      }])
      .select()
      .single();

    if (listError) throw listError;

    // 2. Insert entries if any
    if (entries.length > 0) {
      const formattedEntries = entries.map((e, idx) => ({
        list_id: list.id,
        name: e.name,
        external_identifier: e.external_identifier || '',
        position: idx
      }));

      const { data: createdEntries, error: entryError } = await supabase
        .from('saved_list_entries')
        .insert(formattedEntries)
        .select();

      if (entryError) console.error('Error inserting list entries:', entryError);
      list.entries = createdEntries || [];
    } else {
      list.entries = [];
    }

    return list;
  },

  // Delete a saved list
  async deleteSavedList(listId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('saved_lists')
      .delete()
      .eq('id', listId);

    if (error) throw error;
    return true;
  }
};
