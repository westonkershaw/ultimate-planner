-- goal_pinning.sql — Phase 2 (Home dashboard)
--
-- The Home featured card shows the user's PINNED goal (long-press to pin),
-- falling back to nearest target_date, then most recent. Pinning must follow
-- the user across devices, so it lives on the goals row, not in local storage.
--
-- Additive only. At most one pinned goal per user, enforced server-side by a
-- partial unique index; the client unpins-then-pins (two updates) so the
-- constraint never trips in normal flow.

ALTER TABLE public.goals
    ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS goals_one_pinned_per_user_idx
    ON public.goals (user_id)
    WHERE pinned_at IS NOT NULL AND archived_at IS NULL;
