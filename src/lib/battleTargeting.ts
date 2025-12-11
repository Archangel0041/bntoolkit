// Battle targeting and blocking calculations
import { getUnitById } from "@/lib/units";
import { UnitBlocking } from "@/data/gameEnums";
import { LineOfFire } from "@/types/battleSimulator";
import type { EncounterUnit } from "@/types/encounters";
import type { PartyUnit } from "@/types/battleSimulator";
import { GRID_ID_TO_COORDS, COORDS_TO_GRID_ID } from "@/types/battleSimulator";

export interface BlockingUnit {
  gridId: number;
  unitId: number;
  blocking: number; // UnitBlocking value
  x: number;
  y: number;
}

// Get blocking level of a unit (from statsConfig.blocking)
export function getUnitBlocking(unitId: number): number {
  const unit = getUnitById(unitId);
  return unit?.statsConfig?.blocking ?? UnitBlocking.None;
}

// Get all units with their blocking levels on a grid
export function getBlockingUnits(
  units: EncounterUnit[] | PartyUnit[],
  isEnemy: boolean
): BlockingUnit[] {
  return units
    .filter(u => {
      const gridId = isEnemy ? (u as EncounterUnit).grid_id : (u as PartyUnit).gridId;
      return gridId !== undefined;
    })
    .map(u => {
      const gridId = isEnemy ? (u as EncounterUnit).grid_id! : (u as PartyUnit).gridId;
      const unitId = isEnemy ? (u as EncounterUnit).unit_id : (u as PartyUnit).unitId;
      const coords = GRID_ID_TO_COORDS[gridId];
      return {
        gridId,
        unitId,
        blocking: getUnitBlocking(unitId),
        x: coords?.x ?? 0,
        y: coords?.y ?? 0,
      };
    });
}

// Check if a target is blocked by units in front of it based on line of fire
// Returns: { isBlocked: boolean, blockedBy?: BlockingUnit }
export function checkLineOfFire(
  attackerGridId: number,
  targetGridId: number,
  lineOfFire: number,
  attackerIsEnemy: boolean,
  targetUnits: BlockingUnit[]
): { isBlocked: boolean; blockedBy?: BlockingUnit; reason?: string } {
  // Indirect fire ignores all blocking
  if (lineOfFire === LineOfFire.Indirect) {
    return { isBlocked: false };
  }

  const attackerCoords = GRID_ID_TO_COORDS[attackerGridId];
  const targetCoords = GRID_ID_TO_COORDS[targetGridId];
  
  if (!attackerCoords || !targetCoords) {
    return { isBlocked: false };
  }

  // Get units between attacker and target that could block
  // For attacks from friendly -> enemy, "between" means units at lower y (closer to front)
  // For attacks from enemy -> friendly, same logic but reversed perspective
  
  const unitsInPath = targetUnits.filter(u => {
    const unitCoords = GRID_ID_TO_COORDS[u.gridId];
    if (!unitCoords) return false;
    
    // Don't block yourself
    if (u.gridId === targetGridId) return false;
    
    // Unit must be in same column
    if (unitCoords.x !== targetCoords.x) return false;
    
    // Unit must be between attacker and target (closer to front/attacker)
    // For enemy grid targets: lower y = closer to attacker (front row)
    return unitCoords.y < targetCoords.y;
  });

  // Sort by y (front to back - lowest y first)
  unitsInPath.sort((a, b) => {
    const aCoords = GRID_ID_TO_COORDS[a.gridId];
    const bCoords = GRID_ID_TO_COORDS[b.gridId];
    return (aCoords?.y ?? 0) - (bCoords?.y ?? 0);
  });

  // Check each unit in path based on line of fire rules
  for (const blockingUnit of unitsInPath) {
    const blocking = blockingUnit.blocking;
    
    switch (lineOfFire) {
      case LineOfFire.Contact:
        // Contact: blocked by ANY unit (None, Partial, Full, God)
        // Actually, Contact means you can only hit the FIRST unit in range (frontmost)
        // Any unit with blocking >= None blocks
        if (blocking >= UnitBlocking.None) {
          return { 
            isBlocked: true, 
            blockedBy: blockingUnit,
            reason: "Contact fire blocked"
          };
        }
        break;
        
      case LineOfFire.Direct:
        // Direct: Can fire PAST None blocking units
        // Blocked by Partial, Full, God
        if (blocking >= UnitBlocking.Partial) {
          return { 
            isBlocked: true, 
            blockedBy: blockingUnit,
            reason: "Direct fire blocked by partial/full blocker"
          };
        }
        break;
        
      case LineOfFire.Precise:
        // Precise: Can fire past Partial blocking
        // Blocked by Full, God
        if (blocking >= UnitBlocking.Full) {
          return { 
            isBlocked: true, 
            blockedBy: blockingUnit,
            reason: "Precise fire blocked by full blocker"
          };
        }
        break;
        
      // Indirect handled above - never blocked
    }
  }

  return { isBlocked: false };
}

// Calculate row distance from attacker to target for range checking
// Returns the number of "rows" between them
export function calculateRange(
  attackerGridId: number,
  targetGridId: number,
  attackerIsEnemy: boolean
): number {
  const attackerCoords = GRID_ID_TO_COORDS[attackerGridId];
  const targetCoords = GRID_ID_TO_COORDS[targetGridId];
  
  if (!attackerCoords || !targetCoords) return 999;
  
  // Both grids use y=0 as front, y=2 as back
  // Distance from attacker to target across the gap:
  // Attacker y + Target y + 1 (for the gap between grids)
  return attackerCoords.y + targetCoords.y + 1;
}

// Check if a target is within ability range
export function isTargetInRange(
  attackerGridId: number,
  targetGridId: number,
  minRange: number,
  maxRange: number,
  attackerIsEnemy: boolean
): boolean {
  const range = calculateRange(attackerGridId, targetGridId, attackerIsEnemy);
  return range >= minRange && range <= maxRange;
}

// Get all targetable grid positions with their range and blocking status
export interface TargetingInfo {
  gridId: number;
  inRange: boolean;
  range: number;
  isBlocked: boolean;
  blockedBy?: BlockingUnit;
  blockReason?: string;
}

export function getTargetingInfo(
  attackerGridId: number,
  minRange: number,
  maxRange: number,
  lineOfFire: number,
  attackerIsEnemy: boolean,
  targetUnits: BlockingUnit[]
): TargetingInfo[] {
  const result: TargetingInfo[] = [];
  
  // Check all grid positions
  const allGridIds = Object.keys(GRID_ID_TO_COORDS).map(k => parseInt(k));
  
  for (const gridId of allGridIds) {
    const range = calculateRange(attackerGridId, gridId, attackerIsEnemy);
    const inRange = range >= minRange && range <= maxRange;
    
    const blockCheck = checkLineOfFire(
      attackerGridId,
      gridId,
      lineOfFire,
      attackerIsEnemy,
      targetUnits
    );
    
    result.push({
      gridId,
      inRange,
      range,
      isBlocked: blockCheck.isBlocked,
      blockedBy: blockCheck.blockedBy,
      blockReason: blockCheck.reason,
    });
  }
  
  return result;
}
