-- people.sql (Roadmap Phase 3a)
--
-- Data spine for the People tab: one row per person the user tracks
-- (friends/family/dating), with contact info, geo for map view, and
-- relationship-status fields that back the engaged -> newlywed -> married
-- cascade computed client-side in relationship-status.ts.
-- Design decisions (architect):
--   * category is a fixed three; CHECK constraint instead of a lookup table.
--   * relationship_status is nullable — most people (friends/family) don't
--     have one; only meaningful for category = 'dating' but not DB-enforced
--     so a friend can still carry historical dating status.
--   * social_links is a jsonb array (platform/url pairs) rather than a
--     separate table — small, always read/written as a whole with the person.
--   * RLS owner-only, same shape as goals_engine.sql.
--   * additive-only per the live-data guardrail.

-- ── people ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.people (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name                text NOT NULL,
    photo_url           text,
    category            text NOT NULL DEFAULT 'friend' CHECK (category IN ('friend','family','dating')),
    relationship_status text CHECK (relationship_status IN ('past','interested','dating','engaged','newlywed','married')),
    wedding_date        date,
    address             text,
    phone               text,
    email               text,
    social_links        jsonb NOT NULL DEFAULT '[]'::jsonb,
    latitude            double precision,
    longitude           double precision,
    last_contact_at     timestamptz,
    birthday            date,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_user_idx
    ON public.people (user_id);
CREATE INDEX IF NOT EXISTS people_user_last_contact_idx
    ON public.people (user_id, last_contact_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS people_touch_updated_at ON public.people;
CREATE TRIGGER people_touch_updated_at
    BEFORE UPDATE ON public.people
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_select_own" ON public.people;
CREATE POLICY "people_select_own" ON public.people
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "people_insert_own" ON public.people;
CREATE POLICY "people_insert_own" ON public.people
    FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "people_update_own" ON public.people;
CREATE POLICY "people_update_own" ON public.people
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "people_delete_own" ON public.people;
CREATE POLICY "people_delete_own" ON public.people
    FOR DELETE USING (auth.uid() = user_id);
