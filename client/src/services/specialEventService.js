import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const specialEventService = {
  // Fetch all special events (category: 'Special Event') with participant, allocation, and user access counts
  // Admins see all special events. Normal users ONLY see special events they have been granted access to.
  async getSpecialEvents(currentUser) {
    let user = currentUser;
    if (!user && supabase) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }
    if (!user) return [];

    const isAdmin = user.email === 'admin@gmail.com' || user.user_metadata?.role === 'admin';

    // 1. Try fetching via backend API (uses service-role key to bypass Supabase RLS)
    try {
      const query = `?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`;
      const res = await fetch(`${API_BASE_URL}/ps/special-events${query}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.events)) {
          return json.events;
        }
      }
    } catch (_) {}

    // 2. Direct Supabase Fallback
    if (!supabase) return [];

    if (isAdmin) {
      const [{ data: eventsData, error: evErr }, { data: allocData }, { data: accessData }] = await Promise.all([
        supabase
          .from('events')
          .select('*, participants(id)')
          .eq('category', 'Special Event')
          .order('created_at', { ascending: false }),
        supabase
          .from('results')
          .select('event_id, result_snapshot')
          .eq('operation_type', 'special_event_allocations'),
        supabase
          .from('results')
          .select('event_id, result_snapshot')
          .eq('operation_type', 'special_event_user_access')
      ]);

      if (evErr) {
        console.error('Error fetching special events from Supabase:', evErr);
        return [];
      }

      const allocCountMap = {};
      (allocData || []).forEach(r => {
        allocCountMap[r.event_id] = Array.isArray(r.result_snapshot) ? r.result_snapshot.length : 0;
      });

      const accessCountMap = {};
      (accessData || []).forEach(r => {
        accessCountMap[r.event_id] = Array.isArray(r.result_snapshot) ? r.result_snapshot.length : 0;
      });

      return (eventsData || []).map(ev => ({
        ...ev,
        participantCount: ev.participants ? ev.participants.length : 0,
        allocatedUserCount: allocCountMap[ev.id] || 0,
        grantedUserCount: accessCountMap[ev.id] || 0
      }));
    } else {
      // Normal user: ONLY return special events where this user has been granted access
      const { data: accessRecords } = await supabase
        .from('results')
        .select('event_id, result_snapshot')
        .eq('operation_type', 'special_event_user_access');

      const allowedEventIds = [];
      (accessRecords || []).forEach(rec => {
        const list = Array.isArray(rec.result_snapshot) ? rec.result_snapshot : [];
        const isGranted = list.some(u =>
          (u.id && u.id === user.id) ||
          (u.userId && u.userId === user.id) ||
          (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
        );
        if (isGranted) {
          allowedEventIds.push(rec.event_id);
        }
      });

      if (allowedEventIds.length === 0) {
        return [];
      }

      const { data: eventsData, error: evErr } = await supabase
        .from('events')
        .select('*, participants(id)')
        .in('id', allowedEventIds)
        .eq('category', 'Special Event')
        .order('created_at', { ascending: false });

      if (evErr) return [];

      return (eventsData || []).map(ev => ({
        ...ev,
        participantCount: ev.participants ? ev.participants.length : 0,
        allocatedUserCount: 0,
        grantedUserCount: 0
      }));
    }
  },

  // Create a new special event with name and optional description / accent
  async createSpecialEvent({ name, description, accentColor = '#8B5CF6' }) {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('events')
      .insert([{
        owner_id: user.id,
        name: name.trim(),
        description: description ? description.trim() : '',
        category: 'Special Event',
        accent_color: accentColor,
        status: 'active',
        is_favorite: false
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      participantCount: 0,
      allocatedUserCount: 0
    };
  },

  // Delete a special event
  async deleteSpecialEvent(eventId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  },

  // Get all allocated users (credentials) for a specific special event
  async getAllocatedUsers(eventId) {
    if (!supabase || !eventId) return [];
    const { data, error } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching allocated users:', error);
      return [];
    }

    const list = Array.isArray(data?.result_snapshot) ? data.result_snapshot : [];
    try {
      localStorage.setItem('ps_allocated_users_cache', JSON.stringify(list));
    } catch {}
    return list;
  },

  // Add an allocated username and password for a special event
  async addAllocatedUser(eventId, { username, password, accessLevel = 'Operator' }) {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const cleanUsername = username.trim();
    if (!cleanUsername) throw new Error('Username cannot be empty');
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters');

    // Fetch existing record
    const { data: existingRecord } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    const currentUsers = Array.isArray(existingRecord?.result_snapshot) ? existingRecord.result_snapshot : [];

    // Check duplicate username
    if (currentUsers.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      throw new Error(`Username "${cleanUsername}" is already allocated for this event.`);
    }

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      username: cleanUsername,
      password,
      access_level: accessLevel,
      created_at: new Date().toISOString()
    };

    const updatedUsers = [newUser, ...currentUsers];

    if (existingRecord) {
      const { error } = await supabase
        .from('results')
        .update({ result_snapshot: updatedUsers })
        .eq('id', existingRecord.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('results')
        .insert([{
          event_id: eventId,
          owner_id: user.id,
          result_name: 'Allocated Access Credentials',
          operation_type: 'special_event_allocations',
          result_snapshot: updatedUsers
        }]);
      if (error) throw error;
    }

    return newUser;
  },

  // Delete an allocated user from a special event
  async deleteAllocatedUser(eventId, userId) {
    if (!supabase) throw new Error('Supabase is not configured');

    const { data: existingRecord } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    if (!existingRecord) return true;

    const currentUsers = Array.isArray(existingRecord.result_snapshot) ? existingRecord.result_snapshot : [];
    const updatedUsers = currentUsers.filter(u => u.id !== userId);

    const { error } = await supabase
      .from('results')
      .update({ result_snapshot: updatedUsers })
      .eq('id', existingRecord.id);

    if (error) throw error;
    return true;
  },

  // Get settings for a special event (rounds, etc.)
  async getSpecialEventSettings(eventId) {
    if (!supabase || !eventId) return null;
    const { data, error } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching special event settings:', error);
      return null;
    }

    if (data?.result_snapshot) {
      try {
        localStorage.setItem(`special_event_settings_${eventId}`, JSON.stringify(data.result_snapshot));
      } catch {}
      return data.result_snapshot;
    }

    // Fallback to localStorage
    try {
      const cached = localStorage.getItem(`special_event_settings_${eventId}`);
      if (cached) return JSON.parse(cached);
    } catch {}

    return {
      roundsCount: 3,
      rounds: [
        { roundNumber: 1, task: '' },
        { roundNumber: 2, task: '' },
        { roundNumber: 3, task: '' }
      ]
    };
  },

  // Save settings for a special event
  async saveSpecialEventSettings(eventId, settings) {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('results')
        .update({
          result_snapshot: settings,
          result_name: `Special Event Settings (${settings.roundsCount || settings.rounds?.length || 1} Rounds)`
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('results')
        .insert([{
          owner_id: user.id,
          event_id: eventId,
          operation_type: 'special_event_settings',
          result_name: `Special Event Settings (${settings.roundsCount || settings.rounds?.length || 1} Rounds)`,
          result_snapshot: settings
        }]);
      if (error) throw error;
    }

    try {
      localStorage.setItem(`special_event_settings_${eventId}`, JSON.stringify(settings));
    } catch {}

    return settings;
  },

  // Get detailed statistics of a special event's operational data for reset preview
  async getSpecialEventStats(eventId) {
    if (!supabase || !eventId) return null;

    try {
      const [{ data: parts }, { data: results }] = await Promise.all([
        supabase.from('participants').select('id, name').eq('event_id', eventId),
        supabase.from('results').select('id, operation_type, result_name, result_snapshot').eq('event_id', eventId)
      ]);

      const participants = parts || [];
      const allResults = results || [];

      const allocationsRecord = allResults.find(r => r.operation_type === 'special_event_allocations');
      const allocations = Array.isArray(allocationsRecord?.result_snapshot) ? allocationsRecord.result_snapshot : [];

      const settingsRecord = allResults.find(r => r.operation_type === 'special_event_settings');
      const settings = settingsRecord?.result_snapshot || null;

      const scoresRecord = allResults.find(r => r.operation_type === 'special_event_scores');
      const scores = Array.isArray(scoresRecord?.result_snapshot) ? scoresRecord.result_snapshot : [];

      const wheelDraws = allResults.filter(r => r.operation_type === 'wheel');

      return {
        participantCount: participants.length,
        participants: participants.map(p => p.name),
        allocationsCount: allocations.length,
        allocations: allocations.map(a => a.username),
        roundsCount: settings?.roundsCount || settings?.rounds?.length || 0,
        rounds: settings?.rounds || [],
        scoresCount: scores.length,
        scores: scores,
        wheelDrawsCount: wheelDraws.length,
        totalResultsCount: allResults.length
      };
    } catch (err) {
      console.error('Error fetching special event stats:', err);
      return null;
    }
  },

  // Completely reset a special event (deletes participants and all results)
  async resetSpecialEventData(eventId) {
    if (!supabase || !eventId) throw new Error('Supabase client or eventId missing');

    // 1. Delete all participants
    const { error: partErr } = await supabase
      .from('participants')
      .delete()
      .eq('event_id', eventId);
    if (partErr) throw partErr;

    // 2. Delete all results (evaluator allocations, settings, scores, live state, wheel draw history)
    const { error: resErr } = await supabase
      .from('results')
      .delete()
      .eq('event_id', eventId);
    if (resErr) throw resErr;

    // 3. Notify backend API to clear in-memory live state
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${API_BASE_URL}/ps/reset-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      }).catch(() => {});
    } catch (_) {}

    // 4. Clean localStorage caches
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes(eventId) ||
          key.startsWith('ps_') ||
          key.includes('eventora_round') ||
          key.includes('eventora_removed') ||
          key.includes('eventora_current_winner')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    return true;
  },

  // Fetch all registered users in the platform except admin
  async getRegisteredUsers() {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    try {
      const res = await fetch(`${API_BASE_URL}/ps/registered-users`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          return data.users;
        }
      }
    } catch (_) {}

    // Fallback: Query profiles table from Supabase
    if (supabase) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*');

        return (profiles || [])
          .filter(p => p.id !== 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1' && !p.display_name?.toLowerCase().includes('admin'))
          .map(p => ({
            id: p.id,
            email: p.display_name?.includes('@') ? p.display_name : `${p.display_name?.toLowerCase().replace(/\s+/g, '')}@eventora.app`,
            displayName: p.display_name || 'User',
            usageType: p.usage_type || 'personal'
          }));
      } catch (err) {
        console.error('Error fetching registered profiles fallback:', err);
      }
    }

    return [];
  },

  // Get users granted access to a special event
  async getSpecialEventUserAccess(eventId) {
    if (!eventId) return [];

    // Try backend API first
    try {
      const res = await fetch(`${API_BASE_URL}/ps/special-events/${eventId}/access`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.accessList)) {
          return json.accessList;
        }
      }
    } catch (_) {}

    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('results')
        .select('id, result_snapshot')
        .eq('event_id', eventId)
        .eq('operation_type', 'special_event_user_access')
        .maybeSingle();

      return Array.isArray(data?.result_snapshot) ? data.result_snapshot : [];
    } catch (err) {
      console.error('Error fetching special event user access:', err);
      return [];
    }
  },

  // Grant special event access to a registered user
  async grantSpecialEventUserAccess(eventId, targetUser) {
    if (!eventId || !targetUser) return [];

    // Try backend API first
    try {
      const res = await fetch(`${API_BASE_URL}/ps/special-events/${eventId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUser })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.accessList)) {
          return json.accessList;
        }
      }
    } catch (_) {}

    if (!supabase) return [];
    try {
      const { data: event } = await supabase
        .from('events')
        .select('id, owner_id')
        .eq('id', eventId)
        .single();

      const { data: existing } = await supabase
        .from('results')
        .select('id, result_snapshot')
        .eq('event_id', eventId)
        .eq('operation_type', 'special_event_user_access')
        .maybeSingle();

      const current = Array.isArray(existing?.result_snapshot) ? existing.result_snapshot : [];
      if (current.some(u => u.id === targetUser.id || (u.email && targetUser.email && u.email.toLowerCase() === targetUser.email.toLowerCase()))) {
        return current;
      }

      const updated = [
        ...current,
        {
          id: targetUser.id,
          userId: targetUser.id,
          email: targetUser.email || '',
          displayName: targetUser.displayName || targetUser.display_name || targetUser.name || 'User',
          grantedAt: new Date().toISOString()
        }
      ];

      if (existing?.id) {
        await supabase
          .from('results')
          .update({ result_snapshot: updated })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('results')
          .insert([{
            event_id: eventId,
            owner_id: event.owner_id,
            operation_type: 'special_event_user_access',
            result_name: 'Special Event Authorized Users',
            result_snapshot: updated
          }]);
      }

      return updated;
    } catch (err) {
      console.error('Error granting user access:', err);
      throw err;
    }
  },

  // Revoke user access from a special event
  async revokeSpecialEventUserAccess(eventId, targetUserId) {
    if (!eventId || !targetUserId) return [];

    // Try backend API first
    try {
      const res = await fetch(`${API_BASE_URL}/ps/special-events/${eventId}/access/${targetUserId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.accessList)) {
          return json.accessList;
        }
      }
    } catch (_) {}

    if (!supabase) return [];
    try {
      const { data: existing } = await supabase
        .from('results')
        .select('id, result_snapshot')
        .eq('event_id', eventId)
        .eq('operation_type', 'special_event_user_access')
        .maybeSingle();

      if (!existing?.id) return [];
      const current = Array.isArray(existing.result_snapshot) ? existing.result_snapshot : [];
      const updated = current.filter(u => u.id !== targetUserId && u.userId !== targetUserId);

      await supabase
        .from('results')
        .update({ result_snapshot: updated })
        .eq('id', existing.id);

      return updated;
    } catch (err) {
      console.error('Error revoking user access:', err);
      throw err;
    }
  }
};
