import { getUnitById } from "@/lib/units";
import { getAbilityById } from "@/lib/abilities";
import { getUnitAbilities, calculateDodgeChance, calculateDamageWithArmor, canTargetUnit, getDamageModifier } from "@/lib/battleCalculations";
import { getBlockingUnits, checkLineOfFire, calculateRange } from "@/lib/battleTargeting";
import { getStatusEffect } from "@/lib/statusEffects";
import { unitMatchesTargets } from "@/lib/tagHierarchy";
import { getAffectedGridPositions, getFixedAttackPositions, GRID_ID_TO_COORDS, COORDS_TO_GRID_ID } from "@/types/battleSimulator";
import type { AbilityInfo, PartyUnit, TargetArea, DamageAreaPosition } from "@/types/battleSimulator";
import type { EncounterUnit } from "@/types/encounters";
import type { 
  LiveBattleUnit, 
  LiveBattleState, 
  BattleAction, 
  BattleTurn,
  DamageRoll,
  ActiveStatusEffect 
} from "@/types/liveBattle";

// Get combined damage modifiers from a unit's active status effects
// Returns modifiers keyed by damage type
export function getStatusEffectDamageMods(unit: LiveBattleUnit): Record<string, number> {
  const mods: Record<string, number> = {};
  
  for (const activeEffect of unit.activeStatusEffects) {
    const effect = getStatusEffect(activeEffect.effectId);
    if (!effect?.stun_damage_mods) continue;
    
    // Merge damage modifiers (take the highest modifier for each damage type)
    for (const [damageType, modifier] of Object.entries(effect.stun_damage_mods)) {
      if (!mods[damageType] || modifier > mods[damageType]) {
        mods[damageType] = modifier;
      }
    }
  }
  
  return mods;
}

// Get combined armor damage modifiers from a unit's active status effects
export function getStatusEffectArmorDamageMods(unit: LiveBattleUnit): Record<string, number> {
  const mods: Record<string, number> = {};
  
  for (const activeEffect of unit.activeStatusEffects) {
    const effect = getStatusEffect(activeEffect.effectId);
    if (!effect?.stun_armor_damage_mods) continue;
    
    for (const [damageType, modifier] of Object.entries(effect.stun_armor_damage_mods)) {
      if (!mods[damageType] || modifier > mods[damageType]) {
        mods[damageType] = modifier;
      }
    }
  }
  
  return mods;
}

// Check if unit has a stun/freeze effect that bypasses armor (for Active armor units)
export function hasArmorBypassingStun(unit: LiveBattleUnit, unitArmorDefenseStyle?: string): boolean {
  // Only Riot Trooper and Armadillo (Active armor style) bypass armor when stunned
  if (unitArmorDefenseStyle !== 'active') return false;
  
  return unit.activeStatusEffects.some(e => e.isStun);
}

// Initialize a live battle unit from party/encounter unit
export function createLiveBattleUnit(
  unitId: number,
  gridId: number,
  rank: number,
  isEnemy: boolean
): LiveBattleUnit | null {
  const unit = getUnitById(unitId);
  if (!unit) return null;

  const stats = unit.statsConfig?.stats?.[rank - 1];
  const hp = stats?.hp || 100;
  const armor = stats?.armor_hp || 0;

  // Initialize weapon ammo
  const weaponAmmo: Record<string, number> = {};
  const weaponReloadCooldown: Record<string, number> = {};
  
  if (unit.weapons?.weapons) {
    for (const [weaponName, weapon] of Object.entries(unit.weapons.weapons)) {
      // -1 means infinite ammo
      weaponAmmo[weaponName] = weapon.stats.ammo === -1 ? -1 : weapon.stats.ammo;
      weaponReloadCooldown[weaponName] = 0;
    }
  }

  return {
    unitId,
    gridId,
    rank,
    isEnemy,
    currentHp: hp,
    maxHp: hp,
    currentArmor: armor,
    maxArmor: armor,
    isDead: false,
    abilityCooldowns: {},
    weaponGlobalCooldown: {},
    weaponAmmo,
    weaponReloadCooldown,
    activeStatusEffects: [],
  };
}

// Initialize battle state from encounter and party
export function initializeBattle(
  friendlyParty: PartyUnit[],
  enemyWaves: EncounterUnit[][],
  startingWave: number = 0
): LiveBattleState {
  const friendlyUnits = friendlyParty
    .map(u => createLiveBattleUnit(u.unitId, u.gridId, u.rank, false))
    .filter((u): u is LiveBattleUnit => u !== null);

  const currentWaveUnits = enemyWaves[startingWave] || [];
  const enemyUnits = currentWaveUnits
    .filter(u => u.grid_id !== undefined)
    .map(u => {
      const unit = getUnitById(u.unit_id);
      const maxRank = unit?.statsConfig?.stats?.length || 1;
      return createLiveBattleUnit(u.unit_id, u.grid_id!, maxRank, true);
    })
    .filter((u): u is LiveBattleUnit => u !== null);

  return {
    friendlyUnits,
    enemyUnits,
    currentTurn: 1,
    isPlayerTurn: true, // Player always goes first
    currentEnemyIndex: 0, // Start from first enemy
    battleLog: [],
    isBattleOver: false,
    isPlayerVictory: null,
    currentWave: startingWave,
    totalWaves: enemyWaves.length,
  };
}

