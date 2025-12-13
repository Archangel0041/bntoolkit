import type { AbilityInfo, PartyUnit, DamageResult } from "./battleSimulator";
import type { EncounterUnit } from "./encounters";

// Live battle unit with current HP/armor state
export interface LiveBattleUnit {
  unitId: number;
  gridId: number;
  rank: number;
  isEnemy: boolean;
  currentHp: number;
  maxHp: number;
  currentArmor: number;
  maxArmor: number;
  isDead: boolean;
  // Cooldowns for abilities: abilityId -> turns remaining
  abilityCooldowns: Record<number, number>;
  // Global cooldown per weapon: weaponName -> turns remaining
  weaponGlobalCooldown: Record<string, number>;
  // Weapon ammo: weaponName -> current ammo count
  weaponAmmo: Record<string, number>;
  // Weapon reload cooldown: weaponName -> turns until reloaded
  weaponReloadCooldown: Record<string, number>;
  // Status effects: effectId -> { duration, dotDamage, damageType }
  activeStatusEffects: ActiveStatusEffect[];
}

export interface ActiveStatusEffect {
  effectId: number;
  remainingDuration: number;
  dotDamage: number;
  dotDamageType: number | null;
  isStun: boolean;
}

// Battle action types
export type BattleActionType = "attack" | "skip" | "dodge" | "crit" | "status_applied" | "status_tick" | "death";

export interface BattleAction {
  type: BattleActionType;
  attackerGridId?: number;
  attackerName?: string;
  targetGridId?: number;
  targetName?: string;
  abilityId?: number;
  abilityName?: string;
  damage?: number;
  armorDamage?: number;
  hpDamage?: number;
  wasCrit?: boolean;
  wasDodged?: boolean;
  statusEffectId?: number;
  statusEffectName?: string;
  message: string;
}

export interface BattleTurn {
  turnNumber: number;
  isPlayerTurn: boolean;
  actions: BattleAction[];
}

export interface LiveBattleState {
  // Unit states
  friendlyUnits: LiveBattleUnit[];
  enemyUnits: LiveBattleUnit[];
  // Turn tracking
  currentTurn: number;
  isPlayerTurn: boolean;
  // Enemy phase tracking - which enemy is currently acting
  currentEnemyIndex: number;
  // Battle log
  battleLog: BattleTurn[];
  // Battle status
  isBattleOver: boolean;
  isPlayerVictory: boolean | null;
  // Current wave
  currentWave: number;
  totalWaves: number;
}

// Roll result for damage calculation
export interface DamageRoll {
  baseDamage: number;
  isCrit: boolean;
  isDodged: boolean;
  finalDamage: number;
  armorDamage: number;
  hpDamage: number;
}

// Unit deploy limits from battle_config
export interface UnitTagDeployLimit {
  tagId: number;
  limit: number;
  stringId: string;
}
