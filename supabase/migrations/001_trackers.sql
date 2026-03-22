-- ─── Extension ────────────────────────────────────────────────────────────────
-- uuid_generate_v4() is already available on Supabase; if not:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE public.trackers (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  original_url TEXT        NOT NULL,
  short_url    TEXT        UNIQUE NOT NULL,   -- slug only, e.g. "abc123"
  clicks       INTEGER     NOT NULL DEFAULT 0,
  locations    JSONB[]     NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by slug (used on every click).
CREATE INDEX trackers_short_url_idx ON public.trackers (short_url);
-- Fast per-user queries (dashboard load).
CREATE INDEX trackers_user_id_idx   ON public.trackers (user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

-- Owners can SELECT, INSERT, UPDATE and DELETE their own rows.
CREATE POLICY user_trackers
  ON public.trackers
  FOR ALL
  USING (auth.uid() = user_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable Realtime for the table so the dashboard receives live click updates.
-- You can also toggle this in the Supabase dashboard under Database → Replication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.trackers;

-- ─── record_click() ───────────────────────────────────────────────────────────
-- Called by the /t/[slug] Route Handler via the service-role key.
-- Atomically increments clicks and appends a location entry so concurrent
-- requests don't race each other (avoids the read-then-write problem).
--
-- The route handler could also call this with the anon key if you grant EXECUTE
-- to the anon role and add SECURITY DEFINER, but service-role is simpler.
CREATE OR REPLACE FUNCTION public.record_click(
  p_short_url TEXT,
  p_location  JSONB
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.trackers
  SET
    clicks    = clicks + 1,
    locations = array_append(COALESCE(locations, '{}'), p_location)
  WHERE short_url = p_short_url;
$$;

-- Grant execute to authenticated & anon roles so you can optionally call this
-- with the anon key (e.g. if you ever drop the service-role requirement).
GRANT EXECUTE ON FUNCTION public.record_click(TEXT, JSONB) TO anon, authenticated;
