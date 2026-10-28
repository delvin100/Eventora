import { supabase, isSupabaseEnabled } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    if (isSupabaseEnabled && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      req.user = user;
      return next();
    }

    return res.status(401).json({ error: 'Authentication service unavailable' });
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};
