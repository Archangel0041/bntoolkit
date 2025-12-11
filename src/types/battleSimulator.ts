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
  lineOfFire: number | undefined;
  targets: number[];
  damageType: number;
  minRange: number;
  maxRange: number;
  cooldown: number;
  armorPiercing: number;
  critPercent: number;
}

export interface DamagePreview {
  targetGridId: number;
  targetUnitId: number;
  minDamage: number;
  maxDamage: number;
  dodgeChance: number;
  canTarget: boolean;
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
