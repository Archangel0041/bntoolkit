import { useState } from "react";
import { cn } from "@/lib/utils";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { EncounterUnit } from "@/types/encounters";
import type { PartyUnit, DamagePreview, SelectedUnit, TargetArea } from "@/types/battleSimulator";
import { ENEMY_GRID_LAYOUT, FRIENDLY_GRID_LAYOUT, getAffectedGridPositions } from "@/types/battleSimulator";

interface BattleGridProps {
  isEnemy: boolean;
  units: EncounterUnit[] | PartyUnit[];
  selectedUnit: SelectedUnit | null;
  onUnitClick: (unit: SelectedUnit) => void;
  damagePreviews?: DamagePreview[];
  rankOverrides?: Record<number, number>;
  onMoveUnit?: (fromGridId: number, toGridId: number) => void;
  onRemoveUnit?: (gridId: number) => void;
  onAddUnit?: (unitId: number, gridId: number) => void;
  // Targeting reticle props - only shows when this grid is the TARGET side
  targetArea?: TargetArea;
  reticleGridId?: number;
  onReticleClick?: (gridId: number) => void;
  showReticle?: boolean; // Whether to show the reticle on this grid
}

const DAMAGE_TYPE_NAMES: Record<number, string> = {
  1: "Piercing",
  2: "Explosive",
  3: "Fire",
  4: "Cold",
  5: "Crushing",
  6: "Poison",
};

