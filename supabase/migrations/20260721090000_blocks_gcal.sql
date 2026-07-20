-- blocks_gcal.sql (Roadmap Phase 5, part two)
--
-- Additive column so a scheduled block can remember the id of the Google
-- Calendar event it's linked to. Needed by gcal-sync-runner.ts (part two) to
-- persist a created/discovered link back onto the block via the existing
-- updateBlock (blocks-repo.ts) instead of re-creating/re-discovering it on
-- every sync pass. Nullable + no default: existing rows are simply
-- "not yet linked", exactly how gcal-sync-engine.ts already treats them.
-- additive-only per the live-data guardrail — no backfill, no drops.

ALTER TABLE public.blocks
    ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

CREATE INDEX IF NOT EXISTS blocks_gcal_event_idx
    ON public.blocks (google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
