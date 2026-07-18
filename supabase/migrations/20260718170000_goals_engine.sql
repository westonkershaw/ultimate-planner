-- goals_engine.sql (Roadmap Phase 1)
--
-- The data spine for the Expo rebuild: goals + append-only progress events.
-- Design decisions (architect):
--   * progress lives ONLY in goal_progress_events (timestamped increments) —
--     never a raw counter on the goal row; streaks/history/analytics derive.
--   * events carry `occurred_on`, the DEVICE-LOCAL day key (YYYY-MM-DD from the
--     client's timePolicy) — day boundaries follow the user's timezone, not UTC.
--     `occurred_at` keeps the exact instant for ordering/audit.
--   * life areas are a fixed five; CHECK constraints instead of lookup tables.
--   * RLS owner-only on both tables; event inserts additionally verify the
--     target goal belongs to the caller (no cross-user event grafting).
--   * additive-only per the live-data guardrail.

-- ── goals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    life_area    text NOT NULL CHECK (life_area IN ('finance','spiritual','mental','social','physical')),
    metric_type  text NOT NULL CHECK (metric_type IN ('currency','count','streak','numeric')),
    target_value numeric NOT NULL CHECK (target_value > 0),
    unit         text,                          -- optional display unit ("$", "pages", "min")
    cadence      text NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
    target_date  date,                          -- optional milestone deadline
    archived_at  timestamptz,                   -- soft archive; NULL = active
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_user_active_idx
    ON public.goals (user_id) WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS goals_touch_updated_at ON public.goals;
CREATE TRIGGER goals_touch_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- ── goal_progress_events (append-only) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goal_progress_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id     uuid NOT NULL REFERENCES public.goals (id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    amount      numeric NOT NULL CHECK (amount <> 0),   -- signed increment
    occurred_on date NOT NULL,                          -- DEVICE-LOCAL day key from timePolicy
    occurred_at timestamptz NOT NULL DEFAULT now(),
    note        text CHECK (note IS NULL OR char_length(note) <= 500),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gpe_goal_day_idx
    ON public.goal_progress_events (goal_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS gpe_user_day_idx
    ON public.goal_progress_events (user_id, occurred_on DESC);

ALTER TABLE public.goal_progress_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gpe_select_own" ON public.goal_progress_events;
CREATE POLICY "gpe_select_own" ON public.goal_progress_events
    FOR SELECT USING (auth.uid() = user_id);
-- Insert requires BOTH ownership of the event row and of the target goal.
DROP POLICY IF EXISTS "gpe_insert_own" ON public.goal_progress_events;
CREATE POLICY "gpe_insert_own" ON public.goal_progress_events
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
    );
DROP POLICY IF EXISTS "gpe_delete_own" ON public.goal_progress_events;
CREATE POLICY "gpe_delete_own" ON public.goal_progress_events
    FOR DELETE USING (auth.uid() = user_id);
-- No UPDATE policy: events are append-only (undo = delete + re-log).
