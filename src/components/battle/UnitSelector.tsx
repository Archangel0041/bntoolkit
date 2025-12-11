import { useState } from "react";
import { getUnitById } from "@/lib/units";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { allUnits } from "@/lib/units";
import type { PartyUnit } from "@/types/battleSimulator";
import { getNextAvailablePosition } from "@/lib/battleCalculations";
import { cn } from "@/lib/utils";

interface UnitSelectorProps {
  partyUnits: PartyUnit[];
  onAddUnit: (unit: PartyUnit) => void;
  onRemoveUnit: (gridId: number) => void;
  onUpdateRank: (gridId: number, rank: number) => void;
}

export function UnitSelector({
  partyUnits,
  onAddUnit,
  onRemoveUnit,
  onUpdateRank,
}: UnitSelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter to only show friendly units (side 1)
  const friendlyUnits = allUnits.filter(u => u.identity.side === 1);
  
  const filteredUnits = friendlyUnits.filter(unit => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = t(unit.identity.name).toLowerCase();
    const id = unit.id.toString();
    return name.includes(query) || id.includes(query);
  });

  const handleAddUnit = (unitId: number) => {
    const unit = getUnitById(unitId);
    if (!unit) return;

    const preferredRow = unit.statsConfig?.preferred_row || 1;
    const occupiedPositions = partyUnits.map(u => u.gridId);
    const position = getNextAvailablePosition(preferredRow, occupiedPositions);

    if (position === null) {
      return; // Grid full
    }

    const maxRank = unit.statsConfig?.stats?.length || 1;

    onAddUnit({
      unitId,
      gridId: position,
      rank: maxRank,
    });

    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Party Units</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Unit to Party</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <div className="overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredUnits.slice(0, 50).map(unit => (
                <button
                  key={unit.id}
                  onClick={() => handleAddUnit(unit.id)}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <UnitImage
                    iconName={unit.identity.icon}
                    alt={t(unit.identity.name)}
                    className="w-10 h-10 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {t(unit.identity.name)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ID: {unit.id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {partyUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No units in party. Add units to start simulating battles.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {partyUnits.map(partyUnit => {
            const unit = getUnitById(partyUnit.unitId);
            const maxRank = unit?.statsConfig?.stats?.length || 1;
            const unitName = unit ? t(unit.identity.name) : `Unit ${partyUnit.unitId}`;

            return (
              <div
                key={partyUnit.gridId}
                className="flex items-center gap-2 p-2 rounded-lg border bg-card"
              >
                {unit && (
                  <UnitImage
                    iconName={unit.identity.icon}
                    alt={unitName}
                    className="w-10 h-10 rounded"
                  />
                )}
                <div className="text-xs">
                  <p className="font-medium truncate max-w-20">{unitName}</p>
                  <p className="text-muted-foreground">Pos: {partyUnit.gridId}</p>
                </div>
                <Select
                  value={partyUnit.rank.toString()}
                  onValueChange={(val) => onUpdateRank(partyUnit.gridId, parseInt(val))}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxRank }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        R{i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onRemoveUnit(partyUnit.gridId)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
