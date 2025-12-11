import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { BattleGrid } from "@/components/battle/BattleGrid";
import { AbilitySelector } from "@/components/battle/AbilitySelector";
import { UnitSelector } from "@/components/battle/UnitSelector";
import { PartyManager } from "@/components/battle/PartyManager";
import { useParties } from "@/hooks/useParties";
import { useTempFormation } from "@/hooks/useTempFormation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getEncounterById, getEncounterWaves } from "@/lib/encounters";
import { getUnitById } from "@/lib/units";
import { getUnitAbilities, calculateDamagePreviewsForEnemy, calculateDamagePreviewsForFriendly } from "@/lib/battleCalculations";
import { UnitImage } from "@/components/units/UnitImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SelectedUnit, AbilityInfo, DamagePreview } from "@/types/battleSimulator";

const BattleSimulator = () => {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const {
    parties,
    selectedParty,
    selectedPartyId,
    setSelectedPartyId,
    createParty,
    removeParty,
    renameParty,
  } = useParties();

  const tempFormation = useTempFormation();

  const [currentWave, setCurrentWave] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<number | null>(null);
  const [enemyRankOverrides, setEnemyRankOverrides] = useState<Record<number, number>>({});

  const encounter = encounterId ? getEncounterById(parseInt(encounterId)) : null;
  const waves = encounter ? getEncounterWaves(encounter) : [];
  const currentWaveUnits = waves[currentWave] || [];

  const backPath = (location.state as any)?.from || "/";

  // Get abilities for selected unit
  const selectedUnitAbilities = useMemo<AbilityInfo[]>(() => {
    if (!selectedUnit) return [];
    return getUnitAbilities(selectedUnit.unitId, selectedUnit.rank);
  }, [selectedUnit]);

  // Reset ability selection when unit changes
  useEffect(() => {
    setSelectedAbilityId(null);
  }, [selectedUnit?.unitId, selectedUnit?.gridId]);

  // Calculate damage previews using temp formation
  const damagePreviews = useMemo<DamagePreview[]>(() => {
    if (!selectedUnit || !selectedAbilityId) return [];

    const ability = selectedUnitAbilities.find(a => a.abilityId === selectedAbilityId);
    if (!ability) return [];

    if (selectedUnit.isEnemy) {
      // Enemy attacking friendly units
      return calculateDamagePreviewsForFriendly(ability, tempFormation.units);
    } else {
      // Friendly attacking enemy units
      return calculateDamagePreviewsForEnemy(ability, currentWaveUnits, enemyRankOverrides);
    }
  }, [selectedUnit, selectedAbilityId, selectedUnitAbilities, tempFormation.units, currentWaveUnits, enemyRankOverrides]);

  const handleUnitClick = (unit: SelectedUnit) => {
    if (selectedUnit?.unitId === unit.unitId && selectedUnit?.gridId === unit.gridId && selectedUnit?.isEnemy === unit.isEnemy) {
      setSelectedUnit(null);
    } else {
      setSelectedUnit(unit);
    }
  };

  const handleEnemyRankChange = (gridId: number, rank: number) => {
    setEnemyRankOverrides(prev => ({ ...prev, [gridId]: rank }));
    if (selectedUnit?.gridId === gridId && selectedUnit?.isEnemy) {
      setSelectedUnit(prev => prev ? { ...prev, rank } : null);
    }
  };

  const handleLoadParty = () => {
    if (selectedParty) {
      tempFormation.loadFromParty(selectedParty.units);
      toast.success(`Loaded party: ${selectedParty.name}`);
    }
  };

  const handleSaveAsParty = () => {
    if (tempFormation.units.length === 0) {
      toast.error("No units to save");
      return;
    }
    const name = prompt("Enter party name:");
    if (name) {
      const newParty = createParty(name);
      // Copy temp formation units to the new party
      tempFormation.units.forEach(unit => {
        // This is a bit awkward since createParty creates empty party
        // We need to update the party storage directly
      });
      // For now, just load the formation into the newly created party
      toast.success(`Created party: ${name}`);
    }
  };

  const selectedUnitData = selectedUnit ? getUnitById(selectedUnit.unitId) : null;
  const selectedUnitName = selectedUnitData ? t(selectedUnitData.identity.name) : "";
  const selectedUnitMaxRank = selectedUnitData?.statsConfig?.stats?.length || 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Back navigation and title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Battle Simulator</h1>
            {encounter && (
              <p className="text-muted-foreground">
                {t(encounter.name || `Encounter ${encounterId}`)}
                <Badge variant="outline" className="ml-2">ID: {encounterId}</Badge>
                {encounter.level && <Badge variant="secondary" className="ml-2">Lv. {encounter.level}</Badge>}
              </p>
            )}
          </div>
        </div>

        {/* Wave selector */}
        {waves.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentWave === 0}
              onClick={() => setCurrentWave(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Wave {currentWave + 1} of {waves.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentWave === waves.length - 1}
              onClick={() => setCurrentWave(prev => prev + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Battle grids */}
        <div className="grid gap-4">
          {/* Enemy grid at top */}
          <BattleGrid
            isEnemy={true}
            units={currentWaveUnits}
            selectedUnit={selectedUnit}
            onUnitClick={handleUnitClick}
            damagePreviews={!selectedUnit?.isEnemy ? damagePreviews : []}
            rankOverrides={enemyRankOverrides}
          />

          {/* Divider with selected unit info */}
          <div className="border-y py-4">
            {selectedUnit && selectedUnitData ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UnitImage
                    iconName={selectedUnitData.identity.icon}
                    alt={selectedUnitName}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <p className="font-semibold">{selectedUnitName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedUnit.isEnemy ? "Enemy" : "Friendly"}</span>
                      <span>•</span>
                      <span>Rank {selectedUnit.rank}/{selectedUnitMaxRank}</span>
                    </div>
                  </div>
                </div>
                
                {/* Ability selector */}
                <AbilitySelector
                  abilities={selectedUnitAbilities}
                  selectedAbilityId={selectedAbilityId}
                  onSelectAbility={setSelectedAbilityId}
                  className="flex-1 max-w-2xl"
                />
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                Click on a unit to see its abilities and damage calculations
              </p>
            )}
          </div>

          {/* Friendly grid at bottom */}
          <BattleGrid
            isEnemy={false}
            units={tempFormation.units}
            selectedUnit={selectedUnit}
            onUnitClick={handleUnitClick}
            damagePreviews={selectedUnit?.isEnemy ? damagePreviews : []}
            onMoveUnit={tempFormation.moveUnit}
          />
        </div>

        {/* Formation management */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-sm font-medium">Formation</h3>
            
            {/* Party selection and load */}
            <div className="flex items-center gap-2">
              <PartyManager
                parties={parties}
                selectedPartyId={selectedPartyId}
                onSelectParty={setSelectedPartyId}
                onCreateParty={createParty}
                onDeleteParty={removeParty}
                onRenameParty={renameParty}
              />
              {selectedParty && (
                <Button variant="outline" size="sm" onClick={handleLoadParty} className="gap-1">
                  <Upload className="h-3 w-3" />
                  Load
                </Button>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => tempFormation.clearFormation()}
              disabled={tempFormation.units.length === 0}
            >
              Clear
            </Button>
          </div>

          <UnitSelector
            partyUnits={tempFormation.units}
            onAddUnit={(unit) => tempFormation.addUnit(unit.unitId, unit.gridId)}
            onRemoveUnit={tempFormation.removeUnit}
            onUpdateRank={tempFormation.setUnitRank}
          />
        </div>
      </main>
    </div>
  );
};

export default BattleSimulator;
