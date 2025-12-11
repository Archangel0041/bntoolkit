import { useState } from "react";
import { cn } from "@/lib/utils";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
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
    if (isEnemy) return; // Only allow dragging friendly units
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

    const isSelected = selectedUnit?.gridId === unitGridId && selectedUnit?.isEnemy === isEnemy;

    const handleClick = () => {
      onUnitClick({
        unitId,
        gridId: unitGridId,
        rank: currentRank,
        isEnemy,
      });
    };

    return (
      <div
        key={gridId}
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
        
        {/* Damage overlay */}
        {damagePreview && damagePreview.canTarget && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-[10px] font-bold p-1">
            {/* HP damage display */}
            <span className="text-destructive">
              {damagePreview.minDamage.hpDamage}-{damagePreview.maxDamage.hpDamage} HP
            </span>
            {/* Armor damage if target has armor */}
            {damagePreview.targetHasArmor && (
              <span className="text-blue-400">
                {damagePreview.minDamage.armorDamage}-{damagePreview.maxDamage.armorDamage} Arm
              </span>
            )}
            {damagePreview.dodgeChance > 0 && (
              <span className="text-yellow-400">
                {damagePreview.dodgeChance}% dodge
              </span>
            )}
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
  };

  return (
    <div className={cn(
      "flex flex-col items-center gap-2 p-4 rounded-lg",
      isEnemy ? "bg-destructive/5" : "bg-primary/5"
    )}>
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {isEnemy ? "Enemy Formation" : "Your Formation"}
      </div>
      
      {isEnemy ? (
        <>
          {/* Enemy: Row 3 at top, Row 1 at bottom */}
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
          {/* Friendly: Row 1 at top (closest to enemy), Row 3 at bottom */}
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
  );
}
