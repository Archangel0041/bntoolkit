import { useState } from "react";
import { cn } from "@/lib/utils";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { EncounterUnit } from "@/types/encounters";
import type { PartyUnit, DamagePreview, SelectedUnit } from "@/types/battleSimulator";
import { ENEMY_GRID_LAYOUT, FRIENDLY_GRID_LAYOUT } from "@/types/battleSimulator";

interface BattleGridProps {
  isEnemy: boolean;
  units: EncounterUnit[] | PartyUnit[];
  selectedUnit: SelectedUnit | null;
  onUnitClick: (unit: SelectedUnit) => void;
  damagePreviews?: DamagePreview[];
  rankOverrides?: Record<number, number>;
  onMoveUnit?: (fromGridId: number, toGridId: number) => void;
}

export function BattleGrid({
  isEnemy,
  units,
  selectedUnit,
  onUnitClick,
  damagePreviews = [],
  rankOverrides = {},
  onMoveUnit,
}: BattleGridProps) {
  const { t } = useLanguage();
  const layout = isEnemy ? ENEMY_GRID_LAYOUT : FRIENDLY_GRID_LAYOUT;
  const [draggedGridId, setDraggedGridId] = useState<number | null>(null);
  const [dragOverGridId, setDragOverGridId] = useState<number | null>(null);

  const getUnitAtPosition = (gridId: number) => {
    if (isEnemy) {
      return (units as EncounterUnit[]).find(u => u.grid_id === gridId);
    }
    return (units as PartyUnit[]).find(u => u.gridId === gridId);
  };

  const getDamagePreview = (gridId: number) => {
    return damagePreviews.find(dp => dp.targetGridId === gridId);
  };

  const handleDragStart = (e: React.DragEvent, gridId: number) => {
    if (isEnemy) return;
    e.dataTransfer.setData("text/plain", gridId.toString());
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

  const renderSlot = (gridId: number) => {
    const encounterUnit = getUnitAtPosition(gridId);
    const damagePreview = getDamagePreview(gridId);
    const isDragging = draggedGridId === gridId;
    const isDragOver = dragOverGridId === gridId;
    
    const slotSize = "w-16 h-16 sm:w-20 sm:h-20";
    
    if (!encounterUnit) {
      return (
        <div
          key={gridId}
          className={cn(
            slotSize,
            "border border-dashed border-muted-foreground/20 rounded-md transition-all",
            isDragOver && "border-primary bg-primary/20 border-solid"
          )}
          onDragOver={(e) => handleDragOver(e, gridId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, gridId)}
        />
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

    // Calculate final HP after damage for compact display
    const getFinalHp = (preview: DamagePreview) => {
      const avgHpDamage = Math.floor((preview.minDamage.hpDamage + preview.maxDamage.hpDamage) / 2);
      return Math.max(0, preview.targetHp - avgHpDamage);
    };

    const slotContent = (
      <div
        onClick={handleClick}
        draggable={!isEnemy}
        onDragStart={(e) => handleDragStart(e, gridId)}
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
          isDragOver && "ring-2 ring-primary"
        )}
      >
        {unitData && (
          <UnitImage
            iconName={unitData.identity.icon}
            alt={unitName}
            className="w-full h-full"
          />
        )}

        {/* HP/Armor bar at bottom when no damage preview */}
        {!damagePreview && (unitHp > 0 || unitArmor > 0) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-0.5 py-0.5 flex justify-center gap-1 text-[8px] font-bold">
            <span className="text-emerald-400 dark:text-emerald-300">{unitHp}</span>
            {unitArmor > 0 && (
              <span className="text-sky-400 dark:text-sky-300">{unitArmor}</span>
            )}
          </div>
        )}
        
        {/* Compact damage overlay - shows HP/Armor, damage, dodge, crit */}
        {damagePreview && damagePreview.canTarget && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white text-[8px] font-bold p-0.5 leading-tight gap-0.5">
            {/* Current HP/Armor */}
            <div className="flex gap-1">
              <span className="text-emerald-400 dark:text-emerald-300">{damagePreview.targetHp}</span>
              {damagePreview.targetHasArmor && (
                <span className="text-sky-400 dark:text-sky-300">{damagePreview.targetArmorHp}</span>
              )}
            </div>
            {/* Damage range */}
            <span className="text-destructive text-[10px]">
              {damagePreview.minDamage.hpDamage}-{damagePreview.maxDamage.hpDamage}
              {damagePreview.targetHasArmor && (
                <span className="text-sky-400"> +{damagePreview.minDamage.armorDamage}-{damagePreview.maxDamage.armorDamage}</span>
              )}
            </span>
            {/* Dodge and Crit */}
            <div className="flex gap-1">
              {damagePreview.dodgeChance > 0 && (
                <span className="text-yellow-400">{damagePreview.dodgeChance}%D</span>
              )}
              {damagePreview.critChance > 0 && (
                <span className="text-orange-400">{damagePreview.critChance}%C</span>
              )}
            </div>
          </div>
        )}
        
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
      return (
        <Tooltip key={gridId}>
          <TooltipTrigger asChild>
            {slotContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-2">
            <div className="text-xs space-y-1.5">
              <p className="font-semibold">{unitName}</p>
              
              {/* Current HP/Armor */}
              <div className="flex gap-3 text-muted-foreground">
                <span>HP: <span className="text-emerald-500 dark:text-emerald-400 font-medium">{damagePreview.targetHp}</span></span>
                {damagePreview.targetHasArmor && (
                  <span>Armor: <span className="text-sky-500 dark:text-sky-400 font-medium">{damagePreview.targetArmorHp}</span></span>
                )}
                <span>Def: <span className="text-foreground">{damagePreview.targetDefense}</span></span>
              </div>

              {/* Damage breakdown */}
              <div className="border-t pt-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HP Damage:</span>
                  <span className="text-destructive font-medium">
                    {damagePreview.minDamage.hpDamage} - {damagePreview.maxDamage.hpDamage}
                  </span>
                </div>
                {damagePreview.targetHasArmor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Armor Damage:</span>
                    <span className="text-sky-500 dark:text-sky-400 font-medium">
                      {damagePreview.minDamage.armorDamage} - {damagePreview.maxDamage.armorDamage}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Raw Damage:</span>
                  <span className="font-medium">
                    {damagePreview.minDamage.rawDamage} - {damagePreview.maxDamage.rawDamage}
                  </span>
                </div>
              </div>

              {/* Chances */}
              <div className="border-t pt-1.5 flex gap-4">
                <div>
                  <span className="text-muted-foreground">Dodge: </span>
                  <span className={cn(
                    "font-medium",
                    damagePreview.dodgeChance > 0 ? "text-yellow-500 dark:text-yellow-400" : "text-foreground"
                  )}>
                    {damagePreview.dodgeChance}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Crit: </span>
                  <span className={cn(
                    "font-medium",
                    damagePreview.critChance > 0 ? "text-orange-500 dark:text-orange-400" : "text-foreground"
                  )}>
                    {damagePreview.critChance}%
                  </span>
                </div>
              </div>

              {/* Final HP estimate */}
              <div className="border-t pt-1.5">
                <span className="text-muted-foreground">After attack: </span>
                <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                  ~{getFinalHp(damagePreview)} HP
                </span>
                {damagePreview.targetHasArmor && damagePreview.maxDamage.armorRemaining < damagePreview.targetArmorHp && (
                  <span className="text-sky-500 dark:text-sky-400 ml-2">
                    ~{Math.floor((damagePreview.minDamage.armorRemaining + damagePreview.maxDamage.armorRemaining) / 2)} Armor
                  </span>
                )}
              </div>
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