// Roll random damage between min and max
export function rollDamage(minDamage: number, maxDamage: number): number {
  return Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
}

// Roll for dodge (returns true if attack misses)
export function rollDodge(dodgeChance: number): boolean {
  if (dodgeChance <= 0) return false;
  return Math.random() * 100 < dodgeChance;
}

// Roll for critical hit
export function rollCrit(critChance: number): boolean {
  if (critChance <= 0) return false;
  return Math.random() * 100 < critChance;
}

// Roll for status effect application
export function rollStatusEffect(chance: number): boolean {
  if (chance <= 0) return false;
  return Math.random() * 100 < chance;
}

// Check if a weapon has enough ammo for an ability
function hasEnoughAmmo(unit: LiveBattleUnit, ability: AbilityInfo): boolean {
  // -1 means infinite ammo
  if (ability.weaponMaxAmmo === -1) return true;
  
  // Check if weapon is reloading
  if (unit.weaponReloadCooldown[ability.weaponName] > 0) return false;
  
  // Check if enough ammo
  const currentAmmo = unit.weaponAmmo[ability.weaponName] ?? 0;
  return currentAmmo >= ability.ammoRequired;
}

// Get available abilities for a unit (respecting cooldowns and ammo)
export function getAvailableAbilities(
  unit: LiveBattleUnit,
  allEnemies: LiveBattleUnit[],
  allFriendlies: LiveBattleUnit[]
): AbilityInfo[] {
  const abilities = getUnitAbilities(unit.unitId, unit.rank);
  console.log(`[getAvailableAbilities] Unit ${unit.unitId} has ${abilities.length} total abilities`);
  
  const available = abilities.filter(ability => {
    // Check ability-specific cooldown
    if (unit.abilityCooldowns[ability.abilityId] > 0) {
      console.log(`[getAvailableAbilities] Ability ${ability.abilityId} is on cooldown`);
      return false;
    }
    
    // Check weapon global cooldown - blocks ALL abilities on this weapon
    if (unit.weaponGlobalCooldown[ability.weaponName] > 0) {
      console.log(`[getAvailableAbilities] Ability ${ability.abilityId} blocked by weapon global cooldown (weapon: ${ability.weaponName})`);
      return false;
    }
    
    // Check ammo
    if (!hasEnoughAmmo(unit, ability)) {
      console.log(`[getAvailableAbilities] Ability ${ability.abilityId} has no ammo`);
      return false;
    }

    // Check if there's at least one valid target
    const targets = unit.isEnemy ? allFriendlies : allEnemies;
    const aliveTargets = targets.filter(t => !t.isDead);
    
  // For Contact line of fire, only target units in the closest row
    if (ability.lineOfFire === 0) { // Contact
      // For enemies attacking friendlies, "front" is highest y (row 2 is closest to enemy grid)
      // For friendlies attacking enemies, "front" is lowest y (row 0 is closest to friendly grid)
      let closestRow = unit.isEnemy ? -Infinity : Infinity;
      for (const target of aliveTargets) {
        const range = calculateRange(unit.gridId, target.gridId, unit.isEnemy);
        if (range >= ability.minRange && range <= ability.maxRange) {
          if (canTargetUnit(target.unitId, ability.targets)) {
            const coords = GRID_ID_TO_COORDS[target.gridId];
            if (coords) {
              if (unit.isEnemy && coords.y > closestRow) {
                closestRow = coords.y;
              } else if (!unit.isEnemy && coords.y < closestRow) {
                closestRow = coords.y;
              }
            }
          }
        }
      }
      if (closestRow === (unit.isEnemy ? -Infinity : Infinity)) {
        console.log(`[getAvailableAbilities] Ability ${ability.abilityId} (Contact) has no valid targets`);
        return false;
      }
      console.log(`[getAvailableAbilities] Ability ${ability.abilityId} (Contact) has targets in row ${closestRow}`);
      return true;
    }
    
    // For other line of fire types, check blocking
    const blockingUnits = getBlockingUnits(
      aliveTargets.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
      true
    );
    
    for (const target of aliveTargets) {
      if (!canTargetUnit(target.unitId, ability.targets)) continue;
      const range = calculateRange(unit.gridId, target.gridId, unit.isEnemy);
      if (range < ability.minRange || range > ability.maxRange) continue;
      const blockCheck = checkLineOfFire(unit.gridId, target.gridId, ability.lineOfFire, unit.isEnemy, blockingUnits);
      if (!blockCheck.isBlocked) {
        console.log(`[getAvailableAbilities] Ability ${ability.abilityId} has valid target ${target.unitId}`);
        return true;
      }
    }
    
    console.log(`[getAvailableAbilities] Ability ${ability.abilityId} has no valid targets`);
    return false;
  });
  
  console.log(`[getAvailableAbilities] Unit ${unit.unitId} has ${available.length} available abilities`);
  return available;
}

