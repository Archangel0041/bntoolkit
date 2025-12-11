import { useState, useCallback } from "react";
import type { PartyUnit } from "@/types/battleSimulator";
import { getUnitById } from "@/lib/units";
import { getNextAvailablePosition } from "@/lib/battleCalculations";

export function useTempFormation() {
  const [units, setUnits] = useState<PartyUnit[]>([]);

  const addUnit = useCallback((unitId: number, preferredGridId?: number) => {
    const unit = getUnitById(unitId);
    if (!unit) return;

    const occupiedPositions = units.map(u => u.gridId);
    
    let gridId: number | null = null;
    
    // If preferred position provided and available, use it
    if (preferredGridId !== undefined && !occupiedPositions.includes(preferredGridId)) {
      gridId = preferredGridId;
    } else {
      // Otherwise use preferred row logic
      const preferredRow = unit.statsConfig?.preferred_row || 1;
      gridId = getNextAvailablePosition(preferredRow, occupiedPositions);
    }

    if (gridId === null) return; // Grid full

    const maxRank = unit.statsConfig?.stats?.length || 1;

    setUnits(prev => [...prev, {
      unitId,
      gridId,
      rank: maxRank,
    }]);
  }, [units]);

  const removeUnit = useCallback((gridId: number) => {
    setUnits(prev => prev.filter(u => u.gridId !== gridId));
  }, []);

  const setUnitRank = useCallback((gridId: number, rank: number) => {
    setUnits(prev => prev.map(u => 
      u.gridId === gridId ? { ...u, rank } : u
    ));
  }, []);

  const moveUnit = useCallback((fromGridId: number, toGridId: number) => {
    setUnits(prev => {
      const fromUnit = prev.find(u => u.gridId === fromGridId);
      const toUnit = prev.find(u => u.gridId === toGridId);
      
      if (!fromUnit) return prev;
      
      return prev.map(u => {
        if (u.gridId === fromGridId) {
          return { ...u, gridId: toGridId };
        }
        if (toUnit && u.gridId === toGridId) {
          return { ...u, gridId: fromGridId };
        }
        return u;
      });
    });
  }, []);

  const loadFromParty = useCallback((partyUnits: PartyUnit[]) => {
    setUnits([...partyUnits]);
  }, []);

  const clearFormation = useCallback(() => {
    setUnits([]);
  }, []);

  return {
    units,
    addUnit,
    removeUnit,
    setUnitRank,
    moveUnit,
    loadFromParty,
    clearFormation,
  };
}
