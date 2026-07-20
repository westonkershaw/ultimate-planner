-- gcal_sync.sql (Roadmap Phase 5)
--
-- Two-way sync between weekly blocks and Google Calendar. This migration only
-- adds the linkage column the roadmap explicitly asks for; sync bookkeeping
-- (last-synced timestamps, incremental sync tokens) lives client-side in
-- AsyncStorage, matching the convention already established for
-- planning-prefs.ts / ritual-prefs.ts — it is a local sync-implementation
-- detail, not user-visible app data that needs to be cross-device.
-- Additive only per the live-data guardrail.

ALTER TABLE public.blocks
    ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

CREATE INDEX IF NOT EXISTS blocks_gcal_event_idx
    ON public.blocks (google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
