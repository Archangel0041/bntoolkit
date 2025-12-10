import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { UnitImage } from "./UnitImage";
import { getClassDisplayName, getClassIcon } from "@/lib/battleConfig";
import type { ParsedUnit } from "@/types/units";
import { Heart, Zap, Shield, Plus, Check, Swords, Eye, Target } from "lucide-react";
import { Link } from "react-router-dom";
import premiumRays from "@/assets/premium_rays.png";

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
  
  // Get class display name
  const classDisplayName = t(getClassDisplayName(unit.identity.class_name));

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
        <div className="flex">
          <div className="relative w-20 h-20 shrink-0">
            {isNanopodUnit && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src={premiumRays} 
                  alt="" 
                  className="w-full h-full object-cover animate-pulse opacity-80"
                  style={{
                    filter: "hue-rotate(60deg) saturate(1.5) brightness(1.2)",
                  }}
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    boxShadow: "inset 0 0 20px 5px rgba(74, 222, 128, 0.4)",
                  }}
                />
              </div>
            )}
            <UnitImage
              iconName={unit.identity.icon}
              alt={t(unit.identity.name)}
              className="w-20 h-20 relative z-10"
              fallbackClassName="w-20 h-20 rounded-none relative z-10"
            />
          </div>
          <div className="flex-1 min-w-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{t(unit.identity.name)}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    #{unit.id}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {classDisplayName}
                </p>
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
