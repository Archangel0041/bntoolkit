import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Play, SkipForward, RotateCcw, Swords, Trophy, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { LiveBattleGrid } from "@/components/battle/LiveBattleGrid";
import { LiveAbilitySelector } from "@/components/battle/LiveAbilitySelector";
import { BattleLog } from "@/components/battle/BattleLog";
import { UnitSelector } from "@/components/battle/UnitSelector";
import { PartyManager } from "@/components/battle/PartyManager";
import { useParties } from "@/hooks/useParties";
import { useTempFormation } from "@/hooks/useTempFormation";
import { useLiveBattle } from "@/hooks/useLiveBattle";
import { useLanguage } from "@/contexts/LanguageContext";
import { getEncounterById, getEncounterWaves } from "@/lib/encounters";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LiveBattleSimulator = () => {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const encounter = encounterId ? getEncounterById(parseInt(encounterId)) : null;
  const waves = encounter ? getEncounterWaves(encounter) : [];

  const {
    parties,
    selectedParty,
    selectedPartyId,
    setSelectedPartyId,
    createParty,
    updateParty,
    removeParty,
    renameParty,
  } = useParties();

  const tempFormation = useTempFormation({ encounter });

  const {
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
  } = useLiveBattle({
    encounter,
    waves,
    friendlyParty: tempFormation.units,
  });

  const backPath = (location.state as any)?.from || `/battle/${encounterId}`;

  // Auto-execute enemy turn when it's their turn
  useEffect(() => {
    if (battleState && !battleState.isPlayerTurn && !battleState.isBattleOver && !isProcessing) {
      const timer = setTimeout(() => {
        executeEnemyTurn();
      }, 1000); // 1 second delay for visual feedback
      return () => clearTimeout(timer);
    }
  }, [battleState?.isPlayerTurn, battleState?.isBattleOver, isProcessing, executeEnemyTurn]);

  const handleLoadParty = () => {
    if (selectedParty) {
      tempFormation.loadFromParty(selectedParty.units);
      toast.success(`Loaded party: ${selectedParty.name}`);
    }
  };

  const handleStartBattle = () => {
    if (tempFormation.units.length === 0) {
      toast.error("Add units to your party first");
      return;
    }
    startBattle();
    toast.success("Battle started!");
  };

  const handleTargetClick = (unit: { gridId: number }) => {
    if (!battleState?.isPlayerTurn || !selectedAbility) return;
    
    // Check if this is a valid target
    if (validTargets.some(t => t.gridId === unit.gridId)) {
      executePlayerAction(unit.gridId);
    }
  };

  const selectedUnitData = selectedUnit ? getUnitById(selectedUnit.unitId) : null;
  const selectedUnitName = selectedUnitData ? t(selectedUnitData.identity.name) : "";

  // Highlight valid targets
  const highlightedGridIds = new Set(validTargets.map(t => t.gridId));

  // Get last action for visual feedback
  const lastTurn = battleState?.battleLog[battleState.battleLog.length - 1];
  const lastActionGridIds = lastTurn ? {
    attacker: lastTurn.actions.find(a => a.attackerGridId)?.attackerGridId,
    targets: lastTurn.actions.filter(a => a.targetGridId).map(a => a.targetGridId!),
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Swords className="h-6 w-6" />
                Live Battle
              </h1>
              {encounter && (
                <p className="text-muted-foreground">
                  {t(encounter.name || `Encounter ${encounterId}`)}
                  <Badge variant="outline" className="ml-2">ID: {encounterId}</Badge>
                </p>
              )}
            </div>
          </div>

          {/* Battle status */}
          {battleState && (
            <div className="flex items-center gap-4">
              <Badge variant={battleState.isPlayerTurn ? "default" : "secondary"} className="text-sm">
                Turn {battleState.currentTurn}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  battleState.isPlayerTurn ? "border-green-500 text-green-500" : "border-red-500 text-red-500"
                )}
              >
                {battleState.isPlayerTurn ? "Your Turn" : "Enemy Turn"}
              </Badge>
              {battleState.totalWaves > 1 && (
                <Badge variant="secondary">
                  Wave {battleState.currentWave + 1}/{battleState.totalWaves}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Pre-battle setup */}
        {!battleState && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Party setup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Setup Your Party</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PartyManager
                  parties={parties}
                  selectedPartyId={selectedPartyId}
                  onSelectParty={setSelectedPartyId}
                  onCreateParty={(name) => createParty(name)}
                  onDeleteParty={removeParty}
                  onRenameParty={renameParty}
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadParty}
                    disabled={!selectedParty}
                  >
                    Load Selected Party
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={tempFormation.clearFormation}
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
                  encounter={encounter}
                />
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Battle Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Enemy Units (Wave 1)
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {waves[0]?.slice(0, 15).map((unit, i) => {
                    const unitData = getUnitById(unit.unit_id);
                    return unitData ? (
                      <UnitImage
                        key={i}
                        iconName={unitData.identity.icon}
                        alt={t(unitData.identity.name)}
                        className="w-full aspect-square rounded"
                      />
                    ) : null;
                  })}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleStartBattle}
                  disabled={tempFormation.units.length === 0}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Battle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Battle in progress */}
        {battleState && (
          <>
            {/* Battle end overlay */}
            {battleState.isBattleOver && (
              <Card className={cn(
                "border-2",
                battleState.isPlayerVictory ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
              )}>
                <CardContent className="py-8 text-center">
                  <div className="flex justify-center mb-4">
                    {battleState.isPlayerVictory ? (
                      <Trophy className="h-16 w-16 text-green-500" />
                    ) : (
                      <Skull className="h-16 w-16 text-red-500" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    {battleState.isPlayerVictory ? "Victory!" : "Defeat"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Battle ended on turn {battleState.currentTurn}
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate(backPath)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Simulator
                    </Button>
                    <Button onClick={handleStartBattle}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Battle grids and controls */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main battle area */}
              <div className="lg:col-span-2 space-y-4">
                {/* Enemy grid */}
                <LiveBattleGrid
                  isEnemy={true}
                  units={battleState.enemyUnits}
                  selectedUnitGridId={selectedUnitGridId}
                  onUnitClick={(unit) => {
                    if (battleState.isPlayerTurn && selectedAbility) {
                      handleTargetClick(unit);
                    } else {
                      setSelectedUnitGridId(unit.gridId);
                      setSelectedAbilityId(null);
                    }
                  }}
                  highlightedGridIds={battleState.isPlayerTurn && selectedAbility ? highlightedGridIds : undefined}
                  lastActionGridIds={lastActionGridIds}
                />

                {/* Unit info and ability selector */}
                <div className="border-y py-4">
                  {selectedUnit && selectedUnitData ? (
                    <div className="flex items-center gap-4">
                      <UnitImage
                        iconName={selectedUnitData.identity.icon}
                        alt={selectedUnitName}
                        className="w-12 h-12 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{selectedUnitName}</p>
                        <p className="text-sm text-muted-foreground">
                          HP: {selectedUnit.currentHp}/{selectedUnit.maxHp}
                          {selectedUnit.maxArmor > 0 && ` | Armor: ${selectedUnit.currentArmor}/${selectedUnit.maxArmor}`}
                        </p>
                      </div>
                      {!selectedUnit.isEnemy && battleState.isPlayerTurn && (
                        <LiveAbilitySelector
                          abilities={availableAbilities}
                          selectedAbilityId={selectedAbilityId}
                          onSelectAbility={setSelectedAbilityId}
                          cooldowns={selectedUnit.abilityCooldowns}
                          globalCooldown={selectedUnit.globalCooldown}
                          disabled={!battleState.isPlayerTurn || battleState.isBattleOver}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      {battleState.isPlayerTurn 
                        ? "Select one of your units to attack" 
                        : "Enemy is taking their turn..."}
                    </p>
                  )}
                </div>

                {/* Friendly grid */}
                <LiveBattleGrid
                  isEnemy={false}
                  units={battleState.friendlyUnits}
                  selectedUnitGridId={selectedUnitGridId}
                  onUnitClick={(unit) => {
                    if (battleState.isPlayerTurn) {
                      setSelectedUnitGridId(unit.gridId);
                      setSelectedAbilityId(null);
                    }
                  }}
                  lastActionGridIds={lastActionGridIds}
                />
              </div>

              {/* Side panel */}
              <div className="space-y-4">
                {/* Controls */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={skipTurn}
                      disabled={!battleState.isPlayerTurn || battleState.isBattleOver || isProcessing}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip Turn
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleStartBattle}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restart Battle
                    </Button>
                  </CardContent>
                </Card>

                {/* Battle log */}
                <BattleLog
                  turns={battleState.battleLog}
                  currentTurn={battleState.currentTurn}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default LiveBattleSimulator;
