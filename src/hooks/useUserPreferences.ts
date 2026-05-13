import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DEFAULT_LEVEL_CAP = 65;

export interface UserPreferences {
  level: number;
  levelCap: number;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>({
    level: DEFAULT_LEVEL_CAP,
    levelCap: DEFAULT_LEVEL_CAP,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setPrefs({ level: DEFAULT_LEVEL_CAP, levelCap: DEFAULT_LEVEL_CAP });
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('user_preferences')
        .select('level, level_cap')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPrefs({ level: data.level, levelCap: data.level_cap });
      } else {
        setPrefs({ level: DEFAULT_LEVEL_CAP, levelCap: DEFAULT_LEVEL_CAP });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback(async (next: UserPreferences) => {
    if (!user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        level: next.level,
        level_cap: next.levelCap,
      }, { onConflict: 'user_id' });
    if (!error) setPrefs(next);
    return { error };
  }, [user]);

  return { prefs, loading, save };
}
