import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const userService = {
  // Fetch all registered users except admin
  async getUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/registered-users`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return data.users;
        }
      }
    } catch (_) {}

    // Fallback: Query directly from Supabase
    if (supabase) {
      try {
        const [{ data: profiles }, { data: allEvents }] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('events').select('id, owner_id')
        ]);

        const eventCountMap = new Map();
        (allEvents || []).forEach(e => {
          eventCountMap.set(e.owner_id, (eventCountMap.get(e.owner_id) || 0) + 1);
        });

        return (profiles || [])
          .filter(p => p.id !== 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1' && !p.display_name?.toLowerCase().includes('admin'))
          .map(p => ({
            id: p.id,
            email: p.display_name?.includes('@') ? p.display_name : `${p.display_name?.toLowerCase().replace(/\s+/g, '')}@eventora.app`,
            displayName: p.display_name || 'User',
            usageType: p.usage_type || 'personal',
            createdAt: p.created_at || null,
            eventsCount: eventCountMap.get(p.id) || 0
          }));
      } catch (err) {
        console.error('Error fetching profiles fallback:', err);
      }
    }

    return [];
  },

  // Delete a user account and ALL data related to that account
  async deleteUser(userId) {
    if (!userId) throw new Error('User ID is required');

    // Never allow deleting the master admin
    if (userId === 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1') {
      throw new Error('Master admin account cannot be deleted');
    }

    // Try API route first
    let apiSuccess = false;
    try {
      const res = await fetch(`${API_BASE_URL}/ps/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          apiSuccess = true;
          return true;
        }
      }
    } catch (_) {}

    // Fallback via Supabase client
    if (!apiSuccess && supabase) {
      try {
        // 1. Find user's events
        const { data: userEvents } = await supabase
          .from('events')
          .select('id')
          .eq('owner_id', userId);

        const eventIds = (userEvents || []).map(e => e.id);
        if (eventIds.length > 0) {
          await supabase.from('participants').delete().in('event_id', eventIds);
          await supabase.from('results').delete().in('event_id', eventIds);
          await supabase.from('events').delete().in('id', eventIds);
        }

        // Delete direct results
        await supabase.from('results').delete().eq('owner_id', userId);

        // 2. Find user's saved lists
        const { data: userLists } = await supabase
          .from('saved_lists')
          .select('id')
          .eq('owner_id', userId);

        const listIds = (userLists || []).map(l => l.id);
        if (listIds.length > 0) {
          await supabase.from('saved_list_entries').delete().in('list_id', listIds);
          await supabase.from('saved_lists').delete().in('id', listIds);
        }

        // 3. Remove user from special event access
        const { data: accessRecords } = await supabase
          .from('results')
          .select('id, result_snapshot')
          .eq('operation_type', 'special_event_user_access');

        for (const rec of (accessRecords || [])) {
          if (Array.isArray(rec.result_snapshot)) {
            const filtered = rec.result_snapshot.filter(u => u.id !== userId && u.userId !== userId);
            if (filtered.length !== rec.result_snapshot.length) {
              await supabase.from('results').update({ result_snapshot: filtered }).eq('id', rec.id);
            }
          }
        }

        // 4. Delete profile
        await supabase.from('profiles').delete().eq('id', userId);

        return true;
      } catch (err) {
        console.error('Error deleting user data via Supabase fallback:', err);
        throw err;
      }
    }

    return true;
  }
};

