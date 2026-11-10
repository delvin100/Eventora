import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const listService = {
  // Fetch all saved lists across all users (Admin only)
  async getAllUsersLists(user = null) {
    let currentUser = user;
    if (!currentUser && supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user;
      } catch (_) {}
    }

    const email = currentUser?.email || '';

    // 1. Try Backend Admin API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/admin/all-lists?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.lists)) {
          return json.lists;
        }
      }
    } catch (err) {
      console.warn('Backend all-lists API fetch failed, trying fallback:', err);
    }

    // 2. Supabase Fallback (if user has direct access)
    if (supabase) {
      try {
        const [{ data: lists, error: listsErr }, { data: profiles }] = await Promise.all([
          supabase.from('saved_lists').select('*, saved_list_entries(*)').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*')
        ]);

        if (listsErr) throw listsErr;

        const profileMap = new Map();
        (profiles || []).forEach(p => profileMap.set(p.id, p));

        return (lists || []).map(l => {
          const profile = profileMap.get(l.owner_id);
          const ownerEmail = profile?.display_name?.includes('@')
            ? profile.display_name
            : `${profile?.display_name?.toLowerCase().replace(/\s+/g, '') || 'user'}@eventora.app`;
          return {
            ...l,
            entries: l.saved_list_entries || [],
            count: l.saved_list_entries ? l.saved_list_entries.length : 0,
            owner: {
              id: l.owner_id,
              displayName: profile?.display_name || 'Organizer',
              email: ownerEmail,
              usageType: profile?.usage_type || 'personal'
            }
          };
        });
      } catch (fbErr) {
        console.error('Supabase fallback all-lists failed:', fbErr);
      }
    }

    return [];
  },

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
      entries: l.saved_list_entries || [],
      count: l.saved_list_entries ? l.saved_list_entries.length : 0
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
  async deleteSavedList(listId, currentUser = null) {
    if (!listId) return false;

    // 1. Try Backend Admin API
    try {
      let email = currentUser?.email;
      if (!email && supabase) {
        const { data } = await supabase.auth.getUser();
        email = data?.user?.email;
      }
      if (email) {
        const res = await fetch(`${API_BASE_URL}/ps/admin/lists/${listId}?email=${encodeURIComponent(email)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return true;
        }
      }
    } catch (err) {
      console.warn('Backend admin delete list failed, falling back to direct Supabase:', err);
    }

    // 2. Direct Supabase delete
    if (supabase) {
      await supabase.from('saved_list_entries').delete().eq('list_id', listId);
      const { error } = await supabase
        .from('saved_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
      return true;
    }

    return false;
  }
};
