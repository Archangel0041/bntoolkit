import { supabase } from "@/integrations/supabase/client";
import statusEffectFamiliesData from "@/data/status_effect_families.json";

const BUCKET_NAME = "status-icons";

interface StatusEffectFamily {
  color_hex: string;
  display_name: string;
  effect_icon: string;
  pulse_speed: number;
  sound: string;
  ui_icon: string;
}

const families = statusEffectFamiliesData as Record<string, StatusEffectFamily>;

export function getStatusEffectFamily(id: number): StatusEffectFamily | undefined {
  return families[id.toString()];
}

export function getStatusEffectDisplayName(id: number): string {
  const family = getStatusEffectFamily(id);
  return family?.display_name || `Effect #${id}`;
}

export function getStatusEffectColor(id: number): string {
  const family = getStatusEffectFamily(id);
  return family?.color_hex ? `#${family.color_hex}` : "#888888";
}

export function getStatusEffectIconUrl(id: number): string | null {
  const family = getStatusEffectFamily(id);
  if (!family?.ui_icon) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${family.ui_icon}.png`);
  
  return data.publicUrl;
}

export function getAllStatusEffectFamilies(): { id: number; family: StatusEffectFamily }[] {
  return Object.entries(families).map(([id, family]) => ({
    id: parseInt(id),
    family,
  }));
}

export async function uploadMultipleStatusImages(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const iconName = file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
    
    onProgress?.(i + 1, files.length, file.name);
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${iconName}.png`, file, { upsert: true });
    
    if (error) {
      results.failed++;
      results.errors.push(`${file.name}: ${error.message}`);
    } else {
      results.success++;
    }
  }
  
  return results;
}

export async function listUploadedStatusImages(): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list();
  
  if (error || !data) return [];
  
  return data.map((file) => file.name.replace(/\.png$/, ""));
}
