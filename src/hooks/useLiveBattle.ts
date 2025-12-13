import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  initializeBattle,
  getAvailableAbilities,
  getValidTargets,
  executeAttack,
  executeRandomAttack,
  isRandomAttack,
  processStatusEffects,
  reduceCooldowns,
  checkBattleEnd,
  aiSelectAction,
  createLiveBattleUnit,
} from "@/lib/liveBattleEngine";
import { getUnitAbilities, calculateDodgeChance, calculateDamageWithArmor, canTargetUnit } from "@/lib/battleCalculations";
import { getBlockingUnits, checkLineOfFire, calculateRange, findFrontmostUnblockedPosition, getTargetingInfo } from "@/lib/battleTargeting";
import { getStatusEffect, getStatusEffectDisplayName, getStatusEffectColor } from "@/lib/statusEffects";
import { getUnitById } from "@/lib/units";
import { getFixedAttackPositions, getAffectedGridPositions } from "@/types/battleSimulator";
import type { PartyUnit, AbilityInfo, DamagePreview, DamageResult, StatusEffectPreview } from "@/types/battleSimulator";
import type { EncounterUnit, Encounter } from "@/types/encounters";
import type { LiveBattleState, LiveBattleUnit, BattleAction, BattleTurn } from "@/types/liveBattle";

interface UseLiveBattleOptions {
  encounter?: Encounter | null;
  waves: EncounterUnit[][];
  friendlyParty: PartyUnit[];
  startingWave?: number;
}

