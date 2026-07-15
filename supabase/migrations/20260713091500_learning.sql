-- learning.sql
--
-- Backend of record for the recursive per-user learning feature. Both clients
-- (website + App Store wrapper) read/write these through the same Supabase API,
-- so phone and web never diverge.
--
-- Tables:
--   profiles         — auth profile row (was referenced in code but had no
--                      migration; added here IF NOT EXISTS so it's reproducible).
--   user_profile     — one compact, versioned LearnedProfile per user.
--   learning_events  — append-only lightweight behavioural signals.
--
-- Every table is protected by Row Level Security: a user can only ever touch
-- their own rows (auth.uid() = user_id). No cross-user reads are possible.

-- ── profiles (auth profile; safe if it already exists in the live project) ──
CREATE TABLE IF NOT EXISTS public.profiles (
    id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    first_name text,
    last_name  text,
    is_pro     boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_upsert_own" ON public.profiles;
CREATE POLICY "profiles_upsert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── user_profile (the LearnedProfile, one row per user) ─────────────────────
CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id        uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    schema_version integer NOT NULL DEFAULT 1,
    profile        jsonb   NOT NULL,
    updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profile_select_own" ON public.user_profile;
CREATE POLICY "user_profile_select_own" ON public.user_profile
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_profile_insert_own" ON public.user_profile;
CREATE POLICY "user_profile_insert_own" ON public.user_profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_profile_update_own" ON public.user_profile;
CREATE POLICY "user_profile_update_own" ON public.user_profile
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_profile_delete_own" ON public.user_profile;
CREATE POLICY "user_profile_delete_own" ON public.user_profile
    FOR DELETE USING (auth.uid() = user_id);

-- ── learning_events (append-only signal log) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    ts         timestamptz NOT NULL DEFAULT now(),
    type       text NOT NULL,
    payload    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS learning_events_user_ts_idx
    ON public.learning_events (user_id, ts DESC);

ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_events_select_own" ON public.learning_events;
CREATE POLICY "learning_events_select_own" ON public.learning_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_events_insert_own" ON public.learning_events;
CREATE POLICY "learning_events_insert_own" ON public.learning_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow the user to purge their own events (powers "Reset what's been learned").
DROP POLICY IF EXISTS "learning_events_delete_own" ON public.learning_events;
CREATE POLICY "learning_events_delete_own" ON public.learning_events
    FOR DELETE USING (auth.uid() = user_id);
