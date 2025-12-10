import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "damage-icons";

// Damage type ID to icon name mapping
const DAMAGE_TYPE_ICONS: Record<number, string> = {
  1: "damage_bullet",      // Piercing/Bullet
  2: "damage_cold",        // Cold
  3: "damage_crushing",    // Crushing
  4: "damage_shell",       // Explosive/Shell
  5: "damage_fire",        // Fire
  6: "damage_torpedo",     // Torpedo
};

export function getDamageTypeName(damageType: number): string {
  const names: Record<number, string> = {
    1: "Bullet",
    2: "Cold",
    3: "Crushing",
    4: "Explosive",
    5: "Fire",
    6: "Torpedo",
  };
  return names[damageType] || `Type ${damageType}`;
}

export function getDamageTypeIconUrl(damageType: number): string | null {
  const iconName = DAMAGE_TYPE_ICONS[damageType];
  if (!iconName) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${iconName}.png`);
  
  return data.publicUrl;
}

export function getDamageImageUrl(iconName: string): string | null {
  if (!iconName) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${iconName}.png`);
  
  return data.publicUrl;
}

export async function uploadMultipleDamageImages(
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

export async function listUploadedDamageImages(): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list();
  
  if (error || !data) return [];
  
  return data.map((file) => file.name.replace(/\.png$/, ""));
}