export function useLiveBattle({ encounter, waves, friendlyParty, startingWave = 0 }: UseLiveBattleOptions) {
  const [battleState, setBattleState] = useState<LiveBattleState | null>(null);
  const [selectedUnitGridId, setSelectedUnitGridId] = useState<number | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState<number>(0);

  // Get environmental damage mods
  const environmentalDamageMods = useMemo(() => {
    if (!encounter?.environmental_status_effect) return undefined;
    const envEffect = getStatusEffect(encounter.environmental_status_effect);
    return envEffect?.stun_damage_mods;
  }, [encounter?.environmental_status_effect]);

  // Start or restart battle
  const startBattle = useCallback(() => {
    console.log("Starting battle with party:", friendlyParty.map(u => ({ unitId: u.unitId, gridId: u.gridId, rank: u.rank })));
    const state = initializeBattle(friendlyParty, waves, startingWave);
    console.log("Battle initialized, friendly units:", state.friendlyUnits.map(u => ({ unitId: u.unitId, gridId: u.gridId })));
    setBattleState(state);
    setSelectedUnitGridId(null);
    setSelectedAbilityId(null);
    setIsProcessing(false);
    setCurrentEnemyIndex(0);
  }, [friendlyParty, waves, startingWave]);

  // Get currently selected unit
  const selectedUnit = useMemo(() => {
    if (!battleState || selectedUnitGridId === null) return null;
    const allUnits = [...battleState.friendlyUnits, ...battleState.enemyUnits];
    return allUnits.find(u => u.gridId === selectedUnitGridId && !u.isDead) || null;
  }, [battleState, selectedUnitGridId]);

  // Get available abilities for selected unit
  const availableAbilities = useMemo<AbilityInfo[]>(() => {
    if (!battleState || !selectedUnit) return [];
    return getAvailableAbilities(
      selectedUnit,
      battleState.enemyUnits,
      battleState.friendlyUnits
    );
  }, [battleState, selectedUnit]);

  // Get selected ability
  const selectedAbility = useMemo(() => {
    if (!selectedAbilityId) return null;
    return availableAbilities.find(a => a.abilityId === selectedAbilityId) || null;
  }, [selectedAbilityId, availableAbilities]);

  // State for reticle position (for AOE abilities)
  const [enemyReticleGridId, setEnemyReticleGridId] = useState<number>(7);

  // Update default reticle position when ability changes
  useEffect(() => {
    if (!selectedAbility || !selectedUnit || !battleState || selectedAbility.isSingleTarget || selectedAbility.isFixed) return;
    
    const targetUnits = selectedUnit.isEnemy 
      ? battleState.friendlyUnits 
      : battleState.enemyUnits;
    
    const blockingUnits = getBlockingUnits(
      targetUnits.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
      !selectedUnit.isEnemy
    );
    
    const frontmostPosition = findFrontmostUnblockedPosition(
      selectedUnit.gridId,
      selectedAbility.minRange,
      selectedAbility.maxRange,
      selectedAbility.lineOfFire,
      selectedUnit.isEnemy,
      blockingUnits
    );
    
    if (frontmostPosition !== null) {
      setEnemyReticleGridId(frontmostPosition);
    }
  }, [selectedAbility?.abilityId, selectedUnit?.gridId, selectedUnit?.isEnemy, battleState]);

  // Calculate fixed attack positions
  const fixedAttackPositions = useMemo(() => {
    if (!selectedUnit || !selectedAbility?.isFixed || !selectedAbility.targetArea) {
      return { enemyGrid: [] as { gridId: number; damagePercent: number }[], friendlyGrid: [] as { gridId: number; damagePercent: number }[] };
    }

    const positions = getFixedAttackPositions(
      selectedUnit.gridId,
      selectedAbility.targetArea,
      !selectedUnit.isEnemy
    );

    const enemyGrid = positions.filter(p => p.isOnEnemyGrid);
    const friendlyGrid = positions.filter(p => !p.isOnEnemyGrid);

    return { enemyGrid, friendlyGrid };
  }, [selectedUnit, selectedAbility]);

  // Calculate valid reticle positions
  const validReticlePositions = useMemo(() => {
    if (!selectedUnit || !selectedAbility || !battleState || selectedAbility.isSingleTarget || selectedAbility.isFixed) {
      return undefined;
    }
    
    const targetUnits = selectedUnit.isEnemy 
      ? battleState.friendlyUnits 
      : battleState.enemyUnits;
    
    const blockingUnits = getBlockingUnits(
      targetUnits.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
      !selectedUnit.isEnemy
    );
    
    const targetingInfo = getTargetingInfo(
      selectedUnit.gridId,
      selectedAbility.minRange,
      selectedAbility.maxRange,
      selectedAbility.lineOfFire,
      selectedUnit.isEnemy,
      blockingUnits
    );
    
    return new Set(
      targetingInfo
        .filter(t => t.inRange && !t.isBlocked)
        .map(t => t.gridId)
    );
  }, [selectedUnit, selectedAbility, battleState]);

  // Calculate damage previews for live battle (uses current HP/armor)
  const damagePreviews = useMemo<DamagePreview[]>(() => {
    if (!battleState || !selectedUnit || !selectedAbility || selectedUnit.isEnemy) return [];
    
    const totalShots = selectedAbility.shotsPerAttack * selectedAbility.attacksPerUse;
    const targets = battleState.enemyUnits;
    
    const blockingUnits = getBlockingUnits(
      targets.map(u => ({ unit_id: u.unitId, grid_id: u.gridId })),
      true
    );

    // Get affected positions based on ability type
    let affectedPositions: { gridId: number; damagePercent: number }[];
    
    if (selectedAbility.isFixed && fixedAttackPositions.enemyGrid.length > 0) {
      affectedPositions = fixedAttackPositions.enemyGrid;
    } else if (!selectedAbility.isSingleTarget && selectedAbility.targetArea) {
      affectedPositions = getAffectedGridPositions(enemyReticleGridId, selectedAbility.targetArea, true, selectedAbility.damageArea);
    } else {
      // Single target - calculate for all valid targets
      affectedPositions = targets.map(u => ({ gridId: u.gridId, damagePercent: 100 }));
    }

    return targets
      .filter(t => !t.isDead)
      .map(target => {
        const targetUnit = getUnitById(target.unitId);
        const targetStats = targetUnit?.statsConfig?.stats?.[target.rank - 1];
        const immunities = targetUnit?.statsConfig?.status_effect_immunities || [];
        
        const affectedPos = affectedPositions.find(p => p.gridId === target.gridId);
        const damagePercent = affectedPos?.damagePercent ?? 100;
        const isAffected = affectedPos !== undefined;
        
        const canTarget = canTargetUnit(target.unitId, selectedAbility.targets);
        const defense = targetStats?.defense || 0;
        const dodgeChance = calculateDodgeChance(defense, selectedAbility.offense);
        
        // Calculate crit chance with bonuses
        let critChance = selectedAbility.critPercent;
        const targetTags = targetUnit?.identity?.tags || [];
        for (const tag of targetTags) {
          if (selectedAbility.critBonuses[tag]) {
            critChance += selectedAbility.critBonuses[tag];
          }
        }
        
        // Check range
        const range = calculateRange(selectedUnit.gridId, target.gridId, false);
        const inRange = range >= selectedAbility.minRange && range <= selectedAbility.maxRange;
        
        // Check line of fire blocking
        const blockCheck = checkLineOfFire(
          selectedUnit.gridId,
          target.gridId,
          selectedAbility.lineOfFire,
          false,
          blockingUnits
        );
        
        // Calculate damage using current HP/armor values
        const adjustedMinDamage = Math.floor(selectedAbility.minDamage * (damagePercent / 100));
        const adjustedMaxDamage = Math.floor(selectedAbility.maxDamage * (damagePercent / 100));
        
        const minResult = calculateDamageWithArmor(
          adjustedMinDamage,
          target.currentArmor,
          targetStats?.armor_damage_mods,
          targetStats?.damage_mods,
          selectedAbility.damageType,
          selectedAbility.armorPiercing,
          environmentalDamageMods
        );
        
        const maxResult = calculateDamageWithArmor(
          adjustedMaxDamage,
          target.currentArmor,
          targetStats?.armor_damage_mods,
          targetStats?.damage_mods,
          selectedAbility.damageType,
          selectedAbility.armorPiercing,
          environmentalDamageMods
        );
        
        // Multiply by shots
        const multiplyResult = (result: DamageResult, shots: number): DamageResult => ({
          rawDamage: result.rawDamage * shots,
          armorDamage: result.armorDamage * shots,
          hpDamage: result.hpDamage * shots,
          armorRemaining: result.armorRemaining,
          effectiveMultiplier: result.effectiveMultiplier,
        });
        
        // Calculate status effect previews
        const avgDamage = Math.floor((selectedAbility.minDamage + selectedAbility.maxDamage) / 2);
        const statusEffects: StatusEffectPreview[] = [];
        for (const [effectIdStr, chance] of Object.entries(selectedAbility.statusEffects)) {
          const effectId = parseInt(effectIdStr);
          const effect = getStatusEffect(effectId);
          if (!effect) continue;
          
          const isImmune = immunities.includes(effect.family);
          const adjustedChance = Math.floor(chance * (damagePercent / 100));
          
          let dotDamage = 0;
          if (effect.dot_ability_damage_mult || effect.dot_bonus_damage) {
            dotDamage = Math.floor(avgDamage * (effect.dot_ability_damage_mult || 0) + (effect.dot_bonus_damage || 0));
          }
          
          statusEffects.push({
            effectId,
            name: getStatusEffectDisplayName(effectId),
            chance: adjustedChance,
            duration: effect.duration,
            damageType: effect.dot_damage_type || null,
            dotDamage,
            isImmune,
            isStun: effect.stun_block_action === true,
            color: getStatusEffectColor(effectId),
          });
        }
        
        // For single target abilities, only show preview if in range and not blocked
        const shouldShow = selectedAbility.isSingleTarget 
          ? (canTarget && inRange && !blockCheck.isBlocked)
          : isAffected;
        
        return {
          targetGridId: target.gridId,
          targetUnitId: target.unitId,
          minDamage: minResult,
          maxDamage: maxResult,
          totalShots,
          minTotalDamage: multiplyResult(minResult, totalShots),
          maxTotalDamage: multiplyResult(maxResult, totalShots),
          dodgeChance,
          critChance,
          canTarget: shouldShow ? canTarget : false,
          targetHasArmor: target.currentArmor > 0,
          targetArmorHp: target.currentArmor,
          targetHp: target.currentHp,
          targetDefense: defense,
          statusEffects,
          damagePercent,
          inRange,
          range,
          isBlocked: blockCheck.isBlocked,
          blockedByUnitId: blockCheck.blockedBy?.unitId,
          blockReason: blockCheck.reason,
        };
      });
  }, [battleState, selectedUnit, selectedAbility, fixedAttackPositions, enemyReticleGridId, environmentalDamageMods]);

  // Get valid targets for selected ability
  const validTargets = useMemo<LiveBattleUnit[]>(() => {
    if (!battleState || !selectedUnit || !selectedAbility) return [];
    return getValidTargets(
      selectedUnit,
      selectedAbility,
      battleState.enemyUnits,
      battleState.friendlyUnits
    );
  }, [battleState, selectedUnit, selectedAbility]);

  // Execute player action
  const executePlayerAction = useCallback((targetGridId: number) => {
    if (!battleState || !selectedUnit || !selectedAbility || isProcessing) return;
    
    // For random attacks, we don't need a specific target validation
    const isRandom = isRandomAttack(selectedAbility);
    
    // Validate target only for non-random attacks
    if (!isRandom && !validTargets.some(t => t.gridId === targetGridId)) return;

    setIsProcessing(true);

    setBattleState(prev => {
      if (!prev) return prev;

      // Execute the attack (random or normal)
      let actions: BattleAction[];
      if (isRandom) {
        actions = executeRandomAttack(
          selectedUnit,
          selectedAbility,
          prev,
          environmentalDamageMods
        );
      } else {
        actions = executeAttack(
          selectedUnit,
          selectedAbility,
          targetGridId,
          prev,
          environmentalDamageMods
        );
      }

      // Add turn to log
      const turn: BattleTurn = {
        turnNumber: prev.currentTurn,
        isPlayerTurn: true,
        actions,
      };

      // Check battle end
      const endCheck = checkBattleEnd(prev);

      // Reduce cooldowns for player units
      reduceCooldowns(prev.friendlyUnits);

      return {
        ...prev,
        battleLog: [...prev.battleLog, turn],
        isBattleOver: endCheck.isOver,
        isPlayerVictory: endCheck.playerWon,
        isPlayerTurn: !endCheck.isOver ? false : prev.isPlayerTurn,
      };
    });

    setSelectedUnitGridId(null);
    setSelectedAbilityId(null);
    setIsProcessing(false);
  }, [battleState, selectedUnit, selectedAbility, validTargets, isProcessing, environmentalDamageMods]);


  // Execute one enemy action at a time
  const executeEnemyTurn = useCallback(() => {
    if (!battleState || battleState.isPlayerTurn || battleState.isBattleOver || isProcessing) return;

    setIsProcessing(true);

    setBattleState(prev => {
      if (!prev) return prev;

      const allActions: BattleAction[] = [];

      // Process status effects only at the start of enemy phase (first enemy)
      if (currentEnemyIndex === 0) {
        const statusActions = processStatusEffects([...prev.friendlyUnits, ...prev.enemyUnits]);
        allActions.push(...statusActions);

        // Check for deaths from status effects
        const endCheckAfterStatus = checkBattleEnd(prev);
        if (endCheckAfterStatus.isOver) {
          const turn: BattleTurn = {
            turnNumber: prev.currentTurn,
            isPlayerTurn: false,
            actions: allActions,
          };
          setCurrentEnemyIndex(0);
          setIsProcessing(false);
          return {
            ...prev,
            battleLog: [...prev.battleLog, turn],
            isBattleOver: true,
            isPlayerVictory: endCheckAfterStatus.playerWon,
          };
        }
      }

      // Get alive enemies
      const aliveEnemies = prev.enemyUnits.filter(e => !e.isDead);
      
      if (aliveEnemies.length === 0) {
        // No enemies alive, end enemy turn
        const endCheck = checkBattleEnd(prev);
        const turn: BattleTurn = {
          turnNumber: prev.currentTurn,
          isPlayerTurn: false,
          actions: allActions,
        };
        setCurrentEnemyIndex(0);
        setIsProcessing(false);
        return {
          ...prev,
          currentTurn: prev.currentTurn + 1,
          isPlayerTurn: true,
          battleLog: [...prev.battleLog, turn],
          isBattleOver: endCheck.isOver,
          isPlayerVictory: endCheck.playerWon,
        };
      }

      // Find the next enemy that can act
      let enemyToAct: { enemy: LiveBattleUnit; action: ReturnType<typeof aiSelectAction> } | null = null;
      let newEnemyIndex = currentEnemyIndex;
      
      for (let i = currentEnemyIndex; i < aliveEnemies.length; i++) {
        const enemy = aliveEnemies[i];
        if (enemy.activeStatusEffects.some(e => e.isStun)) {
          allActions.push({
            type: "skip",
            targetGridId: enemy.gridId,
            message: "Stunned, cannot act",
          });
          continue;
        }
        
        const action = aiSelectAction(enemy, prev);
        if (action) {
          enemyToAct = { enemy, action };
          newEnemyIndex = i + 1;
          break;
        } else {
          // No valid action, this enemy passes
          allActions.push({
            type: "skip",
            targetGridId: enemy.gridId,
            message: "No valid targets, passing",
          });
        }
      }

      if (enemyToAct && enemyToAct.action) {
        const { enemy, action } = enemyToAct;
        
        // Check if this is a random attack
        let attackActions: BattleAction[];
        if (isRandomAttack(action.ability)) {
          attackActions = executeRandomAttack(
            enemy,
            action.ability,
            prev,
            environmentalDamageMods
          );
        } else {
          attackActions = executeAttack(
            enemy,
            action.ability,
            action.targetGridId,
            prev,
            environmentalDamageMods
          );
        }
        allActions.push(...attackActions);

        // Check if battle ended
        const midTurnCheck = checkBattleEnd(prev);
        if (midTurnCheck.isOver) {
          const turn: BattleTurn = {
            turnNumber: prev.currentTurn,
            isPlayerTurn: false,
            actions: allActions,
          };
          setCurrentEnemyIndex(0);
          setIsProcessing(false);
          return {
            ...prev,
            battleLog: [...prev.battleLog, turn],
            isBattleOver: true,
            isPlayerVictory: midTurnCheck.playerWon,
          };
        }

        // Check if more enemies need to act
        if (newEnemyIndex < aliveEnemies.length) {
          // More enemies to go - log this action and stay on enemy turn
          const turn: BattleTurn = {
            turnNumber: prev.currentTurn,
            isPlayerTurn: false,
            actions: allActions,
          };
          setCurrentEnemyIndex(newEnemyIndex);
          setIsProcessing(false);
          return {
            ...prev,
            battleLog: [...prev.battleLog, turn],
          };
        }
      }

      // All enemies have acted - reduce cooldowns and switch to player turn
      reduceCooldowns(prev.enemyUnits);

      const turn: BattleTurn = {
        turnNumber: prev.currentTurn,
        isPlayerTurn: false,
        actions: allActions,
      };

      const endCheck = checkBattleEnd(prev);
      setCurrentEnemyIndex(0);
      setIsProcessing(false);

      return {
        ...prev,
        currentTurn: prev.currentTurn + 1,
        isPlayerTurn: true,
        battleLog: [...prev.battleLog, turn],
        isBattleOver: endCheck.isOver,
        isPlayerVictory: endCheck.playerWon,
      };
    });
  }, [battleState, isProcessing, environmentalDamageMods, currentEnemyIndex]);

  // Check if all enemies are dead and auto-advance wave
  const checkWaveAdvance = useCallback(() => {
    if (!battleState) return false;
    
    const allEnemiesDead = battleState.enemyUnits.every(u => u.isDead);
    if (allEnemiesDead && battleState.currentWave < battleState.totalWaves - 1) {
      return true;
    }
    return false;
  }, [battleState]);

  // Advance to next wave (enemies go first on subsequent waves)
  const advanceWave = useCallback(() => {
    if (!battleState || battleState.currentWave >= battleState.totalWaves - 1) return;

    setCurrentEnemyIndex(0); // Reset enemy index for new wave

    setBattleState(prev => {
      if (!prev) return prev;

      const nextWave = prev.currentWave + 1;
      const nextWaveUnits = waves[nextWave] || [];
      const enemyUnits = nextWaveUnits
        .filter(u => u.grid_id !== undefined)
        .map(u => {
          const unit = createLiveBattleUnit(u.unit_id, u.grid_id!, 1, true);
          return unit;
        })
        .filter((u): u is LiveBattleUnit => u !== null);

      // On subsequent waves, enemies go first
      return {
        ...prev,
        enemyUnits,
        currentWave: nextWave,
        isPlayerTurn: false, // Enemy goes first on wave 2+
        battleLog: [...prev.battleLog, {
          turnNumber: prev.currentTurn,
          isPlayerTurn: true,
          actions: [{ type: "skip", message: `Wave ${nextWave + 1} begins! Enemies attack first.` }],
        }],
      };
    });
  }, [battleState, waves]);

  // Skip player turn
  const skipTurn = useCallback(() => {
    if (!battleState || !battleState.isPlayerTurn || battleState.isBattleOver || isProcessing) return;

    setBattleState(prev => {
      if (!prev) return prev;

      const turn: BattleTurn = {
        turnNumber: prev.currentTurn,
        isPlayerTurn: true,
        actions: [{ type: "skip", message: "Player skipped turn" }],
      };

      reduceCooldowns(prev.friendlyUnits);

      return {
        ...prev,
        battleLog: [...prev.battleLog, turn],
        isPlayerTurn: false,
      };
    });
  }, [battleState, isProcessing]);

  return {
    battleState,
    selectedUnit,
    selectedUnitGridId,
    setSelectedUnitGridId,
    selectedAbilityId,
    setSelectedAbilityId,
    availableAbilities,
    selectedAbility,
    validTargets,
    isProcessing,
    startBattle,
    executePlayerAction,
    executeEnemyTurn,
    advanceWave,
    skipTurn,
    checkWaveAdvance,
    // Targeting support
    damagePreviews,
    enemyReticleGridId,
    setEnemyReticleGridId,
    fixedAttackPositions,
    validReticlePositions,
  };
}