// Get valid targets for an ability
export function getValidTargets(
  attacker: LiveBattleUnit,
  ability: AbilityInfo,
  allEnemies: LiveBattleUnit[],
  allFriendlies: LiveBattleUnit[]
): LiveBattleUnit[] {
  const targets = attacker.isEnemy ? allFriendlies : allEnemies;
  const aliveTargets = targets.filter(t => !t.isDead);
  
  // Only alive units can block
  // Use grid_id format for EncounterUnit-style mapping (isEnemy=true uses grid_id)
  const blockingUnits = getBlockingUnits(
    aliveTargets.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
    true // Always use EncounterUnit format (grid_id) since we're mapping with grid_id
  );

  // For Contact line of fire, only target units in the closest row with valid targets
  if (ability.lineOfFire === 0) { // Contact
    // For enemies attacking friendlies, "front" is highest y (row 2 is closest to enemy grid)
    // For friendlies attacking enemies, "front" is lowest y (row 0 is closest to friendly grid)
    let closestRow = attacker.isEnemy ? -Infinity : Infinity;
    for (const target of aliveTargets) {
      const range = calculateRange(attacker.gridId, target.gridId, attacker.isEnemy);
      if (range >= ability.minRange && range <= ability.maxRange) {
        if (canTargetUnit(target.unitId, ability.targets)) {
          const coords = GRID_ID_TO_COORDS[target.gridId];
          if (coords) {
            if (attacker.isEnemy && coords.y > closestRow) {
              closestRow = coords.y;
            } else if (!attacker.isEnemy && coords.y < closestRow) {
              closestRow = coords.y;
            }
          }
        }
      }
    }
    
    // Only return targets in that closest row
    if (closestRow !== (attacker.isEnemy ? -Infinity : Infinity)) {
      return aliveTargets.filter(target => {
        const coords = GRID_ID_TO_COORDS[target.gridId];
        if (!coords || coords.y !== closestRow) return false;
        if (!canTargetUnit(target.unitId, ability.targets)) return false;
        const range = calculateRange(attacker.gridId, target.gridId, attacker.isEnemy);
        return range >= ability.minRange && range <= ability.maxRange;
      });
    }
    return [];
  }

  return aliveTargets.filter(target => {
    // Check tag targeting
    if (!canTargetUnit(target.unitId, ability.targets)) return false;
    
    // Check range
    const range = calculateRange(attacker.gridId, target.gridId, attacker.isEnemy);
    if (range < ability.minRange || range > ability.maxRange) return false;
    
    // Check line of fire
    const blockCheck = checkLineOfFire(
      attacker.gridId,
      target.gridId,
      ability.lineOfFire,
      attacker.isEnemy,
      blockingUnits
    );
    
    // Debug logging for blocking
    console.log(`[getValidTargets] Attacker grid ${attacker.gridId} -> Target grid ${target.gridId}, ` +
      `lineOfFire: ${ability.lineOfFire}, blocked: ${blockCheck.isBlocked}, ` +
      `reason: ${blockCheck.reason || 'none'}, blockedBy: ${blockCheck.blockedBy?.unitId || 'none'}`);
    
    return !blockCheck.isBlocked;
  });
}

// Collapse grid - move units forward when front row is empty
// Row 0 is front, row 1 is middle, row 2 is back
export function collapseGrid(units: LiveBattleUnit[]): void {
  const aliveUnits = units.filter(u => !u.isDead);
  if (aliveUnits.length === 0) return;
  
  // Check each row from front to back
  // If a row is empty and there are units behind it, move them forward
  for (let targetRow = 0; targetRow <= 1; targetRow++) {
    const unitsInRow = aliveUnits.filter(u => {
      const coords = GRID_ID_TO_COORDS[u.gridId];
      return coords?.y === targetRow;
    });
    
    if (unitsInRow.length === 0) {
      // Row is empty, move units from next row forward
      for (let sourceRow = targetRow + 1; sourceRow <= 2; sourceRow++) {
        const unitsToMove = aliveUnits.filter(u => {
          const coords = GRID_ID_TO_COORDS[u.gridId];
          return coords?.y === sourceRow;
        });
        
        if (unitsToMove.length > 0) {
          // Move these units one row forward
          for (const unit of unitsToMove) {
            const coords = GRID_ID_TO_COORDS[unit.gridId];
            if (coords) {
              const newGridId = COORDS_TO_GRID_ID[`${coords.x},${targetRow}`];
              if (newGridId !== undefined) {
                console.log(`[collapseGrid] Moving unit ${unit.unitId} from grid ${unit.gridId} to ${newGridId}`);
                unit.gridId = newGridId;
              }
            }
          }
          break; // Only move from the next occupied row
        }
      }
    }
  }
}

