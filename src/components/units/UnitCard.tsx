import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { UnitImage } from "./UnitImage";
import type { ParsedUnit } from "@/types/units";
import { Heart, Zap, Shield, Plus, Check, Swords, Eye, Target } from "lucide-react";
import { Link } from "react-router-dom";
import nanopodIcon from "@/assets/nanopod_vial.png";

interface UnitCardProps {
  unit: ParsedUnit;
}

export function UnitCard({ unit }: UnitCardProps) {
  const { t } = useLanguage();
  const { addToCompare, removeFromCompare, isInCompare, compareUnits } = useCompare();

  const stats = unit.statsConfig?.stats[0];
  const inCompare = isInCompare(unit.id);
  const canAddToCompare = compareUnits.length < 2;
  
  // Check if unit costs nanopods
  const isNanopodUnit = unit.requirements?.cost?.nanopods && unit.requirements.cost.nanopods > 0;

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(unit.id);
    } else if (canAddToCompare) {
      addToCompare(unit);
    }
  };

  return (
    <Link to={`/unit/${unit.id}`}>
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer group overflow-hidden relative">
        {isNanopodUnit && (
          <div className="absolute top-1 left-1 z-10">
            <img 
              src={nanopodIcon} 
              alt="Nanopod unit" 
              className="w-6 h-6 rotate-45 drop-shadow-md"
              title="Nanopod unit"
            />
          </div>
        )}
        <div className="flex">
          <UnitImage
            iconName={unit.identity.icon}
            alt={t(unit.identity.name)}
            className="w-20 h-20 shrink-0"
            fallbackClassName="w-20 h-20 shrink-0 rounded-none"
          />
          <div className="flex-1 min-w-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{t(unit.identity.name)}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    #{unit.id}
                  </Badge>
                </div>
              </div>
              <Button
                variant={inCompare ? "default" : "outline"}
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCompareClick}
                disabled={!inCompare && !canAddToCompare}
              >
                {inCompare ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
            {stats && (
              <div className="grid grid-cols-4 gap-x-2 gap-y-1 mt-2 text-xs">
                <span className="flex items-center gap-1" title="HP">
                  <Heart className="h-3 w-3 text-destructive" />
                  {stats.hp}
                </span>
                <span className="flex items-center gap-1" title="Power">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {stats.power}
                </span>
                <span className="flex items-center gap-1" title="Defense">
                  <Shield className="h-3 w-3 text-blue-500" />
                  {stats.defense}
                </span>
                <span className="flex items-center gap-1" title="Dodge">
                  <Eye className="h-3 w-3 text-purple-500" />
                  {stats.dodge}
                </span>
                <span className="flex items-center gap-1" title="Bravery">
                  <Swords className="h-3 w-3 text-orange-500" />
                  {stats.bravery}
                </span>
                <span className="flex items-center gap-1" title="Critical">
                  <Target className="h-3 w-3 text-red-500" />
                  {stats.critical}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
