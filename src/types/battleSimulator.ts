import type { DamageMods } from "@/types/units";

export interface PartyUnit {
  unitId: number;
  gridId: number;
  rank: number;
}

export interface Party {
  id: string;
  name: string;
  units: PartyUnit[];
  createdAt: number;
  updatedAt: number;
}

// Temporary formation state (not saved to storage)
export interface TempFormation {
  units: PartyUnit[];
}

export interface SelectedUnit {
  unitId: number;
  gridId: number;
  rank: number;
  isEnemy: boolean;
}

export interface AbilityInfo {
  abilityId: number;
  weaponName: string;
  minDamage: number;
  maxDamage: number;
  offense: number;
  shotsPerAttack: number;
  attacksPerUse: number;
  lineOfFire: number | undefined;
  targets: number[];
  damageType: number;
  minRange: number;
  maxRange: number;
  cooldown: number;
  globalCooldown: number;
  armorPiercing: number;
  critPercent: number;
  critBonuses: Record<number, number>; // class_name -> bonus crit %
  chargeTime: number;
  suppressionMultiplier: number;
  suppressionBonus: number;
}

export interface DamageResult {
  rawDamage: number;
  armorDamage: number;
  hpDamage: number;
  armorRemaining: number;
  effectiveMultiplier: number;
}

export interface DamagePreview {
  targetGridId: number;
  targetUnitId: number;
  minDamage: DamageResult;
  maxDamage: DamageResult;
  dodgeChance: number;
  critChance: number;
  canTarget: boolean;
  targetHasArmor: boolean;
  targetArmorHp: number;
  targetHp: number;
  targetDefense: number;
}

// Row mapping: preferred_row 1 = front (row 1), 2 = middle (row 2), 3 = back (row 3)
export const PREFERRED_ROW_MAP = {
  1: [4, 3, 2, 1, 0],      // Row 1 positions
  2: [9, 8, 7, 6, 5],      // Row 2 positions
  3: [13, 12, 11],         // Row 3 positions
} as const;

export const FRIENDLY_GRID_LAYOUT = {
  ROW_1: [0, 1, 2, 3, 4],   // Mirrored for friendly side
  ROW_2: [5, 6, 7, 8, 9],
  ROW_3: [11, 12, 13],
} as const;

export const ENEMY_GRID_LAYOUT = {
  ROW_1: [4, 3, 2, 1, 0],
  ROW_2: [9, 8, 7, 6, 5],
  ROW_3: [13, 12, 11],
} as const;

// Damage type IDs to property names mapping
export const DAMAGE_TYPE_MAP: Record<number, keyof DamageMods> = {
  1: "piercing",
  2: "explosive",
  3: "fire",
  4: "cold",
  5: "crushing",
} as const;
