import statusEffectFamiliesData from "@/data/status_effect_families.json";

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

export function getAllStatusEffectFamilies(): { id: number; family: StatusEffectFamily }[] {
  return Object.entries(families).map(([id, family]) => ({
    id: parseInt(id),
    family,
  }));
}
