import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences, DEFAULT_LEVEL_CAP } from '@/hooks/useUserPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { prefs, loading, save } = useUserPreferences();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [level, setLevel] = useState<number>(DEFAULT_LEVEL_CAP);
  const [levelCap, setLevelCap] = useState<number>(DEFAULT_LEVEL_CAP);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setLevel(prefs.level);
    setLevelCap(prefs.levelCap);
  }, [prefs]);

  const handleSave = async () => {
    if (level < 1 || levelCap < 1 || level > 200 || levelCap > 200) {
      toast({ title: 'Invalid value', description: 'Level and cap must be between 1 and 200.', variant: 'destructive' });
      return;
    }
    if (level > levelCap) {
      toast({ title: 'Invalid value', description: 'Level cannot exceed level cap.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await save({ level, levelCap });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Your preferences have been updated.' });
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container max-w-xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>Configure your account preferences used across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="level-cap">Level Cap</Label>
            <Input
              id="level-cap"
              type="number"
              min={1}
              max={200}
              value={levelCap}
              onChange={(e) => setLevelCap(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">The current maximum level available in-game.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Current Level</Label>
            <Input
              id="level"
              type="number"
              min={1}
              max={levelCap}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Used to auto-select boss strike enemy levels.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
