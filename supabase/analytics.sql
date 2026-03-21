-- Analytics & Link Tracking tables
-- Run this in the Supabase SQL editor

-- ═══ Internal usage tracking ═══
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- No RLS policies — only service role (admin) can read/write


-- ═══ Preview view tracking (prospect visits + time-on-page) ═══
CREATE TABLE preview_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id UUID NOT NULL REFERENCES previews(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preview_views_slug ON preview_views(slug);
CREATE INDEX idx_preview_views_preview_id ON preview_views(preview_id);
CREATE INDEX idx_preview_views_created ON preview_views(created_at);

ALTER TABLE preview_views ENABLE ROW LEVEL SECURITY;

-- Owners can read views for their own previews
CREATE POLICY "Owners can view their preview stats" ON preview_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM previews
      WHERE previews.id = preview_views.preview_id
        AND previews.user_id = auth.uid()
    )
  );


-- ═══ RPC for heartbeat — atomically increment duration ═══
CREATE OR REPLACE FUNCTION increment_view_duration(view_id UUID, view_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE preview_views
  SET duration_seconds = duration_seconds + 30,
      last_heartbeat_at = now()
  WHERE id = view_id AND slug = view_slug;
$$;
