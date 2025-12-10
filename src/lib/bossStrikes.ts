import bossStrikeData from "@/data/boss_strike_config.json";
import type { BossStrike, BossStrikeData, TierInfo, TierEncounter } from "@/types/bossStrike";

const rawData = bossStrikeData as BossStrikeData;

export function getBossStrikeById(id: number | string): BossStrike | undefined {
  return rawData[String(id)];
}

export function getAllBossStrikeIds(): string[] {
  return Object.keys(rawData).sort((a, b) => parseInt(a) - parseInt(b));
}

export function getTierEncountersByLevelRange(tier: TierInfo): Map<string, TierEncounter[]> {
  const grouped = new Map<string, TierEncounter[]>();
  
  tier.encounters.forEach(enc => {
    const minLevel = enc.min_level ?? 1;
    const key = `${minLevel}-${enc.max_level}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(enc);
  });
  
  return grouped;
}

export function formatRewards(rewards: TierInfo["rewards"]): { type: string; key: string; amount: number }[] {
  const formatted: { type: string; key: string; amount: number }[] = [];
  
  if (rewards.resources) {
    Object.entries(rewards.resources).forEach(([key, amount]) => {
      formatted.push({ type: "resource", key, amount });
    });
  }
  
  if (rewards.units) {
    rewards.units.forEach(unitId => {
      formatted.push({ type: "unit", key: String(unitId), amount: 1 });
    });
  }
  
  if (rewards.items) {
    Object.entries(rewards.items).forEach(([key, amount]) => {
      formatted.push({ type: "item", key, amount });
    });
  }
  
  return formatted;
}
