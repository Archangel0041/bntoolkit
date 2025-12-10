import { Link } from "react-router-dom";
import { GRID_LAYOUT, type EncounterUnit } from "@/types/encounters";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface EncounterGridProps {
  units: EncounterUnit[];
  showPlayerUnits?: EncounterUnit[];
  compact?: boolean;
}

export function EncounterGrid({ units, showPlayerUnits, compact = false }: EncounterGridProps) {
  const { t } = useLanguage();

  const getUnitAtPosition = (gridId: number): EncounterUnit | undefined => {
    return units.find(u => u.grid_id === gridId);
  };

  const getPlayerUnitAtPosition = (gridId: number): EncounterUnit | undefined => {
    return showPlayerUnits?.find(u => u.grid_id === gridId);
  };

  const renderSlot = (gridId: number) => {
    const encounterUnit = getUnitAtPosition(gridId);
    const playerUnit = getPlayerUnitAtPosition(gridId);
    const unit = encounterUnit || playerUnit;
    const isPlayer = !!playerUnit && !encounterUnit;

    const slotSize = compact ? "w-12 h-12" : "w-16 h-16 sm:w-20 sm:h-20";
    
    if (!unit) {
      return (
        <div
          key={gridId}
          className={cn(
            slotSize,
            "border border-dashed border-muted-foreground/20 rounded-md"
          )}
        />
      );
    }

    const unitData = getUnitById(unit.unit_id);
    const unitName = unitData ? t(unitData.identity.name) : `Unit ${unit.unit_id}`;

    return (
      <Link
        key={gridId}
        to={`/units/${unit.unit_id}`}
        className={cn(
          slotSize,
          "border rounded-md flex items-center justify-center overflow-hidden transition-all hover:scale-105 hover:z-10 relative group",
          isPlayer 
            ? "border-primary bg-primary/10" 
            : "border-destructive/50 bg-destructive/10"
        )}
        title={unitName}
      >
        {unitData ? (
          <UnitImage
            iconName={unitData.identity.icon}
            alt={unitName}
            className="w-full h-full"
          />
        ) : (
          <span className="text-xs text-center px-1">{unit.unit_id}</span>
        )}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] text-white text-center px-1 leading-tight">{unitName}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Row 3 (back row): positions 13,12,11 - now at top */}
      <div className="flex gap-1">
        {GRID_LAYOUT.ROW_3.map(gridId => renderSlot(gridId))}
      </div>
      
      {/* Row 2 (middle): positions 9,8,7,6,5 */}
      <div className="flex gap-1">
        {GRID_LAYOUT.ROW_2.map(gridId => renderSlot(gridId))}
      </div>
      
      {/* Row 1 (front row): positions 4,3,2,1,0 - now at bottom */}
      <div className="flex gap-1">
        {GRID_LAYOUT.ROW_1.map(gridId => renderSlot(gridId))}
      </div>
    </div>
  );
}
