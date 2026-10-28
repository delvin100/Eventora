-- ==============================================================================
-- EVENTORA DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Tagline: "Spin. Shuffle. Select. Organize."
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  usage_type TEXT DEFAULT 'personal', -- education, team, event, personal
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General', -- Classroom, Team activity, Lucky draw, Tournament, Workshop, Personal, Other
  event_date DATE,
  status TEXT DEFAULT 'active', -- active, archived
  is_favorite BOOLEAN DEFAULT FALSE,
  accent_color TEXT DEFAULT '#635BFF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user event lookups
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- 3. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_identifier TEXT, -- Student ID, Employee ID, Ticket #
  metadata JSONB DEFAULT '{}'::jsonb, -- e.g. { "department": "Marketing", "grade": "10A" }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON public.participants(event_id);

-- 4. SAVED LISTS TABLE (Reusable independent lists)
CREATE TABLE IF NOT EXISTS public.saved_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_lists_owner_id ON public.saved_lists(owner_id);

-- 5. SAVED LIST ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.saved_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.saved_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_identifier TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_list_entries_list_id ON public.saved_list_entries(list_id);

-- 6. RESULTS TABLE (Immutable snapshots of spins, shuffles, and groups)
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_name TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'wheel', 'shuffle', 'groups'
  settings JSONB DEFAULT '{}'::jsonb, -- e.g. { "allowRepeats": false, "groupCount": 4 }
  result_snapshot JSONB NOT NULL, -- e.g. { "winners": [...], "groups": [...] }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_event_id ON public.results(event_id);
CREATE INDEX IF NOT EXISTS idx_results_owner_id ON public.results(owner_id);

-- 7. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light', -- light, dark, system
  sound_enabled BOOLEAN DEFAULT TRUE,
  celebration_enabled BOOLEAN DEFAULT TRUE,
  wheel_settings JSONB DEFAULT '{"spinDuration": 5, "soundEffect": "tick", "removeWinner": false}'::jsonb,
  grouping_settings JSONB DEFAULT '{"balanceSizes": true, "defaultMode": "count"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can select and update their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Events: Users have full access to their own events
CREATE POLICY "Users can manage own events" 
  ON public.events FOR ALL 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Participants: Users can access participants belonging to their events
CREATE POLICY "Users can manage participants for own events" 
  ON public.participants FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = participants.event_id 
      AND events.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = participants.event_id 
      AND events.owner_id = auth.uid()
    )
  );

-- Saved Lists: Users manage their own lists
CREATE POLICY "Users can manage own saved lists" 
  ON public.saved_lists FOR ALL 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Saved List Entries: Users manage entries of their own lists
CREATE POLICY "Users can manage entries in own lists" 
  ON public.saved_list_entries FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists 
      WHERE saved_lists.id = saved_list_entries.list_id 
      AND saved_lists.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_lists 
      WHERE saved_lists.id = saved_list_entries.list_id 
      AND saved_lists.owner_id = auth.uid()
    )
  );

-- Results: Users manage their own results
CREATE POLICY "Users can manage own results" 
  ON public.results FOR ALL 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- User Preferences: Users manage their own preferences
CREATE POLICY "Users can manage own preferences" 
  ON public.user_preferences FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Automatic Profile Creation on Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, usage_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'usage_type', 'personal')
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute upon user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
