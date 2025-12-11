import { getUnitById } from "@/lib/units";
import { getAbilityById } from "@/lib/abilities";
import { unitMatchesTargets } from "@/lib/tagHierarchy";
import type { AbilityInfo, DamagePreview, DamageResult, PartyUnit } from "@/types/battleSimulator";
import { DAMAGE_TYPE_MAP } from "@/types/battleSimulator";
import type { EncounterUnit } from "@/types/encounters";
import type { DamageMods, UnitStats } from "@/types/units";

// Calculate damage at rank: Damage = Base Damage * (1 + 2 * 0.01 * Power)
export function calculateDamageAtRank(baseDamage: number, power: number): number {
  return Math.floor(baseDamage * (1 + 2 * 0.01 * power));
}

// Calculate dodge chance: defense - offense + 5 (only positive values)
export function calculateDodgeChance(defenderDefense: number, attackerOffense: number): number {
  const dodgeChance = defenderDefense - attackerOffense + 5;
  return Math.max(0, dodgeChance);
}

// Get damage modifier for a specific damage type
// Values can be stored as percentages (100 = 1x, 150 = 1.5x) or decimals (1.0 = 1x, 1.5 = 1.5x)
export function getDamageModifier(damageMods: DamageMods | undefined, damageType: number): number {
  if (!damageMods) return 1;
  const modKey = DAMAGE_TYPE_MAP[damageType];
  if (!modKey) return 1;
  const mod = damageMods[modKey];
  if (mod === undefined) return 1;
  // If value > 10, assume it's a percentage (e.g., 100, 150), otherwise it's a decimal (e.g., 1.0, 1.5)
  return mod > 10 ? mod / 100 : mod;
}

// Calculate damage with armor mechanics
export function calculateDamageWithArmor(
  rawDamage: number,
  armorHp: number,
  armorDamageMods: DamageMods | undefined,
  hpDamageMods: DamageMods | undefined,
  damageType: number,
  armorPiercingPercent: number
): DamageResult {
  // If no armor, damage goes straight to HP
  if (armorHp <= 0) {
    const hpMod = getDamageModifier(hpDamageMods, damageType);
    const hpDamage = Math.floor(rawDamage * hpMod);
    return {
      rawDamage,
      armorDamage: 0,
      hpDamage,
      armorRemaining: 0,
      effectiveMultiplier: hpMod,
    };
  }

  // Calculate armor effectiveness
  const armorMod = getDamageModifier(armorDamageMods, damageType);
  
  // Armor piercing: percentage of damage that bypasses armor entirely
  const piercingDamage = Math.floor(rawDamage * armorPiercingPercent);
  const armorableDamage = rawDamage - piercingDamage;
  
  // Effective armor capacity = armorHp / armorMod
  // If armorMod is 0.6 (60% damage taken), armor blocks more raw damage
  const effectiveArmorCapacity = armorMod > 0 ? Math.floor(armorHp / armorMod) : armorHp;
  
  let armorDamage = 0;
  let damageToHp = piercingDamage;
  let armorRemaining = armorHp;
  
  if (armorableDamage <= effectiveArmorCapacity) {
    // Armor absorbs all armorable damage
    armorDamage = Math.floor(armorableDamage * armorMod);
    armorRemaining = armorHp - armorDamage;
  } else {
    // Armor is depleted, remainder goes to HP
    armorDamage = armorHp;
    armorRemaining = 0;
    const overflowDamage = armorableDamage - effectiveArmorCapacity;
    damageToHp += overflowDamage;
  }
  
  // Apply HP damage modifier to the HP portion
  const hpMod = getDamageModifier(hpDamageMods, damageType);
  const hpDamage = Math.floor(damageToHp * hpMod);
  
  return {
    rawDamage,
    armorDamage,
    hpDamage,
    armorRemaining: Math.max(0, armorRemaining),
    effectiveMultiplier: hpMod,
  };
}

// Get all abilities for a unit at a specific rank
export function getUnitAbilities(unitId: number, rank: number): AbilityInfo[] {
  const unit = getUnitById(unitId);
  if (!unit?.weapons?.weapons) return [];

  const stats = unit.statsConfig?.stats?.[rank - 1];
  const power = stats?.power || 0;
  const accuracy = stats?.accuracy || 0;

  const abilities: AbilityInfo[] = [];

  Object.entries(unit.weapons.weapons).forEach(([weaponName, weapon]) => {
    weapon.abilities.forEach(abilityId => {
      const ability = getAbilityById(abilityId);
      if (!ability) return;

      const minDamage = calculateDamageAtRank(weapon.stats.base_damage_min, power);
      const maxDamage = calculateDamageAtRank(weapon.stats.base_damage_max, power);
      const offense = ability.stats.attack + accuracy;

      abilities.push({
        abilityId,
        weaponName,
        minDamage,
        maxDamage,
        offense,
        shotsPerAttack: ability.stats.shots_per_attack,
        attacksPerUse: (ability.stats as any).attacks_per_use || 1,
        lineOfFire: ability.stats.line_of_fire,
        targets: ability.stats.targets || [],
        damageType: ability.stats.damage_type,
        minRange: ability.stats.min_range,
        maxRange: ability.stats.max_range,
        cooldown: ability.stats.ability_cooldown,
        globalCooldown: (ability.stats as any).global_cooldown || 0,
        armorPiercing: ability.stats.armor_piercing_percent,
        critPercent: ability.stats.critical_hit_percent,
        critBonuses: (ability.stats as any).critical_bonuses || {},
        chargeTime: (ability.stats as any).charge_time || 0,
        suppressionMultiplier: (ability.stats as any).damage_distraction || 1,
        suppressionBonus: (ability.stats as any).damage_distraction_bonus || 0,
      });
    });
  });

  return abilities;
}