// Execute an attack and return the actions
export function executeAttack(
  attacker: LiveBattleUnit,
  ability: AbilityInfo,
  targetGridId: number,
  state: LiveBattleState,
  environmentalDamageMods?: Record<string, number>
): BattleAction[] {
  const actions: BattleAction[] = [];
  const allTargets = attacker.isEnemy ? state.friendlyUnits : state.enemyUnits;
  
  // Get affected positions (for AOE/fixed attacks)
  let affectedPositions: { gridId: number; damagePercent: number }[];
  
  if (ability.isFixed && ability.targetArea) {
    const fixedPos = getFixedAttackPositions(attacker.gridId, ability.targetArea, !attacker.isEnemy);
    affectedPositions = fixedPos.map(p => ({ gridId: p.gridId, damagePercent: p.damagePercent }));
  } else if (ability.targetArea && !ability.isSingleTarget) {
    affectedPositions = getAffectedGridPositions(targetGridId, ability.targetArea, !attacker.isEnemy, ability.damageArea);
  } else {
    affectedPositions = [{ gridId: targetGridId, damagePercent: 100 }];
  }

  const abilityData = getAbilityById(ability.abilityId);
  const abilityName = abilityData?.name || `Ability ${ability.abilityId}`;
  
  const totalShots = ability.shotsPerAttack * ability.attacksPerUse;
  
  for (const pos of affectedPositions) {
    const target = allTargets.find(u => u.gridId === pos.gridId && !u.isDead);
    if (!target) continue;
    
    const targetUnit = getUnitById(target.unitId);
    const targetStats = targetUnit?.statsConfig?.stats?.[target.rank - 1];
    const defense = targetStats?.defense || 0;
    
    // Reduce dodge chance if target is stunned/frozen
    const isStunned = target.activeStatusEffects.some(e => e.isStun);
    const stunDodgePenalty = isStunned ? 20 : 0; // Stunned units have reduced dodge
    const effectiveDodgeChance = Math.max(0, calculateDodgeChance(defense, ability.offense) - stunDodgePenalty);
    
    // Calculate crit chance with bonuses
    let critChance = ability.critPercent;
    const targetTags = targetUnit?.identity?.tags || [];
    for (const tag of targetTags) {
      if (ability.critBonuses[tag]) {
        critChance += ability.critBonuses[tag];
      }
    }
    
    // Roll dodge
    if (rollDodge(effectiveDodgeChance)) {
      actions.push({
        type: "dodge",
        attackerGridId: attacker.gridId,
        targetGridId: target.gridId,
        abilityId: ability.abilityId,
        abilityName,
        wasDodged: true,
        message: `Attack dodged!`,
      });
      continue;
    }
    
    // Get status effect damage modifiers from target
    const statusDamageMods = getStatusEffectDamageMods(target);
    const statusArmorDamageMods = getStatusEffectArmorDamageMods(target);
    
    // Check if armor is bypassed due to stun (Active armor units only)
    // armor_def_style: 1 = Passive, 2 = Active
    const armorDefStyle = targetStats?.armor_def_style;
    const bypassArmor = armorDefStyle === 2 && isStunned;
    
    // Roll damage for all shots
    let totalArmorDamage = 0;
    let totalHpDamage = 0;
    
    for (let shot = 0; shot < totalShots; shot++) {
      // Roll base damage
      const baseDamage = rollDamage(ability.minDamage, ability.maxDamage);
      
      // Apply damage percent modifier
      const adjustedDamage = Math.floor(baseDamage * (pos.damagePercent / 100));
      
      // Roll crit
      const isCrit = rollCrit(critChance);
      const critMultiplier = isCrit ? 2 : 1;
      const finalBaseDamage = Math.floor(adjustedDamage * critMultiplier);
      
      // Calculate damage with armor and status effect modifiers
      const result = calculateDamageWithArmor(
        finalBaseDamage,
        target.currentArmor,
        targetStats?.armor_damage_mods,
        targetStats?.damage_mods,
        ability.damageType,
        ability.armorPiercing,
        environmentalDamageMods,
        Object.keys(statusDamageMods).length > 0 ? statusDamageMods : undefined,
        Object.keys(statusArmorDamageMods).length > 0 ? statusArmorDamageMods : undefined,
        bypassArmor
      );
      
      // Apply damage
      target.currentArmor = Math.max(0, target.currentArmor - result.armorDamage);
      target.currentHp = Math.max(0, target.currentHp - result.hpDamage);
      
      totalArmorDamage += result.armorDamage;
      totalHpDamage += result.hpDamage;
      
      if (isCrit) {
        actions.push({
          type: "crit",
          attackerGridId: attacker.gridId,
          targetGridId: target.gridId,
          abilityId: ability.abilityId,
          wasCrit: true,
          message: `Critical hit!`,
        });
      }
    }
    
    actions.push({
      type: "attack",
      attackerGridId: attacker.gridId,
      targetGridId: target.gridId,
      abilityId: ability.abilityId,
      abilityName,
      damage: totalArmorDamage + totalHpDamage,
      armorDamage: totalArmorDamage,
      hpDamage: totalHpDamage,
      message: `Dealt ${totalHpDamage} HP damage${totalArmorDamage > 0 ? ` and ${totalArmorDamage} armor damage` : ''}`,
    });
    
    // Check for death
    if (target.currentHp <= 0) {
      target.isDead = true;
      actions.push({
        type: "death",
        targetGridId: target.gridId,
        message: `Unit defeated!`,
      });
    }
    
    // Apply status effects (scaled by damage percent)
    const immunities = targetUnit?.statsConfig?.status_effect_immunities || [];
    for (const [effectIdStr, chance] of Object.entries(ability.statusEffects)) {
      const effectId = parseInt(effectIdStr);
      const effect = getStatusEffect(effectId);
      if (!effect) continue;
      
      // Check immunity
      if (immunities.includes(effect.family)) continue;
      
      // Scale chance by damage percent
      const adjustedChance = Math.floor(chance * (pos.damagePercent / 100));
      
      if (rollStatusEffect(adjustedChance)) {
        // Calculate DoT damage
        let dotDamage = 0;
        if (effect.dot_ability_damage_mult || effect.dot_bonus_damage) {
          const avgDamage = Math.floor((ability.minDamage + ability.maxDamage) / 2);
          dotDamage = Math.floor(avgDamage * (effect.dot_ability_damage_mult || 0) + (effect.dot_bonus_damage || 0));
        }
        
        const isStun = effect.stun_block_action === true;
        
        // Add or refresh status effect
        const existingEffect = target.activeStatusEffects.find(e => e.effectId === effectId);
        if (existingEffect) {
          existingEffect.remainingDuration = effect.duration;
        } else {
          target.activeStatusEffects.push({
            effectId,
            remainingDuration: effect.duration,
            dotDamage,
            dotDamageType: effect.dot_damage_type || null,
            isStun,
          });
        }
        
        actions.push({
          type: "status_applied",
          targetGridId: target.gridId,
          statusEffectId: effectId,
          message: `Status effect applied for ${effect.duration} turns`,
        });
      }
    }
  }
  
  // Set cooldowns (add +1 because cooldowns are reduced at end of turn, so we need to account for that)
  if (ability.cooldown > 0) {
    attacker.abilityCooldowns[ability.abilityId] = ability.cooldown + 1;
  }
  // Always set at least 1-turn weapon cooldown to prevent using same weapon again this turn
  // Use the max of globalCooldown and 1 to ensure weapon is blocked
  const weaponCooldown = Math.max(ability.globalCooldown, 1);
  attacker.weaponGlobalCooldown[ability.weaponName] = weaponCooldown + 1;
  
  // Consume ammo (if not infinite)
  if (ability.weaponMaxAmmo !== -1 && ability.ammoRequired > 0) {
    const currentAmmo = attacker.weaponAmmo[ability.weaponName] ?? 0;
    attacker.weaponAmmo[ability.weaponName] = Math.max(0, currentAmmo - ability.ammoRequired);
    
    // If out of ammo, start reload
    if (attacker.weaponAmmo[ability.weaponName] === 0 && ability.weaponReloadTime > 0) {
      attacker.weaponReloadCooldown[ability.weaponName] = ability.weaponReloadTime;
    }
  }
  
  return actions;
}

