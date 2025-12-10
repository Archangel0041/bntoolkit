import { supabase } from "@/integrations/supabase/client";

const RESOURCE_ICONS_BUCKET = "resource-icons";
const EVENT_REWARD_ICONS_BUCKET = "event-reward-icons";
const MENU_BACKGROUNDS_BUCKET = "menu-backgrounds";

export function getResourceIconUrl(resourceKey: string): string {
  const fileName = `resource_${resourceKey}.png`;
  const { data } = supabase.storage.from(RESOURCE_ICONS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export function getEventRewardIconUrl(rewardImage: string): string {
  // Remove trailing period if exists and add .png
  const cleanName = rewardImage.replace(/\.$/, '');
  const fileName = `${cleanName}.png`;
  const { data } = supabase.storage.from(EVENT_REWARD_ICONS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export function getMenuBackgroundUrl(backgroundKey: string): string {
  const fileName = `${backgroundKey}.png`;
  const { data } = supabase.storage.from(MENU_BACKGROUNDS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadResourceIcon(file: File, resourceKey: string): Promise<{ success: boolean; error?: string }> {
  const fileName = `resource_${resourceKey}.png`;
  const { error } = await supabase.storage.from(RESOURCE_ICONS_BUCKET).upload(fileName, file, { upsert: true });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function uploadEventRewardIcon(file: File): Promise<{ success: boolean; error?: string }> {
  const fileName = file.name;
  const { error } = await supabase.storage.from(EVENT_REWARD_ICONS_BUCKET).upload(fileName, file, { upsert: true });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function uploadMenuBackground(file: File): Promise<{ success: boolean; error?: string }> {
  const fileName = file.name;
  const { error } = await supabase.storage.from(MENU_BACKGROUNDS_BUCKET).upload(fileName, file, { upsert: true });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function listResourceIcons(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(RESOURCE_ICONS_BUCKET).list();
  if (error || !data) return [];
  return data.map(f => f.name);
}

export async function listEventRewardIcons(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(EVENT_REWARD_ICONS_BUCKET).list();
  if (error || !data) return [];
  return data.map(f => f.name);
}

export async function listMenuBackgrounds(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(MENU_BACKGROUNDS_BUCKET).list();
  if (error || !data) return [];
  return data.map(f => f.name);
}
