import { supabase } from "@/integrations/supabase/client";

const RESOURCE_ICONS_BUCKET = "resource-icons";
const EVENT_REWARD_ICONS_BUCKET = "event-reward-icons";
const MENU_BACKGROUNDS_BUCKET = "menu-backgrounds";
const ENCOUNTER_ICONS_BUCKET = "encounter-icons";
const MISSION_ICONS_BUCKET = "mission-icons";

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
  // Handle cases where extension may or may not be included
  const fileName = backgroundKey.endsWith('.png') ? backgroundKey : `${backgroundKey}.png`;
  const { data } = supabase.storage.from(MENU_BACKGROUNDS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// Common icon mappings from encounter icon field to actual file names
const encounterIconMappings: Record<string, string> = {
  "raider": "encounter_raider_event_boss_icon",
  "rebel_avatar": "encounter_rebel_event_boss_icon",
  "infected": "challenge_encounter_infected_icon",
  "silverwolves": "challenge_encounter_silver_wolves_icon",
  "rebel": "challenge_encounter_rebel_icon",
  "grouper": "encounter_grouper_icon",
  "raptor": "land_encounter_raptor",
  "boar": "land_encounter_boar",
  "mammoth": "land_encounter_mammoth",
  "spider_wasp": "encounter_spider_wasp_icon",
  "kraken": "encounter_kraken_icon",
  "gantas": "gantas",
};

export function getEncounterIconUrl(iconKey: string): string {
  // Check if we have a mapping for this icon
  const mappedIcon = encounterIconMappings[iconKey.toLowerCase()];
  const fileName = mappedIcon 
    ? `${mappedIcon}.png`
    : iconKey.endsWith('.png') ? iconKey : `${iconKey}.png`;
  
  const { data } = supabase.storage.from(ENCOUNTER_ICONS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export function getMissionIconUrl(iconKey: string): string {
  const fileName = `${iconKey}.png`;
  const { data } = supabase.storage.from(MISSION_ICONS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadMultipleResourceIcons(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    const { error } = await supabase.storage
      .from(RESOURCE_ICONS_BUCKET)
      .upload(file.name, file, { upsert: true });

    if (error) {
      failed++;
      errors.push(`${file.name}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
}

export async function uploadMultipleEventRewardIcons(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    const { error } = await supabase.storage
      .from(EVENT_REWARD_ICONS_BUCKET)
      .upload(file.name, file, { upsert: true });

    if (error) {
      failed++;
      errors.push(`${file.name}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
}

export async function uploadMultipleMenuBackgrounds(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    const { error } = await supabase.storage
      .from(MENU_BACKGROUNDS_BUCKET)
      .upload(file.name, file, { upsert: true });

    if (error) {
      failed++;
      errors.push(`${file.name}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
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

export async function uploadMultipleEncounterIcons(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    const { error } = await supabase.storage
      .from(ENCOUNTER_ICONS_BUCKET)
      .upload(file.name, file, { upsert: true });

    if (error) {
      failed++;
      errors.push(`${file.name}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
}

export async function uploadMultipleMissionIcons(
  files: FileList,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    const { error } = await supabase.storage
      .from(MISSION_ICONS_BUCKET)
      .upload(file.name, file, { upsert: true });

    if (error) {
      failed++;
      errors.push(`${file.name}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
}

export async function listEncounterIcons(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(ENCOUNTER_ICONS_BUCKET).list();
  if (error || !data) return [];
  return data.map(f => f.name);
}

export async function listMissionIcons(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(MISSION_ICONS_BUCKET).list();
  if (error || !data) return [];
  return data.map(f => f.name);
}