// Process status effect ticks at start of turn
export function processStatusEffects(units: LiveBattleUnit[]): BattleAction[] {
  const actions: BattleAction[] = [];
  
  for (const unit of units) {
    if (unit.isDead) continue;
    
    for (const effect of unit.activeStatusEffects) {
      if (effect.dotDamage > 0) {
        // Apply DoT damage
        const targetUnit = getUnitById(unit.unitId);
        const targetStats = targetUnit?.statsConfig?.stats?.[unit.rank - 1];
        
        // DoT typically bypasses armor
        const hpDamage = effect.dotDamage;
        unit.currentHp = Math.max(0, unit.currentHp - hpDamage);
        
        actions.push({
          type: "status_tick",
          targetGridId: unit.gridId,
          statusEffectId: effect.effectId,
          hpDamage,
          message: `Took ${hpDamage} damage from status effect`,
        });
        
        if (unit.currentHp <= 0) {
          unit.isDead = true;
          actions.push({
            type: "death",
            targetGridId: unit.gridId,
            message: `Unit defeated by status effect!`,
          });
        }
      }
      
      // Decrement duration
      effect.remainingDuration--;
    }
    
    // Remove expired effects
    unit.activeStatusEffects = unit.activeStatusEffects.filter(e => e.remainingDuration > 0);
  }
  
  return actions;
}

