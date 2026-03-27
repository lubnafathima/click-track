-- ─── Folders ──────────────────────────────────────────────────────────────────
CREATE TABLE public.folders (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX folders_user_id_idx ON public.folders (user_id);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_folders
  ON public.folders
  FOR ALL
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;

-- ─── Extend trackers ──────────────────────────────────────────────────────────
-- utm_params  stores the UTM template + param overrides as JSON
-- folder_id   nullable FK — NULL means "Uncategorized"
ALTER TABLE public.trackers
  ADD COLUMN utm_params JSONB     DEFAULT NULL,
  ADD COLUMN folder_id  UUID      REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX trackers_folder_id_idx ON public.trackers (folder_id);
