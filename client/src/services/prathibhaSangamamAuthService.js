import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const prathibhaSangamamAuthService = {
  // Login with allocated username & password
  async login(username, password) {
    const cleanUser = (username || '').trim();
    if (!cleanUser || !password) {
      return { error: 'Please enter both username and password.' };
    }

    // 1. Primary: Contact backend API
    try {
      const response = await fetch(`${API_BASE_URL}/ps/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('ps_user_session', JSON.stringify(data.user));
        return { user: data.user };
      } else {
        return { error: data.message || 'Invalid username or password.' };
      }
    } catch (apiErr) {
      console.warn('Backend API login request failed, trying client fallbacks...', apiErr);

      // 2. Check localStorage cache
      try {
        const cached = localStorage.getItem('ps_allocated_users_cache');
        if (cached) {
          const users = JSON.parse(cached);
          const matched = (users || []).find(
            u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === password
          );
          if (matched) {
            const sessionUser = {
              id: matched.id,
              username: matched.username,
              access_level: matched.access_level || 'Evaluator',
              created_at: matched.created_at,
              event_name: 'Prathibha Sangamam'
            };
            localStorage.setItem('ps_user_session', JSON.stringify(sessionUser));
            return { user: sessionUser };
          }
        }
      } catch (cacheErr) {
        console.error('Cache check failed:', cacheErr);
      }

      // 3. Fallback: If client is already connected to Supabase
      if (supabase) {
        try {
          const { data: event } = await supabase
            .from('events')
            .select('id, name')
            .ilike('name', '%Prathibha Sangamam%')
            .limit(1)
            .maybeSingle();

          if (event) {
            const { data: alloc } = await supabase
              .from('results')
              .select('result_snapshot')
              .eq('event_id', event.id)
              .eq('operation_type', 'special_event_allocations')
              .maybeSingle();

            const users = Array.isArray(alloc?.result_snapshot) ? alloc.result_snapshot : [];
            const matched = users.find(
              u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === password
            );

            if (matched) {
              const sessionUser = {
                id: matched.id,
                username: matched.username,
                access_level: matched.access_level || 'Evaluator',
                created_at: matched.created_at,
                event_id: event.id,
                event_name: event.name
              };
              localStorage.setItem('ps_user_session', JSON.stringify(sessionUser));
              return { user: sessionUser };
            }
          }
        } catch (dbErr) {
          console.error('Fallback query error:', dbErr);
        }
      }

      return { error: 'Invalid username or password for Prathibha Sangamam.' };
    }
  },

  // Get current active session
  getCurrentSession() {
    try {
      const stored = localStorage.getItem('ps_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('ps_user_session');
  }
};

