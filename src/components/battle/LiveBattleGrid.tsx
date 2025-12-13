import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getUnitById } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";
import { UnitImage } from "@/components/units/UnitImage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skull, Zap } from "lucide-react";
import { getStatusEffectDisplayName, getStatusEffectColor } from "@/lib/statusEffects";
import type { LiveBattleUnit } from "@/types/liveBattle";

interface LiveBattleGridProps {
  isEnemy: boolean;
  units: LiveBattleUnit[];
  selectedUnitGridId: number | null;
  onUnitClick?: (unit: LiveBattleUnit) => void;
  highlightedGridIds?: Set<number>;
  lastActionGridIds?: { attacker?: number; targets?: number[] };
}

export function LiveBattleGrid({
  isEnemy,
  units,
  selectedUnitGridId,
  onUnitClick,
  highlightedGridIds,
  lastActionGridIds,
}: LiveBattleGridProps) {
  const { t } = useLanguage();

  // Standard 5x3 grid layout
  const gridLayout = useMemo(() => {
    const rows = isEnemy
      ? [
          [11, 12, 13, 14, 15], // Row 3 (back)
          [6, 7, 8, 9, 10],    // Row 2 (middle)
          [1, 2, 3, 4, 5],     // Row 1 (front)
        ]
      : [
          [1, 2, 3, 4, 5],     // Row 1 (front)
          [6, 7, 8, 9, 10],    // Row 2 (middle)
          [11, 12, 13],        // Row 3 (back, 3 slots)
        ];
    return rows;
  }, [isEnemy]);

  const renderSlot = (gridId: number) => {
    const unit = units.find(u => u.gridId === gridId);
    const unitData = unit ? getUnitById(unit.unitId) : null;
    const unitName = unitData ? t(unitData.identity.name) : "";

    const isSelected = selectedUnitGridId === gridId;
    const isHighlighted = highlightedGridIds?.has(gridId);
    const isAttacker = lastActionGridIds?.attacker === gridId;
    const isTarget = lastActionGridIds?.targets?.includes(gridId);

    const hpPercent = unit ? (unit.currentHp / unit.maxHp) * 100 : 0;
    const armorPercent = unit && unit.maxArmor > 0 ? (unit.currentArmor / unit.maxArmor) * 100 : 0;

    return (
      <TooltipProvider key={gridId}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative aspect-square border rounded-md flex items-center justify-center cursor-pointer transition-all",
                "bg-muted/20 hover:bg-muted/40",
                isSelected && "ring-2 ring-primary",
                isHighlighted && "ring-2 ring-yellow-500",
                isAttacker && "ring-2 ring-orange-500 animate-pulse",
                isTarget && "ring-2 ring-red-500 animate-pulse",
                unit?.isDead && "opacity-50"
              )}
              onClick={() => unit && !unit.isDead && onUnitClick?.(unit)}
            >
              {unit && unitData && (
                <>
                  <UnitImage
                    iconName={unitData.identity.icon}
                    alt={unitName}
                    className={cn(
                      "w-full h-full object-cover rounded-md",
                      unit.isDead && "grayscale"
                    )}
                  />

                  {/* Dead overlay */}
                  {unit.isDead && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                      <Skull className="h-8 w-8 text-red-500" />
                    </div>
                  )}

                  {/* HP/Armor bars */}
                  {!unit.isDead && (
                    <div className="absolute bottom-0 left-0 right-0 p-0.5 space-y-0.5">
                      {unit.maxArmor > 0 && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${armorPercent}%` }}
                          />
                        </div>
                      )}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status effect indicators */}
                  {!unit.isDead && unit.activeStatusEffects.length > 0 && (
                    <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
                      {unit.activeStatusEffects.slice(0, 3).map((effect, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-background"
                          style={{ backgroundColor: getStatusEffectColor(effect.effectId) }}
                          title={getStatusEffectDisplayName(effect.effectId)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Stun indicator */}
                  {!unit.isDead && unit.activeStatusEffects.some(e => e.isStun) && (
                    <div className="absolute top-0 left-0 p-0.5">
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                  )}
                </>
              )}
            </div>
          </TooltipTrigger>
          {unit && unitData && (
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">{unitName}</p>
                <p className="text-sm">
                  HP: {unit.currentHp}/{unit.maxHp}
                  {unit.maxArmor > 0 && ` | Armor: ${unit.currentArmor}/${unit.maxArmor}`}
                </p>
                {unit.activeStatusEffects.length > 0 && (
                  <div className="text-sm">
                    {unit.activeStatusEffects.map((effect, i) => (
                      <span key={i} className="mr-2">
                        {getStatusEffectDisplayName(effect.effectId)} ({effect.remainingDuration}t)
                      </span>
                    ))}
                  </div>
                )}
                {unit.globalCooldown > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Global Cooldown: {unit.globalCooldown} turns
                  </p>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn("space-y-1", isEnemy ? "mb-2" : "mt-2")}>
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {isEnemy ? "Enemy" : "Friendly"}
      </div>
      <div className="space-y-1">
        {gridLayout.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "grid gap-1",
              row.length === 5 && "grid-cols-5",
              row.length === 3 && "grid-cols-3 max-w-[60%] mx-auto"
            )}
          >
            {row.map(gridId => renderSlot(gridId))}
          </div>
        ))}
      </div>
    </div>
  );
}
