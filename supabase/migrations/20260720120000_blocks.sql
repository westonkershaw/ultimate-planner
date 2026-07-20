-- blocks.sql (Roadmap Phase 4)
--
-- Scheduled time blocks — the unit the weekly planning wizard and daily
-- planning view both operate on. A block optionally links to a goal and/or
-- a person; completing a block writes a goal_progress_event (Phase 1) when
-- it is goal-linked, so "time spent" and "progress logged" are the same
-- action from the user's point of view.
-- Design decisions (architect):
--   * scheduled_on is the DEVICE-LOCAL day key (YYYY-MM-DD), same convention
--     as goal_progress_events.occurred_on — day boundaries follow the user's
--     timezone, never UTC.
--   * start_time is optional (nullable) — "sometime today" is a valid block.
--   * goal_id / person_id both ON DELETE SET NULL — deleting a goal or person
--     should not destroy the user's planning history, just unlink it.
--   * completed_at is the single source of truth for done/not-done; no
--     separate boolean to drift out of sync.
--   * RLS owner-only, same shape as goals_engine.sql / people.sql.
--   * additive-only per the live-data guardrail.

CREATE TABLE IF NOT EXISTS public.blocks (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title            text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    scheduled_on     date NOT NULL,             -- DEVICE-LOCAL day key
    start_time       time,                      -- optional time-of-day
    duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    goal_id          uuid REFERENCES public.goals (id) ON DELETE SET NULL,
    person_id        uuid REFERENCES public.people (id) ON DELETE SET NULL,
    notes            text CHECK (notes IS NULL OR char_length(notes) <= 1000),
    completed_at     timestamptz,                -- NULL = not completed
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blocks_user_day_idx
    ON public.blocks (user_id, scheduled_on);
CREATE INDEX IF NOT EXISTS blocks_goal_idx
    ON public.blocks (goal_id) WHERE goal_id IS NOT NULL;

DROP TRIGGER IF EXISTS blocks_touch_updated_at ON public.blocks;
CREATE TRIGGER blocks_touch_updated_at
    BEFORE UPDATE ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (goal_id IS NULL OR EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()))
        AND (person_id IS NULL OR EXISTS (SELECT 1 FROM public.people p WHERE p.id = person_id AND p.user_id = auth.uid()))
    );
DROP POLICY IF EXISTS "blocks_update_own" ON public.blocks;
CREATE POLICY "blocks_update_own" ON public.blocks
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
        auth.uid() = user_id
        AND (goal_id IS NULL OR EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()))
        AND (person_id IS NULL OR EXISTS (SELECT 1 FROM public.people p WHERE p.id = person_id AND p.user_id = auth.uid()))
    );
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks
    FOR DELETE USING (auth.uid() = user_id);
