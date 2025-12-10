import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { UnitImage } from "./UnitImage";
import type { ParsedUnit } from "@/types/units";
import { Heart, Zap, Shield, Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface UnitCardProps {
  unit: ParsedUnit;
}

export function UnitCard({ unit }: UnitCardProps) {
  const { t } = useLanguage();
  const { addToCompare, removeFromCompare, isInCompare, compareUnits } = useCompare();

  const stats = unit.statsConfig?.stats[0];
  const inCompare = isInCompare(unit.id);
  const canAddToCompare = compareUnits.length < 2;

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
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer group overflow-hidden">
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
                <h3 className="font-semibold text-sm truncate">{t(unit.identity.name)}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {t(unit.identity.short_name)} • ID: {unit.id}
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
              <div className="flex gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-destructive" />
                  {stats.hp}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {stats.power}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-500" />
                  {stats.pv}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