export function BattleGrid({
  isEnemy,
  units,
  selectedUnit,
  onUnitClick,
  damagePreviews = [],
  rankOverrides = {},
  onMoveUnit,
  onRemoveUnit,
  onAddUnit,
  targetArea,
  reticleGridId,
  onReticleClick,
  showReticle = false,
}: BattleGridProps) {
  const { t } = useLanguage();
  const layout = isEnemy ? ENEMY_GRID_LAYOUT : FRIENDLY_GRID_LAYOUT;
  const [draggedGridId, setDraggedGridId] = useState<number | null>(null);
  const [dragOverGridId, setDragOverGridId] = useState<number | null>(null);

  // Calculate which grid positions are affected by the reticle (only if showReticle is true)
  const affectedPositions = showReticle && reticleGridId !== undefined && targetArea
    ? getAffectedGridPositions(reticleGridId, targetArea, isEnemy)
    : [];

  const getUnitAtPosition = (gridId: number) => {
    if (isEnemy) {
      return (units as EncounterUnit[]).find(u => u.grid_id === gridId);
    }
    return (units as PartyUnit[]).find(u => u.gridId === gridId);
  };

  const getDamagePreview = (gridId: number) => {
    return damagePreviews.find(dp => dp.targetGridId === gridId);
  };

  const handleDragStart = (e: React.DragEvent, gridId: number, unitId: number) => {
    if (isEnemy) return;
    e.dataTransfer.setData("text/plain", gridId.toString());
    e.dataTransfer.setData("application/x-formation-unit", JSON.stringify({ gridId, unitId }));
    setDraggedGridId(gridId);
  };

  const handleDragOver = (e: React.DragEvent, gridId: number) => {
    if (isEnemy) return;
    e.preventDefault();
    setDragOverGridId(gridId);
  };

  const handleDragLeave = () => {
    setDragOverGridId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGridId: number) => {
    if (isEnemy) return;
    e.preventDefault();
    
    // Check if it's a unit being dragged from the party selector
    const selectorData = e.dataTransfer.getData("application/x-selector-unit");
    if (selectorData && onAddUnit) {
      const { unitId } = JSON.parse(selectorData);
      onAddUnit(unitId, targetGridId);
      setDraggedGridId(null);
      setDragOverGridId(null);
      return;
    }
    
    // Otherwise handle internal grid move
    const fromGridId = parseInt(e.dataTransfer.getData("text/plain"));
    if (fromGridId !== targetGridId && onMoveUnit) {
      onMoveUnit(fromGridId, targetGridId);
    }
    setDraggedGridId(null);
    setDragOverGridId(null);
  };

  const handleDragEnd = () => {
    setDraggedGridId(null);
    setDragOverGridId(null);
  };

  // Calculate remaining HP/Armor range after attack
  const getRemainingRange = (preview: DamagePreview) => {
    const minHpRemaining = Math.max(0, preview.targetHp - preview.maxTotalDamage.hpDamage);
    const maxHpRemaining = Math.max(0, preview.targetHp - preview.minTotalDamage.hpDamage);
    
    let minArmorRemaining = 0;
    let maxArmorRemaining = 0;
    if (preview.targetHasArmor) {
      minArmorRemaining = Math.max(0, preview.targetArmorHp - preview.maxTotalDamage.armorDamage);
      maxArmorRemaining = Math.max(0, preview.targetArmorHp - preview.minTotalDamage.armorDamage);
    }
    
    return { minHpRemaining, maxHpRemaining, minArmorRemaining, maxArmorRemaining };
  };

  const renderSlot = (gridId: number) => {
    const encounterUnit = getUnitAtPosition(gridId);
    const damagePreview = getDamagePreview(gridId);
    const isDragging = draggedGridId === gridId;
    const isDragOver = dragOverGridId === gridId;
    
    // Check if this grid is affected by AOE reticle (only when showReticle is true)
    const affectedPos = affectedPositions.find(p => p.gridId === gridId);
    const isAffectedByReticle = showReticle && affectedPos !== undefined;
    const isReticleCenter = showReticle && reticleGridId === gridId;
    
    const slotSize = "w-16 h-16 sm:w-18 sm:h-18";

    // Handle clicking to move reticle position
    const handleReticleAreaClick = (e: React.MouseEvent) => {
      if (showReticle && onReticleClick && targetArea) {
        e.stopPropagation(); // Prevent unit click
        onReticleClick(gridId);
      }
    };
    
    if (!encounterUnit) {
      return (
        <div
          key={gridId}
          className={cn(
            slotSize,
            "border border-dashed border-muted-foreground/20 rounded-md transition-all flex items-center justify-center",
            isDragOver && "border-primary bg-primary/20 border-solid",
            // Reticle highlighting for empty slots
            isReticleCenter && "border-yellow-500 border-solid border-2 bg-yellow-500/20",
            isAffectedByReticle && !isReticleCenter && "border-orange-500 border-solid bg-orange-500/10",
            showReticle && targetArea && "cursor-crosshair"
          )}
          onDragOver={(e) => handleDragOver(e, gridId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, gridId)}
          onClick={handleReticleAreaClick}
        >
          {/* Show damage percent for AOE */}
          {isAffectedByReticle && affectedPos && affectedPos.damagePercent !== 100 && (
            <span className="text-[10px] font-bold text-orange-400">
              {affectedPos.damagePercent}%
            </span>
          )}
        </div>
      );
    }

    const unitId = isEnemy 
      ? (encounterUnit as EncounterUnit).unit_id 
      : (encounterUnit as PartyUnit).unitId;
    const unitGridId = isEnemy 
      ? (encounterUnit as EncounterUnit).grid_id! 
      : (encounterUnit as PartyUnit).gridId;

    const unitData = getUnitById(unitId);
    const unitName = unitData ? t(unitData.identity.name) : `Unit ${unitId}`;
    
    const maxRank = unitData?.statsConfig?.stats?.length || 1;
    const currentRank = isEnemy 
      ? (rankOverrides[unitGridId] || maxRank)
      : (encounterUnit as PartyUnit).rank;

    // Get unit stats for HP/Armor display
    const unitStats = unitData?.statsConfig?.stats?.[currentRank - 1];
    const unitHp = unitStats?.hp || 0;
    const unitArmor = unitStats?.armor_hp || 0;

    const isSelected = selectedUnit?.gridId === unitGridId && selectedUnit?.isEnemy === isEnemy;

    const handleClick = () => {
      onUnitClick({
        unitId,
        gridId: unitGridId,
        rank: currentRank,
        isEnemy,
      });
    };

    const handleSlotClick = () => {
      // If reticle is shown and we have an AOE ability, clicking moves the reticle
      if (showReticle && onReticleClick && targetArea) {
        onReticleClick(gridId);
      } else {
        handleClick();
      }
    };

    const slotContent = (
      <div
        onClick={handleSlotClick}
        draggable={!isEnemy && !showReticle}
        onDragStart={(e) => handleDragStart(e, gridId, unitId)}
        onDragOver={(e) => handleDragOver(e, gridId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, gridId)}
        onDragEnd={handleDragEnd}
        className={cn(
          slotSize,
          "border rounded-md flex flex-col items-center justify-center overflow-hidden transition-all cursor-pointer relative",
          isEnemy 
            ? "border-destructive/50 bg-destructive/10 hover:bg-destructive/20" 
            : "border-primary bg-primary/10 hover:bg-primary/20",
          isSelected && "ring-2 ring-offset-2 ring-yellow-500",
          isDragging && "opacity-50",
          isDragOver && "ring-2 ring-primary",
          // Reticle highlighting for occupied slots
          isReticleCenter && "ring-2 ring-yellow-500 ring-offset-1",
          isAffectedByReticle && !isReticleCenter && "ring-2 ring-orange-500/70",
          showReticle && targetArea && "cursor-crosshair"
        )}
      >
        {unitData && (
          <UnitImage
            iconName={unitData.identity.icon}
            alt={unitName}
            className="w-full h-full"
          />
        )}

        {/* AOE damage percent indicator - top right */}
        {isAffectedByReticle && affectedPos && affectedPos.damagePercent !== 100 && (
          <div className="absolute top-0.5 right-0.5 text-[8px] font-bold text-orange-400 bg-black/60 px-1 rounded-sm">
            {affectedPos.damagePercent}%
          </div>
        )}

        {/* HP/Armor bars at bottom when no damage preview */}
        {!damagePreview && (unitHp > 0 || unitArmor > 0) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-0.5 space-y-0.5">
            {/* Armor Bar (above HP) */}
            {unitArmor > 0 && (
              <div className="h-1.5 w-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: '100%' }} />
              </div>
            )}
            {/* HP Bar (at bottom) */}
            <div className="h-1.5 w-full bg-gray-700 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
            </div>
          </div>
        )}
        
        {/* Damage preview bars */}
        {damagePreview && damagePreview.canTarget && (() => {
          const { minHpRemaining, maxHpRemaining, minArmorRemaining, maxArmorRemaining } = getRemainingRange(damagePreview);
          
          // Calculate percentages for HP bar
          const minHpPercent = (minHpRemaining / damagePreview.targetHp) * 100;
          const maxHpPercent = (maxHpRemaining / damagePreview.targetHp) * 100;
          const minDamageHpPercent = 100 - maxHpPercent; // Guaranteed damage (red)
          const rangeDamageHpPercent = maxHpPercent - minHpPercent; // Range damage (orange)
          
          // Calculate percentages for Armor bar
          let minArmorPercent = 0;
          let maxArmorPercent = 0;
          let minDamageArmorPercent = 0;
          let rangeDamageArmorPercent = 0;
          if (damagePreview.targetHasArmor && damagePreview.targetArmorHp > 0) {
            minArmorPercent = (minArmorRemaining / damagePreview.targetArmorHp) * 100;
            maxArmorPercent = (maxArmorRemaining / damagePreview.targetArmorHp) * 100;
            minDamageArmorPercent = 100 - maxArmorPercent;
            rangeDamageArmorPercent = maxArmorPercent - minArmorPercent;
          }
          
          return (
            <>
              {/* Dodge chance indicator - top left */}
              {damagePreview.dodgeChance > 0 && (
                <div className="absolute top-0.5 left-0.5 text-[8px] font-bold text-yellow-400 bg-black/60 px-1 rounded-sm">
                  {damagePreview.dodgeChance}%
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-0.5">
                <div className="space-y-0.5">
                  {/* Armor Bar with damage visualization (above HP) */}
                  {damagePreview.targetHasArmor && (
                    <div className="h-1.5 w-full bg-gray-700/80 overflow-hidden flex">
                      {/* Blue: Remaining Armor (minimum case) */}
                      <div 
                        className="h-full bg-sky-500 transition-all" 
                        style={{ width: `${minArmorPercent}%` }} 
                      />
                      {/* Orange: Damage range */}
                      {rangeDamageArmorPercent > 0 && (
                        <div 
                          className="h-full bg-orange-500 transition-all" 
                          style={{ width: `${rangeDamageArmorPercent}%` }} 
                        />
                      )}
                      {/* Red: Guaranteed damage */}
                      {minDamageArmorPercent > 0 && (
                        <div 
                          className="h-full bg-red-500 transition-all" 
                          style={{ width: `${minDamageArmorPercent}%` }} 
                        />
                      )}
                    </div>
                  )}
                  
                  {/* HP Bar with damage visualization (at bottom) */}
                  <div className="h-1.5 w-full bg-gray-700/80 overflow-hidden flex">
                    {/* Green: Remaining HP (minimum case) */}
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${minHpPercent}%` }} 
                    />
                    {/* Orange: Damage range (potential additional damage) */}
                    {rangeDamageHpPercent > 0 && (
                      <div 
                        className="h-full bg-orange-500 transition-all" 
                        style={{ width: `${rangeDamageHpPercent}%` }} 
                      />
                    )}
                    {/* Red: Guaranteed damage */}
                    {minDamageHpPercent > 0 && (
                      <div 
                        className="h-full bg-red-500 transition-all" 
                        style={{ width: `${minDamageHpPercent}%` }} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
        
        {/* Cannot target overlay */}
        {damagePreview && !damagePreview.canTarget && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-muted-foreground text-xs">✕</span>
          </div>
        )}
      </div>
    );

    // Wrap with tooltip for detailed info
    if (damagePreview && damagePreview.canTarget) {
      const { minHpRemaining, maxHpRemaining, minArmorRemaining, maxArmorRemaining } = getRemainingRange(damagePreview);
      
      return (
        <Tooltip key={gridId}>
          <TooltipTrigger asChild>
            {slotContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm p-2">
            <div className="text-xs space-y-1.5">
              <p className="font-semibold">{unitName}</p>
              
              {/* Current -> After */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">HP:</span>
                  <span className="text-emerald-500 dark:text-emerald-400">{damagePreview.targetHp}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                    {minHpRemaining === maxHpRemaining ? minHpRemaining : `${minHpRemaining}-${maxHpRemaining}`}
                  </span>
                </div>
                {damagePreview.targetHasArmor && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Armor:</span>
                    <span className="text-sky-500 dark:text-sky-400">{damagePreview.targetArmorHp}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sky-500 dark:text-sky-400 font-medium">
                      {minArmorRemaining === maxArmorRemaining ? minArmorRemaining : `${minArmorRemaining}-${maxArmorRemaining}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Damage dealt */}
              <div className="border-t pt-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Damage{damagePreview.totalShots > 1 && ` (${damagePreview.totalShots} hits)`}:
                  </span>
                  <span className="text-destructive font-medium">
                    {damagePreview.minTotalDamage.hpDamage}-{damagePreview.maxTotalDamage.hpDamage} HP
                    {damagePreview.targetHasArmor && (
                      <span className="text-sky-500 dark:text-sky-400 ml-1">
                        +{damagePreview.minTotalDamage.armorDamage}-{damagePreview.maxTotalDamage.armorDamage} Arm
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Chances */}
              <div className="border-t pt-1.5 flex gap-4">
                <span className="text-muted-foreground">
                  Dodge: <span className={cn("font-medium", damagePreview.dodgeChance > 0 && "text-yellow-500 dark:text-yellow-400")}>{damagePreview.dodgeChance}%</span>
                </span>
                <span className="text-muted-foreground">
                  Crit: <span className={cn("font-medium", damagePreview.critChance > 0 && "text-orange-500 dark:text-orange-400")}>{damagePreview.critChance}%</span>
                </span>
              </div>

              {/* Status Effects */}
              {damagePreview.statusEffects.length > 0 && (
                <div className="border-t pt-1.5 space-y-0.5">
                  {damagePreview.statusEffects.map(se => (
                    <div 
                      key={se.effectId} 
                      className={cn("flex justify-between text-[10px]", se.isImmune && "opacity-50")}
                    >
                      <span style={{ color: se.color }}>
                        {se.name}{se.isImmune && " (IMMUNE)"}
                      </span>
                      <span className="text-muted-foreground">
                        {se.chance}% • {se.duration}t
                        {se.dotDamage > 0 && <span className="text-destructive ml-1">{se.dotDamage}/t</span>}
                        {se.isStun && <span className="text-purple-400 ml-1">Stun</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={gridId}>{slotContent}</div>;
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg",
        isEnemy ? "bg-destructive/5" : "bg-primary/5"
      )}>
        <div className="text-sm font-medium text-muted-foreground mb-2">
          {isEnemy ? "Enemy Formation" : "Your Formation"}
        </div>
        
        {isEnemy ? (
          <>
            <div className="flex gap-1 justify-center">
              {layout.ROW_3.map(gridId => renderSlot(gridId))}
            </div>
            <div className="flex gap-1">
              {layout.ROW_2.map(gridId => renderSlot(gridId))}
            </div>
            <div className="flex gap-1">
              {layout.ROW_1.map(gridId => renderSlot(gridId))}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1">
              {layout.ROW_1.map(gridId => renderSlot(gridId))}
            </div>
            <div className="flex gap-1">
              {layout.ROW_2.map(gridId => renderSlot(gridId))}
            </div>
            <div className="flex gap-1 justify-center">
              {layout.ROW_3.map(gridId => renderSlot(gridId))}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
