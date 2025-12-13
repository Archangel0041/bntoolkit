import { getUnitById } from "@/lib/units";
import { getAbilityById } from "@/lib/abilities";
import { getUnitAbilities, calculateDodgeChance, calculateDamageWithArmor, canTargetUnit } from "@/lib/battleCalculations";
import { getBlockingUnits, checkLineOfFire, calculateRange } from "@/lib/battleTargeting";
import { getStatusEffect } from "@/lib/statusEffects";
import { unitMatchesTargets } from "@/lib/tagHierarchy";
import { getAffectedGridPositions, getFixedAttackPositions } from "@/types/battleSimulator";
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
    globalCooldown: 0,
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
  if (unit.globalCooldown > 0) return [];

  const abilities = getUnitAbilities(unit.unitId, unit.rank);
  
  return abilities.filter(ability => {
    // Check cooldown
    if (unit.abilityCooldowns[ability.abilityId] > 0) return false;
    
    // Check ammo
    if (!hasEnoughAmmo(unit, ability)) return false;

    // Check if there's at least one valid target
    const targets = unit.isEnemy ? allFriendlies : allEnemies;
    const blockingUnits = getBlockingUnits(
      targets.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
      !unit.isEnemy
    );

    // For single target abilities, check if any target is valid
    for (const target of targets) {
      if (target.isDead) continue;
      
      // Check tag targeting
      if (!canTargetUnit(target.unitId, ability.targets)) continue;
      
      // Check range
      const range = calculateRange(unit.gridId, target.gridId, unit.isEnemy);
      if (range < ability.minRange || range > ability.maxRange) continue;
      
      // Check line of fire
      const blockCheck = checkLineOfFire(
        unit.gridId,
        target.gridId,
        ability.lineOfFire,
        unit.isEnemy,
        blockingUnits
      );
      if (blockCheck.isBlocked) continue;
      
      return true; // At least one valid target
    }
    
    return false;
  });
}

// Get valid targets for an ability
export function getValidTargets(
  attacker: LiveBattleUnit,
  ability: AbilityInfo,
  allEnemies: LiveBattleUnit[],
  allFriendlies: LiveBattleUnit[]
): LiveBattleUnit[] {
  const targets = attacker.isEnemy ? allFriendlies : allEnemies;
  const blockingUnits = getBlockingUnits(
    targets.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
    !attacker.isEnemy
  );

  return targets.filter(target => {
    if (target.isDead) return false;
    
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
    
    return !blockCheck.isBlocked;
  });
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
    const dodgeChance = calculateDodgeChance(defense, ability.offense);
    
    // Calculate crit chance with bonuses
    let critChance = ability.critPercent;
    const targetTags = targetUnit?.identity?.tags || [];
    for (const tag of targetTags) {
      if (ability.critBonuses[tag]) {
        critChance += ability.critBonuses[tag];
      }
    }
    
    // Roll dodge
    if (rollDodge(dodgeChance)) {
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
      
      // Calculate damage with armor
      const result = calculateDamageWithArmor(
        finalBaseDamage,
        target.currentArmor,
        targetStats?.armor_damage_mods,
        targetStats?.damage_mods,
        ability.damageType,
        ability.armorPiercing,
        environmentalDamageMods
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
  
  // Set cooldowns
  if (ability.cooldown > 0) {
    attacker.abilityCooldowns[ability.abilityId] = ability.cooldown;
  }
  if (ability.globalCooldown > 0) {
    attacker.globalCooldown = ability.globalCooldown;
  }
  
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
    
    // Reduce global cooldown
    if (unit.globalCooldown > 0) {
      unit.globalCooldown--;
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
export function checkBattleEnd(state: LiveBattleState): { isOver: boolean; playerWon: boolean | null } {
  const friendlyAlive = state.friendlyUnits.some(u => !u.isDead);
  const enemyAlive = state.enemyUnits.some(u => !u.isDead);
  
  if (!friendlyAlive) {
    return { isOver: true, playerWon: false };
  }
  
  if (!enemyAlive) {
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
  const availableAbilities = getAvailableAbilities(
    unit,
    state.enemyUnits,
    state.friendlyUnits
  );
  
  if (availableAbilities.length === 0) return null;
  
  // Pick random ability
  const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  
  // Get valid targets
  const validTargets = getValidTargets(unit, ability, state.enemyUnits, state.friendlyUnits);
  
  if (validTargets.length === 0) return null;
  
  // Pick random target
  const target = validTargets[Math.floor(Math.random() * validTargets.length)];
  
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
    const dodgeChance = calculateDodgeChance(defense, ability.offense);
    
    // Calculate crit chance with bonuses
    let critChance = ability.critPercent;
    const targetTags = targetUnit?.identity?.tags || [];
    for (const tag of targetTags) {
      if (ability.critBonuses[tag]) {
        critChance += ability.critBonuses[tag];
      }
    }
    
    // Roll dodge
    if (rollDodge(dodgeChance)) {
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
    
    // Roll base damage (1 hit per iteration)
    const baseDamage = rollDamage(ability.minDamage, ability.maxDamage);
    
    // Apply damage percent modifier
    const adjustedDamage = Math.floor(baseDamage * (damagePercent / 100));
    
    // Roll crit
    const isCrit = rollCrit(critChance);
    const critMultiplier = isCrit ? 2 : 1;
    const finalBaseDamage = Math.floor(adjustedDamage * critMultiplier);
    
    // Calculate damage with armor
    const result = calculateDamageWithArmor(
      finalBaseDamage,
      target.currentArmor,
      targetStats?.armor_damage_mods,
      targetStats?.damage_mods,
      ability.damageType,
      ability.armorPiercing,
      environmentalDamageMods
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
  
  // Set cooldowns
  if (ability.cooldown > 0) {
    attacker.abilityCooldowns[ability.abilityId] = ability.cooldown;
  }
  if (ability.globalCooldown > 0) {
    attacker.globalCooldown = ability.globalCooldown;
  }
  
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
