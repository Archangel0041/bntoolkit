import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "ability-icons";

export function getAbilityImageUrl(iconName: string): string | null {
  if (!iconName) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${iconName}.png`);
  
  return data.publicUrl;
}

export async function uploadMultipleAbilityImages(
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

export async function listUploadedAbilityImages(): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list();
  
  if (error || !data) return [];
  
  return data.map((file) => file.name.replace(/\.png$/, ""));
}
