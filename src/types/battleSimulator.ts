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

// Target area data for AOE abilities
export interface TargetAreaPosition {
  x: number;
  y: number;
  damagePercent?: number;
  weight?: number;
  order?: number;
}

export interface TargetArea {
  targetType: number; // 1 = single target, 2 = AOE pattern
  data: TargetAreaPosition[];
  random?: boolean;
  aoeOrderDelay?: number;
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
  statusEffects: Record<string, number>; // effect_id -> chance %
  targetArea?: TargetArea; // AOE targeting data
}

export interface StatusEffectPreview {
  effectId: number;
  name: string;
  chance: number;
  duration: number;
  damageType: number | null;
  dotDamage: number; // Calculated DoT damage per tick
  isImmune: boolean;
  isStun: boolean;
  color: string;
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
  // Multi-hit totals (shots_per_attack * attacks_per_use)
  totalShots: number;
  minTotalDamage: DamageResult;
  maxTotalDamage: DamageResult;
  dodgeChance: number;
  critChance: number;
  canTarget: boolean;
  targetHasArmor: boolean;
  targetArmorHp: number;
  targetHp: number;
  targetDefense: number;
  statusEffects: StatusEffectPreview[];
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

// Grid coordinate mapping: gridId -> {x, y} where y=0 is front row (ROW_1)
// x ranges from 0-4 for rows 1-2, and 0-2 for row 3 (centered)
export const GRID_ID_TO_COORDS: Record<number, { x: number; y: number }> = {
  // Row 1 (y=0): positions 0-4
  0: { x: 0, y: 0 }, 1: { x: 1, y: 0 }, 2: { x: 2, y: 0 }, 3: { x: 3, y: 0 }, 4: { x: 4, y: 0 },
  // Row 2 (y=1): positions 5-9
  5: { x: 0, y: 1 }, 6: { x: 1, y: 1 }, 7: { x: 2, y: 1 }, 8: { x: 3, y: 1 }, 9: { x: 4, y: 1 },
  // Row 3 (y=2): positions 11-13 (centered, so x = 1, 2, 3)
  11: { x: 1, y: 2 }, 12: { x: 2, y: 2 }, 13: { x: 3, y: 2 },
};

// Reverse mapping: {x,y} string -> gridId
export const COORDS_TO_GRID_ID: Record<string, number> = {
  "0,0": 0, "1,0": 1, "2,0": 2, "3,0": 3, "4,0": 4,
  "0,1": 5, "1,1": 6, "2,1": 7, "3,1": 8, "4,1": 9,
  "1,2": 11, "2,2": 12, "3,2": 13,
};

// Get grid positions affected by an AOE ability centered on a target position
export function getAffectedGridPositions(
  targetGridId: number,
  targetArea: TargetArea | undefined,
  isEnemy: boolean
): { gridId: number; damagePercent: number }[] {
  // If no target area or single target type, just return the target
  if (!targetArea || targetArea.targetType === 1 || targetArea.data.length === 0) {
    return [{ gridId: targetGridId, damagePercent: 100 }];
  }

  const targetCoords = GRID_ID_TO_COORDS[targetGridId];
  if (!targetCoords) return [{ gridId: targetGridId, damagePercent: 100 }];

  const affected: { gridId: number; damagePercent: number }[] = [];

  for (const pos of targetArea.data) {
    // Y direction: negative Y in data means towards enemy (forward), positive means toward friendly (backward)
    // For enemy grid, we need to flip the y direction since we're attacking from below
    const yOffset = isEnemy ? -pos.y : pos.y;
    
    const newX = targetCoords.x + pos.x;
    const newY = targetCoords.y + yOffset;
    
    // Check if this is a valid grid position
    const coordKey = `${newX},${newY}`;
    const gridId = COORDS_TO_GRID_ID[coordKey];
    
    if (gridId !== undefined) {
      affected.push({
        gridId,
        damagePercent: pos.damagePercent || 100,
      });
    }
  }

  // If no positions matched, at least include the target
  if (affected.length === 0) {
    affected.push({ gridId: targetGridId, damagePercent: 100 });
  }

  return affected;
}

// Damage type IDs to property names mapping
export const DAMAGE_TYPE_MAP: Record<number, keyof DamageMods> = {
  1: "piercing",
  2: "explosive",
  3: "fire",
  4: "cold",
  5: "crushing",
} as const;
