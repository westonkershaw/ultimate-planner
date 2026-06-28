-- planner_settings
--
-- Single-row-per-key store for runtime app settings (e.g. the active AI
-- system prompt). Reads/writes go through the Supabase REST API; clients
-- should treat each key as opaque and round-trip the JSON-encoded string
-- in `value` themselves.

CREATE TABLE planner_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL, -- e.g., 'current_system_prompt'
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
