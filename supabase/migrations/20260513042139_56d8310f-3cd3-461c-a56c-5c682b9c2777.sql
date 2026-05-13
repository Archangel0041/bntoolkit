CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  level integer NOT NULL DEFAULT 65,
  level_cap integer NOT NULL DEFAULT 65,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT level_positive CHECK (level >= 1 AND level <= 200),
  CONSTRAINT level_cap_positive CHECK (level_cap >= 1 AND level_cap <= 200),
  CONSTRAINT level_within_cap CHECK (level <= level_cap)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own prefs" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own prefs" ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own prefs" ON public.user_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();