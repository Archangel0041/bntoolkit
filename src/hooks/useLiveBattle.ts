import { useState, useCallback, useMemo } from "react";
import {
  initializeBattle,
  getAvailableAbilities,
  getValidTargets,
  executeAttack,
  processStatusEffects,
  reduceCooldowns,
  checkBattleEnd,
  aiSelectAction,
  createLiveBattleUnit,
} from "@/lib/liveBattleEngine";
import { getUnitAbilities } from "@/lib/battleCalculations";
import { getStatusEffect } from "@/lib/statusEffects";
import type { PartyUnit, AbilityInfo } from "@/types/battleSimulator";
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

  // Get environmental damage mods
  const environmentalDamageMods = useMemo(() => {
    if (!encounter?.environmental_status_effect) return undefined;
    const envEffect = getStatusEffect(encounter.environmental_status_effect);
    return envEffect?.stun_damage_mods;
  }, [encounter?.environmental_status_effect]);

  // Start or restart battle
  const startBattle = useCallback(() => {
    const state = initializeBattle(friendlyParty, waves, startingWave);
    setBattleState(state);
    setSelectedUnitGridId(null);
    setSelectedAbilityId(null);
    setIsProcessing(false);
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
    
    // Validate target
    if (!validTargets.some(t => t.gridId === targetGridId)) return;

    setIsProcessing(true);

    setBattleState(prev => {
      if (!prev) return prev;

      // Execute the attack
      const actions = executeAttack(
        selectedUnit,
        selectedAbility,
        targetGridId,
        prev,
        environmentalDamageMods
      );

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

  // Execute enemy turn (AI)
  const executeEnemyTurn = useCallback(() => {
    if (!battleState || battleState.isPlayerTurn || battleState.isBattleOver || isProcessing) return;

    setIsProcessing(true);

    setBattleState(prev => {
      if (!prev) return prev;

      const allActions: BattleAction[] = [];

      // Process status effects for all units at start of turn
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
        return {
          ...prev,
          battleLog: [...prev.battleLog, turn],
          isBattleOver: true,
          isPlayerVictory: endCheckAfterStatus.playerWon,
        };
      }

      // Each enemy unit takes an action
      for (const enemy of prev.enemyUnits) {
        if (enemy.isDead) continue;
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
          const attackActions = executeAttack(
            enemy,
            action.ability,
            action.targetGridId,
            prev,
            environmentalDamageMods
          );
          allActions.push(...attackActions);

          // Check if battle ended mid-turn
          const midTurnCheck = checkBattleEnd(prev);
          if (midTurnCheck.isOver) {
            const turn: BattleTurn = {
              turnNumber: prev.currentTurn,
              isPlayerTurn: false,
              actions: allActions,
            };
            return {
              ...prev,
              battleLog: [...prev.battleLog, turn],
              isBattleOver: true,
              isPlayerVictory: midTurnCheck.playerWon,
            };
          }
        }
      }

      // Reduce cooldowns for enemy units
      reduceCooldowns(prev.enemyUnits);

      const turn: BattleTurn = {
        turnNumber: prev.currentTurn,
        isPlayerTurn: false,
        actions: allActions,
      };

      const endCheck = checkBattleEnd(prev);

      return {
        ...prev,
        currentTurn: prev.currentTurn + 1,
        isPlayerTurn: true,
        battleLog: [...prev.battleLog, turn],
        isBattleOver: endCheck.isOver,
        isPlayerVictory: endCheck.playerWon,
      };
    });

    setIsProcessing(false);
  }, [battleState, isProcessing, environmentalDamageMods]);

  // Advance to next wave
  const advanceWave = useCallback(() => {
    if (!battleState || battleState.currentWave >= battleState.totalWaves - 1) return;

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

      return {
        ...prev,
        enemyUnits,
        currentWave: nextWave,
        isPlayerTurn: true,
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
  };
}