// Check if a unit can be targeted by an ability based on tags (with hierarchy)
export function canTargetUnit(targetUnitId: number, abilityTargets: number[]): boolean {
  if (abilityTargets.length === 0) return true; // No restrictions
  
  const targetUnit = getUnitById(targetUnitId);
  if (!targetUnit) return false;

  const unitTags = targetUnit.identity.tags;
  return unitMatchesTargets(unitTags, abilityTargets);
}

// Get unit stats at a specific rank
function getUnitStatsAtRank(unitId: number, rank: number): UnitStats | undefined {
  const unit = getUnitById(unitId);
  return unit?.statsConfig?.stats?.[rank - 1];
}

// Calculate crit chance based on base crit + class bonus
function calculateCritChance(baseCrit: number, critBonuses: Record<number, number>, targetUnitId: number): number {
  const targetUnit = getUnitById(targetUnitId);
  if (!targetUnit) return baseCrit;
  
  const className = targetUnit.identity.class_name;
  const classBonus = critBonuses[className] || 0;
  
  return baseCrit + classBonus;
}

// Calculate damage preview for all valid targets
export function calculateDamagePreviewsForEnemy(
  attackerAbility: AbilityInfo,
  enemyUnits: EncounterUnit[],
  enemyRankOverrides: Record<number, number> = {}
): DamagePreview[] {
  return enemyUnits
    .filter(u => u.grid_id !== undefined)
    .map(enemyUnit => {
      const enemy = getUnitById(enemyUnit.unit_id);
      const enemyRank = enemyRankOverrides[enemyUnit.grid_id!] || (enemy?.statsConfig?.stats?.length || 1);
      const enemyStats = getUnitStatsAtRank(enemyUnit.unit_id, enemyRank);
      const canTarget = canTargetUnit(enemyUnit.unit_id, attackerAbility.targets);
      const defense = enemyStats?.defense || 0;
      const dodgeChance = calculateDodgeChance(defense, attackerAbility.offense);
      const critChance = calculateCritChance(attackerAbility.critPercent, attackerAbility.critBonuses, enemyUnit.unit_id);

      const armorHp = enemyStats?.armor_hp || 0;
      const hp = enemyStats?.hp || 0;
      
      const minResult = calculateDamageWithArmor(
        attackerAbility.minDamage,
        armorHp,
        enemyStats?.armor_damage_mods,
        enemyStats?.damage_mods,
        attackerAbility.damageType,
        attackerAbility.armorPiercing
      );
      
      const maxResult = calculateDamageWithArmor(
        attackerAbility.maxDamage,
        armorHp,
        enemyStats?.armor_damage_mods,
        enemyStats?.damage_mods,
        attackerAbility.damageType,
        attackerAbility.armorPiercing
      );

      return {
        targetGridId: enemyUnit.grid_id!,
        targetUnitId: enemyUnit.unit_id,
        minDamage: minResult,
        maxDamage: maxResult,
        dodgeChance,
        critChance,
        canTarget,
        targetHasArmor: armorHp > 0,
        targetArmorHp: armorHp,
        targetHp: hp,
        targetDefense: defense,
      };
    });
}

export function calculateDamagePreviewsForFriendly(
  attackerAbility: AbilityInfo,
  friendlyUnits: PartyUnit[]
): DamagePreview[] {
  return friendlyUnits.map(friendlyUnit => {
    const unit = getUnitById(friendlyUnit.unitId);
    const stats = getUnitStatsAtRank(friendlyUnit.unitId, friendlyUnit.rank);
    const canTarget = canTargetUnit(friendlyUnit.unitId, attackerAbility.targets);
    const defense = stats?.defense || 0;
    const dodgeChance = calculateDodgeChance(defense, attackerAbility.offense);
    const critChance = calculateCritChance(attackerAbility.critPercent, attackerAbility.critBonuses, friendlyUnit.unitId);

    const armorHp = stats?.armor_hp || 0;
    const hp = stats?.hp || 0;
    
    const minResult = calculateDamageWithArmor(
      attackerAbility.minDamage,
      armorHp,
      stats?.armor_damage_mods,
      stats?.damage_mods,
      attackerAbility.damageType,
      attackerAbility.armorPiercing
    );
    
    const maxResult = calculateDamageWithArmor(
      attackerAbility.maxDamage,
      armorHp,
      stats?.armor_damage_mods,
      stats?.damage_mods,
      attackerAbility.damageType,
      attackerAbility.armorPiercing
    );

    return {
      targetGridId: friendlyUnit.gridId,
      targetUnitId: friendlyUnit.unitId,
      minDamage: minResult,
      maxDamage: maxResult,
      dodgeChance,
      critChance,
      canTarget,
      targetHasArmor: armorHp > 0,
      targetArmorHp: armorHp,
      targetHp: hp,
      targetDefense: defense,
    };
  });
}

// Get the first available grid position based on preferred row
export function getNextAvailablePosition(
  preferredRow: number,
  occupiedPositions: number[]
): number | null {
  const rowOrder = preferredRow === 1 ? [1, 2, 3] :
                   preferredRow === 2 ? [2, 1, 3] :
                   [3, 2, 1];

  const positions: Record<number, number[]> = {
    1: [0, 1, 2, 3, 4],
    2: [5, 6, 7, 8, 9],
    3: [11, 12, 13],
  };

  for (const row of rowOrder) {
    for (const pos of positions[row]) {
      if (!occupiedPositions.includes(pos)) {
        return pos;
      }
    }
  }

  return null;
}
