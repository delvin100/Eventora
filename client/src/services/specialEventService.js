import { supabase } from '../lib/supabase';

export const specialEventService = {
  // Fetch all special events (category: 'Special Event') with participant and allocation counts
  async getSpecialEvents() {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const [{ data: eventsData, error: evErr }, { data: allocData }] = await Promise.all([
      supabase
        .from('events')
        .select('*, participants(id)')
        .eq('owner_id', user.id)
        .eq('category', 'Special Event')
        .order('created_at', { ascending: false }),
      supabase
        .from('results')
        .select('event_id, result_snapshot')
        .eq('owner_id', user.id)
        .eq('operation_type', 'special_event_allocations')
    ]);

    if (evErr) {
      console.error('Error fetching special events from Supabase:', evErr);
      return [];
    }

    const allocCountMap = {};
    (allocData || []).forEach(r => {
      allocCountMap[r.event_id] = Array.isArray(r.result_snapshot) ? r.result_snapshot.length : 0;
    });

    return (eventsData || []).map(ev => ({
      ...ev,
      participantCount: ev.participants ? ev.participants.length : 0,
      allocatedUserCount: allocCountMap[ev.id] || 0
    }));
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
  }
};