// Reduce cooldowns at end of turn and handle weapon reloading
export function reduceCooldowns(units: LiveBattleUnit[]): void {
  for (const unit of units) {
    if (unit.isDead) continue;
    
    // Reduce ability cooldowns
    for (const abilityId of Object.keys(unit.abilityCooldowns)) {
      const id = parseInt(abilityId);
      if (unit.abilityCooldowns[id] > 0) {
        unit.abilityCooldowns[id]--;
      }
    }
    
    // Reduce weapon global cooldowns
    for (const weaponName of Object.keys(unit.weaponGlobalCooldown)) {
      if (unit.weaponGlobalCooldown[weaponName] > 0) {
        unit.weaponGlobalCooldown[weaponName]--;
      }
    }
    
    // Handle weapon reload cooldowns
    const unitData = getUnitById(unit.unitId);
    for (const weaponName of Object.keys(unit.weaponReloadCooldown)) {
      if (unit.weaponReloadCooldown[weaponName] > 0) {
        unit.weaponReloadCooldown[weaponName]--;
        
        // If reload complete, restore ammo
        if (unit.weaponReloadCooldown[weaponName] === 0) {
          const weapon = unitData?.weapons?.weapons?.[weaponName];
          if (weapon) {
            unit.weaponAmmo[weaponName] = weapon.stats.ammo;
          }
        }
      }
    }
  }
}

// Check if battle is over
// A side loses when all their "important" units are dead (units with unimportant: false or undefined)
export function checkBattleEnd(state: LiveBattleState): { isOver: boolean; playerWon: boolean | null } {
  // Check if any important friendly units are alive
  const friendlyImportantAlive = state.friendlyUnits.some(u => {
    if (u.isDead) return false;
    const unitData = getUnitById(u.unitId);
    return unitData?.statsConfig?.unimportant !== true;
  });
  
  // Check if any important enemy units are alive
  const enemyImportantAlive = state.enemyUnits.some(u => {
    if (u.isDead) return false;
    const unitData = getUnitById(u.unitId);
    return unitData?.statsConfig?.unimportant !== true;
  });
  
  if (!friendlyImportantAlive) {
    return { isOver: true, playerWon: false };
  }
  
  if (!enemyImportantAlive) {
    // Check if there are more waves
    if (state.currentWave < state.totalWaves - 1) {
      return { isOver: false, playerWon: null }; // Wave complete, not battle
    }
    return { isOver: true, playerWon: true };
  }
  
  return { isOver: false, playerWon: null };
}

// AI: Pick a random ability and target
export function aiSelectAction(
  unit: LiveBattleUnit,
  state: LiveBattleState
): { ability: AbilityInfo; targetGridId: number } | null {
  const unitData = getUnitById(unit.unitId);
  const unitName = unitData?.identity?.name || `Unit ${unit.unitId}`;
  
  const availableAbilities = getAvailableAbilities(
    unit,
    state.enemyUnits,
    state.friendlyUnits
  );
  
  console.log(`[AI] ${unitName} (grid ${unit.gridId}): ${availableAbilities.length} available abilities`);
  
  if (availableAbilities.length === 0) {
    console.log(`[AI] ${unitName}: No available abilities (all on cooldown, no ammo, or no valid targets)`);
    return null;
  }
  
  // Pick random ability
  const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  console.log(`[AI] ${unitName}: Selected ability ${ability.abilityId}`);
  
  // Get valid targets
  const validTargets = getValidTargets(unit, ability, state.enemyUnits, state.friendlyUnits);
  console.log(`[AI] ${unitName}: ${validTargets.length} valid targets for ability ${ability.abilityId}`);
  
  if (validTargets.length === 0) {
    console.log(`[AI] ${unitName}: No valid targets for selected ability`);
    return null;
  }
  
  // Pick random target
  const target = validTargets[Math.floor(Math.random() * validTargets.length)];
  console.log(`[AI] ${unitName}: Targeting grid ${target.gridId}`);
  
  return { ability, targetGridId: target.gridId };
}

