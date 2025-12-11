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
  targetType: number; // 1 = single target/fixed, 2 = AOE pattern (movable)
  data: TargetAreaPosition[];
  random?: boolean;
  aoeOrderDelay?: number;
}

// Line of Fire types
export const LineOfFire = {
  Contact: 0,  // Can only target first unit in range
  Direct: 1,   // Can fire past None blocking units
  Precise: 2,  // Can target behind Partial blocking, not Full
  Indirect: 3, // Can target any unit in range
} as const;

export const LineOfFireLabels: Record<number, string> = {
  [LineOfFire.Contact]: "Contact",
  [LineOfFire.Direct]: "Direct",
  [LineOfFire.Precise]: "Precise",
  [LineOfFire.Indirect]: "Indirect",
};

export interface AbilityInfo {
  abilityId: number;
  weaponName: string;
  minDamage: number;
  maxDamage: number;
  offense: number;
  shotsPerAttack: number;
  attacksPerUse: number;
  lineOfFire: number; // 0=Contact, 1=Direct, 2=Precise, 3=Indirect
  attackDirection: number; // 1=Front, 2=Back
  targets: number[];
  damageType: number;
  minRange: number;
  maxRange: number;
  cooldown: number;
  globalCooldown: number;
  armorPiercing: number;
  critPercent: number;
  critBonuses: Record<number, number>; // tag_id -> bonus crit %
  chargeTime: number;
  suppressionMultiplier: number;
  suppressionBonus: number;
  statusEffects: Record<string, number>; // effect_id -> chance %
  targetArea?: TargetArea; // AOE targeting data
  isFixed: boolean; // True if attack pattern is fixed (can't be aimed)
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
  // AOE damage modifier (100 = full damage, 25 = 25% splash)
  damagePercent: number;
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
  // If no target area or single target type with no data, just return the target
  if (!targetArea || targetArea.data.length === 0) {
    return [{ gridId: targetGridId, damagePercent: 100 }];
  }

  // For target_type 1 (single/fixed), positions are relative to the attacker, not the target
  // For target_type 2 (AOE), positions are relative to the selected target

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

// Get fixed attack pattern positions relative to attacker's grid position
export function getFixedAttackPositions(
  attackerGridId: number,
  targetArea: TargetArea | undefined,
  isAttackerFriendly: boolean
): { gridId: number; damagePercent: number }[] {
  if (!targetArea || targetArea.data.length === 0) {
    return [];
  }

  const attackerCoords = GRID_ID_TO_COORDS[attackerGridId];
  if (!attackerCoords) return [];

  const affected: { gridId: number; damagePercent: number }[] = [];

  // For fixed attacks, the y positions in data are absolute offsets from the attacker
  // Negative y = toward enemy, Positive y = toward friendly side
  // When attacking as friendly (bottom), enemy is above (y decreases)
  // When attacking as enemy (top), friendly is below (y increases)

  for (const pos of targetArea.data) {
    // From friendly attacker perspective: negative Y goes toward enemy grid (which has y=0,1,2 going back)
    // The attack data y offsets are relative: -1 = one row toward enemy, -2 = two rows toward enemy
    const yOffset = isAttackerFriendly ? pos.y : -pos.y;
    
    const newX = attackerCoords.x + pos.x;
    const newY = attackerCoords.y + yOffset;
    
    // For fixed attacks targeting the enemy side, we need to map to enemy grid coordinates
    // The "enemy grid" from friendly perspective starts at y=-3 (enemy back row), y=-2 (enemy middle), y=-1 (enemy front)
    // But we store enemy grid with y=0,1,2 (front to back)
    
    // If targeting enemy (newY < 0), convert to enemy grid coords
    let targetGridId: number | undefined;
    
    if (newY < 0 && isAttackerFriendly) {
      // Convert negative Y to enemy grid (y=0 is enemy front row, y=2 is enemy back)
      const enemyY = Math.abs(newY) - 1; // -1 -> 0, -2 -> 1, -3 -> 2
      const coordKey = `${newX},${enemyY}`;
      targetGridId = COORDS_TO_GRID_ID[coordKey];
    } else if (newY >= 0) {
      // Still on same side
      const coordKey = `${newX},${newY}`;
      targetGridId = COORDS_TO_GRID_ID[coordKey];
    }
    
    if (targetGridId !== undefined) {
      affected.push({
        gridId: targetGridId,
        damagePercent: pos.damagePercent || 100,
      });
    }
  }

  return affected;
}

// Calculate the row distance between attacker and target grids
// Returns the number of rows between them (used for range calculation)
export function calculateRowDistance(
  attackerGridId: number,
  targetGridId: number,
  attackerIsEnemy: boolean
): number {
  const attackerCoords = GRID_ID_TO_COORDS[attackerGridId];
  const targetCoords = GRID_ID_TO_COORDS[targetGridId];
  
  if (!attackerCoords || !targetCoords) return 999;
  
  // Both grids use y=0 as front, y=2 as back
  // Distance from friendly front (y=0) to enemy front (y=0) is 1 row
  // Friendly back (y=2) to enemy front (y=0) is 3 rows
  
  if (attackerIsEnemy) {
    // Enemy attacking friendly: enemy back to friendly front
    // Enemy y=2 to friendly y=0 = 2 + 0 + 1 = 3 rows
    return attackerCoords.y + targetCoords.y + 1;
  } else {
    // Friendly attacking enemy: friendly back to enemy front
    return attackerCoords.y + targetCoords.y + 1;
  }
}

// Check if an ability can reach a target based on range
export function isInRange(
  attackerGridId: number,
  targetGridId: number,
  minRange: number,
  maxRange: number,
  attackerIsEnemy: boolean
): boolean {
  const distance = calculateRowDistance(attackerGridId, targetGridId, attackerIsEnemy);
  return distance >= minRange && distance <= maxRange;
}

// Damage type IDs to property names mapping
export const DAMAGE_TYPE_MAP: Record<number, keyof DamageMods> = {
  1: "piercing",
  2: "explosive",
  3: "fire",
  4: "cold",
  5: "crushing",
} as const;
