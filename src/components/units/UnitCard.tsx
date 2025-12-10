import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
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
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{t(unit.identity.name)}</CardTitle>
              <p className="text-sm text-muted-foreground truncate">
                {t(unit.identity.short_name)} • ID: {unit.id}
              </p>
            </div>
            <Button
              variant={inCompare ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCompareClick}
              disabled={!inCompare && !canAddToCompare}
            >
              {inCompare ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-destructive" />
                <span className="font-medium">{stats.hp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{stats.power}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{stats.pv}</span>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">Side {unit.identity.side}</Badge>
            {unit.identity.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {unit.identity.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{unit.identity.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