// Execute a random attack (for abilities with random: true in targetArea)
// Each hit selects a weighted random tile from the entire grid
export function executeRandomAttack(
  attacker: LiveBattleUnit,
  ability: AbilityInfo,
  state: LiveBattleState,
  environmentalDamageMods?: Record<string, number>
): BattleAction[] {
  const actions: BattleAction[] = [];
  const allTargets = attacker.isEnemy ? state.friendlyUnits : state.enemyUnits;
  const targetArea = ability.targetArea;
  
  if (!targetArea?.random || !targetArea.data || targetArea.data.length === 0) {
    return actions;
  }
  
  const abilityData = getAbilityById(ability.abilityId);
  const abilityName = abilityData?.name || `Ability ${ability.abilityId}`;
  
  // All grid positions (0-13, excluding 10 which doesn't exist in 5x5x3 grid)
  const allGridPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13];
  
  // Total number of hits from targetArea data
  const totalHits = targetArea.data.length;
  
  // Calculate total weight for weighted random selection
  const totalWeight = targetArea.data.reduce((sum, pos) => sum + (pos.weight || 1), 0);
  
  // Track damage accumulated per grid position
  const damageByPosition: Map<number, { 
    armorDamage: number; 
    hpDamage: number; 
    hitCount: number;
    crits: number;
  }> = new Map();
  
  // Each hit is independently randomly targeted
  for (let hitIndex = 0; hitIndex < totalHits; hitIndex++) {
    // Get the damage percent and weight for this hit
    const hitData = targetArea.data[hitIndex];
    const damagePercent = hitData.damagePercent || 100;
    
    // Weighted random selection of grid position
    let randomValue = Math.random() * totalWeight;
    let selectedWeight = 0;
    let selectedPositionIndex = 0;
    
    for (let i = 0; i < targetArea.data.length; i++) {
      selectedWeight += targetArea.data[i].weight || 1;
      if (randomValue <= selectedWeight) {
        selectedPositionIndex = i;
        break;
      }
    }
    
    // Pick a random grid position from the target grid
    const targetGridId = allGridPositions[Math.floor(Math.random() * allGridPositions.length)];
    
    // Check if there's a unit at this position
    const target = allTargets.find(u => u.gridId === targetGridId && !u.isDead);
    
    if (!target) {
      // Miss - no unit at this tile (this is expected for random attacks)
      continue;
    }
    
    // Check if we can target this unit type
    if (!canTargetUnit(target.unitId, ability.targets)) {
      continue;
    }
    
    const targetUnit = getUnitById(target.unitId);
    const targetStats = targetUnit?.statsConfig?.stats?.[target.rank - 1];
    const defense = targetStats?.defense || 0;
    
    // Reduce dodge chance if target is stunned/frozen
    const isStunned = target.activeStatusEffects.some(e => e.isStun);
    const stunDodgePenalty = isStunned ? 20 : 0;
    const effectiveDodgeChance = Math.max(0, calculateDodgeChance(defense, ability.offense) - stunDodgePenalty);
    
    // Calculate crit chance with bonuses
    let critChance = ability.critPercent;
    const targetTags = targetUnit?.identity?.tags || [];
    for (const tag of targetTags) {
      if (ability.critBonuses[tag]) {
        critChance += ability.critBonuses[tag];
      }
    }
    
    // Roll dodge
    if (rollDodge(effectiveDodgeChance)) {
      actions.push({
        type: "dodge",
        attackerGridId: attacker.gridId,
        targetGridId: target.gridId,
        abilityId: ability.abilityId,
        abilityName,
        wasDodged: true,
        message: `Attack dodged!`,
      });
      continue;
    }
    
    // Get status effect damage modifiers from target
    const statusDamageMods = getStatusEffectDamageMods(target);
    const statusArmorDamageMods = getStatusEffectArmorDamageMods(target);
    
    // Check if armor is bypassed due to stun (Active armor units only)
    const armorDefStyle = targetStats?.armor_def_style;
    const bypassArmor = armorDefStyle === 2 && isStunned;
    
    // Roll base damage (1 hit per iteration)
    const baseDamage = rollDamage(ability.minDamage, ability.maxDamage);
    
    // Apply damage percent modifier
    const adjustedDamage = Math.floor(baseDamage * (damagePercent / 100));
    
    // Roll crit
    const isCrit = rollCrit(critChance);
    const critMultiplier = isCrit ? 2 : 1;
    const finalBaseDamage = Math.floor(adjustedDamage * critMultiplier);
    
    // Calculate damage with armor and status effect modifiers
    const result = calculateDamageWithArmor(
      finalBaseDamage,
      target.currentArmor,
      targetStats?.armor_damage_mods,
      targetStats?.damage_mods,
      ability.damageType,
      ability.armorPiercing,
      environmentalDamageMods,
      Object.keys(statusDamageMods).length > 0 ? statusDamageMods : undefined,
      Object.keys(statusArmorDamageMods).length > 0 ? statusArmorDamageMods : undefined,
      bypassArmor
    );
    
    // Apply damage immediately
    target.currentArmor = Math.max(0, target.currentArmor - result.armorDamage);
    target.currentHp = Math.max(0, target.currentHp - result.hpDamage);
    
    // Track damage for this position
    const existing = damageByPosition.get(targetGridId);
    if (existing) {
      existing.armorDamage += result.armorDamage;
      existing.hpDamage += result.hpDamage;
      existing.hitCount += 1;
      if (isCrit) existing.crits += 1;
    } else {
      damageByPosition.set(targetGridId, {
        armorDamage: result.armorDamage,
        hpDamage: result.hpDamage,
        hitCount: 1,
        crits: isCrit ? 1 : 0,
      });
    }
    
    if (isCrit) {
      actions.push({
        type: "crit",
        attackerGridId: attacker.gridId,
        targetGridId: target.gridId,
        abilityId: ability.abilityId,
        wasCrit: true,
        message: `Critical hit!`,
      });
    }
    
    // Check for death after each hit
    if (target.currentHp <= 0 && !target.isDead) {
      target.isDead = true;
      actions.push({
        type: "death",
        targetGridId: target.gridId,
        message: `Unit defeated!`,
      });
    }
  }
  
  // Generate attack actions for each position that was hit
  for (const [gridId, damage] of damageByPosition) {
    const hitInfo = damage.hitCount > 1 ? ` (${damage.hitCount} hits)` : '';
    actions.push({
      type: "attack",
      attackerGridId: attacker.gridId,
      targetGridId: gridId,
      abilityId: ability.abilityId,
      abilityName,
      damage: damage.armorDamage + damage.hpDamage,
      armorDamage: damage.armorDamage,
      hpDamage: damage.hpDamage,
      message: `Dealt ${damage.hpDamage} HP damage${damage.armorDamage > 0 ? ` and ${damage.armorDamage} armor damage` : ''}${hitInfo}`,
    });
  }
  
  // Apply status effects to any hit targets
  const immunities = new Map<number, number[]>();
  for (const target of allTargets) {
    const targetUnit = getUnitById(target.unitId);
    immunities.set(target.unitId, targetUnit?.statsConfig?.status_effect_immunities || []);
  }
  
  for (const [effectIdStr, chance] of Object.entries(ability.statusEffects)) {
    const effectId = parseInt(effectIdStr);
    const effect = getStatusEffect(effectId);
    if (!effect) continue;
    
    for (const [gridId, damage] of damageByPosition) {
      const target = allTargets.find(u => u.gridId === gridId && !u.isDead);
      if (!target) continue;
      
      const targetImmunities = immunities.get(target.unitId) || [];
      if (targetImmunities.includes(effect.family)) continue;
      
      // Apply status effect (chance per unit hit, not per individual hit)
      if (rollStatusEffect(chance)) {
        let dotDamage = 0;
        if (effect.dot_ability_damage_mult || effect.dot_bonus_damage) {
          const avgDamage = Math.floor((ability.minDamage + ability.maxDamage) / 2);
          dotDamage = Math.floor(avgDamage * (effect.dot_ability_damage_mult || 0) + (effect.dot_bonus_damage || 0));
        }
        
        const isStun = effect.stun_block_action === true;
        
        const existingEffect = target.activeStatusEffects.find(e => e.effectId === effectId);
        if (existingEffect) {
          existingEffect.remainingDuration = effect.duration;
        } else {
          target.activeStatusEffects.push({
            effectId,
            remainingDuration: effect.duration,
            dotDamage,
            dotDamageType: effect.dot_damage_type || null,
            isStun,
          });
        }
        
        actions.push({
          type: "status_applied",
          targetGridId: target.gridId,
          statusEffectId: effectId,
          message: `Status effect applied for ${effect.duration} turns`,
        });
      }
    }
  }
  
  // Set cooldowns (add +1 because cooldowns are reduced at end of turn, so we need to account for that)
  if (ability.cooldown > 0) {
    attacker.abilityCooldowns[ability.abilityId] = ability.cooldown + 1;
  }
  // Always set at least 1-turn weapon cooldown to prevent using same weapon again this turn
  const weaponCooldown = Math.max(ability.globalCooldown, 1);
  attacker.weaponGlobalCooldown[ability.weaponName] = weaponCooldown + 1;
  
  // Consume ammo
  if (ability.weaponMaxAmmo !== -1 && ability.ammoRequired > 0) {
    const currentAmmo = attacker.weaponAmmo[ability.weaponName] ?? 0;
    attacker.weaponAmmo[ability.weaponName] = Math.max(0, currentAmmo - ability.ammoRequired);
    
    if (attacker.weaponAmmo[ability.weaponName] === 0 && ability.weaponReloadTime > 0) {
      attacker.weaponReloadCooldown[ability.weaponName] = ability.weaponReloadTime;
    }
  }
  
  return actions;
}

// Check if ability uses random targeting
export function isRandomAttack(ability: AbilityInfo): boolean {
  return ability.targetArea?.random === true;
}
