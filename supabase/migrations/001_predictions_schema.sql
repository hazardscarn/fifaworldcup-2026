-- ============================================================
-- FIFA World Cup 2026 Predictor — Additional Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add is_admin flag to existing users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  match_no      bigint      NOT NULL REFERENCES public.worldcup_schedule("MatchNo") ON DELETE CASCADE,
  t1_win_prob   numeric(6,4) NOT NULL,
  draw_prob     numeric(6,4) NOT NULL,
  t2_win_prob   numeric(6,4) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_no),
  CONSTRAINT predictions_t1_range   CHECK (t1_win_prob  >= 0.01 AND t1_win_prob  <= 0.98),
  CONSTRAINT predictions_draw_range CHECK (draw_prob    >= 0.01 AND draw_prob    <= 0.98),
  CONSTRAINT predictions_t2_range   CHECK (t2_win_prob  >= 0.01 AND t2_win_prob  <= 0.98),
  CONSTRAINT predictions_sum        CHECK (abs(t1_win_prob + draw_prob + t2_win_prob - 1.0) < 0.005)
);

CREATE INDEX IF NOT EXISTS idx_predictions_user_id  ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_no ON public.predictions(match_no);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_updated_at ON public.predictions;
CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Match results table
CREATE TABLE IF NOT EXISTS public.match_results (
  match_no      bigint      NOT NULL REFERENCES public.worldcup_schedule("MatchNo") ON DELETE CASCADE,
  result        text        NOT NULL,
  score_team_a  integer,
  score_team_b  integer,
  entered_by    uuid        REFERENCES public.users(user_id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_results_pkey   PRIMARY KEY (match_no),
  CONSTRAINT match_results_result CHECK (result IN ('T1_WIN', 'DRAW', 'T2_WIN'))
);

DROP TRIGGER IF EXISTS match_results_updated_at ON public.match_results;
CREATE TRIGGER match_results_updated_at
  BEFORE UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Scored predictions view
CREATE OR REPLACE VIEW public.prediction_scores AS
SELECT
  p.id,
  p.user_id,
  u.username,
  u.display_name,
  u.favorite_team,
  p.match_no,
  s."TeamA"          AS team_a,
  s."TeamB"          AS team_b,
  s."Stage"          AS stage,
  s."DateTime_CST"   AS kickoff,
  p.t1_win_prob,
  p.draw_prob,
  p.t2_win_prob,
  r.result,
  r.score_team_a,
  r.score_team_b,
  CASE
    WHEN r.result = 'T1_WIN' THEN ln(3.0 * p.t1_win_prob)
    WHEN r.result = 'DRAW'   THEN ln(3.0 * p.draw_prob)
    WHEN r.result = 'T2_WIN' THEN ln(3.0 * p.t2_win_prob)
    ELSE NULL
  END AS score,
  p.updated_at
FROM public.predictions p
JOIN public.users u              ON u.user_id  = p.user_id
JOIN public.worldcup_schedule s  ON s."MatchNo" = p.match_no
LEFT JOIN public.match_results r ON r.match_no  = p.match_no;

-- 5. Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  ps.user_id,
  ps.username,
  ps.display_name,
  ps.favorite_team,
  COUNT(*)                                                         AS predictions_made,
  COUNT(ps.result)                                                 AS matches_scored,
  ROUND(COALESCE(SUM(ps.score), 0)::numeric, 4)                   AS total_score,
  ROUND(AVG(ps.score)::numeric, 4)                                AS avg_score,
  RANK() OVER (ORDER BY COALESCE(SUM(ps.score), 0) DESC)         AS rank
FROM public.prediction_scores ps
GROUP BY ps.user_id, ps.username, ps.display_name, ps.favorite_team;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "users_read_all"       ON public.users;
DROP POLICY IF EXISTS "users_insert_own"     ON public.users;
DROP POLICY IF EXISTS "users_update_own"     ON public.users;

CREATE POLICY "users_read_all"   ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = user_id);

-- predictions
DROP POLICY IF EXISTS "predictions_read_all"   ON public.predictions;
DROP POLICY IF EXISTS "predictions_insert_own" ON public.predictions;
DROP POLICY IF EXISTS "predictions_update_own" ON public.predictions;

CREATE POLICY "predictions_read_all"   ON public.predictions FOR SELECT USING (true);
CREATE POLICY "predictions_insert_own" ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "predictions_update_own" ON public.predictions FOR UPDATE
  USING (
    auth.uid() = user_id AND
    (SELECT "DateTime_CST" FROM public.worldcup_schedule WHERE "MatchNo" = match_no) > now()
  );

-- match_results (admin only for write)
DROP POLICY IF EXISTS "results_read_all"    ON public.match_results;
DROP POLICY IF EXISTS "results_admin_write" ON public.match_results;
DROP POLICY IF EXISTS "results_admin_update" ON public.match_results;

CREATE POLICY "results_read_all" ON public.match_results FOR SELECT USING (true);
CREATE POLICY "results_admin_write" ON public.match_results FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "results_admin_update" ON public.match_results FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "results_admin_delete" ON public.match_results FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND is_admin = true)
  );
