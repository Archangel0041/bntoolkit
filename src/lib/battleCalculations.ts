import { getUnitById } from "@/lib/units";
import { getAbilityById } from "@/lib/abilities";
import type { AbilityInfo, DamagePreview, PartyUnit } from "@/types/battleSimulator";
import type { EncounterUnit } from "@/types/encounters";

// Calculate damage at rank: Damage = Base Damage * (1 + 2 * 0.01 * Power)
export function calculateDamageAtRank(baseDamage: number, power: number): number {
  return Math.floor(baseDamage * (1 + 2 * 0.01 * power));
}

// Calculate dodge chance: defense - offense + 5 (only positive values)
export function calculateDodgeChance(defenderDefense: number, attackerOffense: number): number {
  const dodgeChance = defenderDefense - attackerOffense + 5;
  return Math.max(0, dodgeChance);
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
        lineOfFire: ability.stats.line_of_fire,
        targets: ability.stats.targets || [],
        damageType: ability.stats.damage_type,
        minRange: ability.stats.min_range,
        maxRange: ability.stats.max_range,
        cooldown: ability.stats.ability_cooldown,
        armorPiercing: ability.stats.armor_piercing_percent,
        critPercent: ability.stats.critical_hit_percent,
      });
    });
  });

  return abilities;
}

// Check if a unit can be targeted by an ability based on tags
export function canTargetUnit(targetUnitId: number, abilityTargets: number[]): boolean {
  if (abilityTargets.length === 0) return true; // No restrictions
  
  const targetUnit = getUnitById(targetUnitId);
  if (!targetUnit) return false;

  const unitTags = targetUnit.identity.tags;
  return abilityTargets.some(targetTag => unitTags.includes(targetTag));
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
      const enemyStats = enemy?.statsConfig?.stats?.[enemyRank - 1];
      const canTarget = canTargetUnit(enemyUnit.unit_id, attackerAbility.targets);
      const dodgeChance = calculateDodgeChance(enemyStats?.defense || 0, attackerAbility.offense);

      return {
        targetGridId: enemyUnit.grid_id!,
        targetUnitId: enemyUnit.unit_id,
        minDamage: attackerAbility.minDamage,
        maxDamage: attackerAbility.maxDamage,
        dodgeChance,
        canTarget,
      };
    });
}

export function calculateDamagePreviewsForFriendly(
  attackerAbility: AbilityInfo,
  friendlyUnits: PartyUnit[]
): DamagePreview[] {
  return friendlyUnits.map(friendlyUnit => {
    const unit = getUnitById(friendlyUnit.unitId);
    const stats = unit?.statsConfig?.stats?.[friendlyUnit.rank - 1];
    const canTarget = canTargetUnit(friendlyUnit.unitId, attackerAbility.targets);
    const dodgeChance = calculateDodgeChance(stats?.defense || 0, attackerAbility.offense);

    return {
      targetGridId: friendlyUnit.gridId,
      targetUnitId: friendlyUnit.unitId,
      minDamage: attackerAbility.minDamage,
      maxDamage: attackerAbility.maxDamage,
      dodgeChance,
      canTarget,
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
