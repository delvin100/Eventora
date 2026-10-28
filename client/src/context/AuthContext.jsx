import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Basic email format validator
  const isValidBasicEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) console.error('Error fetching Supabase session:', error);

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }
          setLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (mounted) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
              await fetchProfile(newSession.user.id);
            } else {
              setProfile(null);
            }
          }
        });

        return () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Supabase Auth initialization error:', err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchProfile(userId) {
    if (!supabase || !userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile({
          id: userId,
          display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User',
          usage_type: user?.user_metadata?.usage_type || 'personal'
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile from Supabase:', err);
    }
  }

  // Sign in via Supabase
  const signIn = async (email, password) => {
    if (!isValidBasicEmail(email)) {
      return { data: null, error: { message: 'Please enter a valid email format.' } };
    }
    if (!supabase) {
      return { data: null, error: { message: 'Supabase client is not connected.' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign up via Supabase
  const signUp = async (email, password, displayName, usageType = 'personal') => {
    if (!isValidBasicEmail(email)) {
      return { data: null, error: { message: 'Please enter a valid email format.' } };
    }
    if (!supabase) {
      return { data: null, error: { message: 'Supabase client is not connected.' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          usage_type: usageType,
        }
      }
    });

    if (!error && data?.user) {
      // Create profile row in profiles table
      try {
        await supabase.from('profiles').upsert([{
          id: data.user.id,
          display_name: displayName,
          usage_type: usageType
        }]);
      } catch (e) {
        // Handled by SQL trigger if trigger exists
      }
    }

    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
