import encountersData from "@/data/battle_encounters.json";
import type { Encounter, EncountersData, EncounterUnit } from "@/types/encounters";

const rawData = encountersData as unknown as EncountersData;

export function getEncounterById(id: number | string): Encounter | undefined {
  return rawData.armies[String(id)];
}

export function getAllEncounterIds(): string[] {
  return Object.keys(rawData.armies).sort((a, b) => parseInt(a) - parseInt(b));
}

export function getEncounterWaves(encounter: Encounter): EncounterUnit[][] {
  const waves: EncounterUnit[][] = [];
  
  // Wave 1 is always the main units array (if exists)
  if (encounter.units && encounter.units.length > 0) {
    // Filter to only include units that have grid_id defined
    const unitsWithGrid = encounter.units.filter(u => u.grid_id !== undefined);
    if (unitsWithGrid.length > 0) {
      waves.push(unitsWithGrid);
    }
  }
  
  // Additional waves from the waves array
  if (encounter.waves && encounter.waves.length > 0) {
    encounter.waves.forEach((wave) => {
      if (wave.units && wave.units.length > 0) {
        const unitsWithGrid = wave.units.filter(u => u.grid_id !== undefined);
        if (unitsWithGrid.length > 0) {
          waves.push(unitsWithGrid);
        }
      }
    });
  }
  
  return waves;
}

export function getUnitAtGridPosition(units: EncounterUnit[], gridId: number): EncounterUnit | undefined {
  return units.find(u => u.grid_id === gridId);
}
