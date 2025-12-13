import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UnitImage } from "@/components/units/UnitImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUnitById } from "@/lib/units";
import { UnitBlocking, UnitBlockingLabels, UnitClass, UnitClassLabels } from "@/data/gameEnums";
import { cn } from "@/lib/utils";
import type { LiveBattleUnit } from "@/types/liveBattle";

interface UnitInfoPanelProps {
  unitId: number;
  rank: number;
  gridId?: number;
  isEnemy?: boolean;
  // Live battle state (optional)
  currentHp?: number;
  currentArmor?: number;
  weaponAmmo?: Record<string, number>;
  className?: string;
}

export function UnitInfoPanel({
  unitId,
  rank,
  gridId,
  isEnemy,
  currentHp,
  currentArmor,
  weaponAmmo,
  className,
}: UnitInfoPanelProps) {
  const { t } = useLanguage();

  const unit = useMemo(() => getUnitById(unitId), [unitId]);
  
  if (!unit) return null;

  const stats = unit.statsConfig?.stats?.[rank - 1];
  const maxRank = unit.statsConfig?.stats?.length || 1;
  const blocking = unit.statsConfig?.blocking ?? 0;
  const blockingLabel = UnitBlockingLabels[blocking] || "Unknown";
  const className_ = unit.identity.class_name;
  const classLabel = UnitClassLabels[className_] || `Class ${className_}`;
  const preferredRow = unit.statsConfig?.preferred_row || 1;
  const size = unit.statsConfig?.size || 1;
  
  // Get unit name
  const unitName = t(unit.identity.name);

  // Stats
  const hp = stats?.hp || 0;
  const armorHp = stats?.armor_hp || 0;
  const accuracy = stats?.accuracy || 0;
  const defense = stats?.defense || 0;
  const dodge = stats?.dodge || 0;
  const power = stats?.power || 0;
  const bravery = stats?.bravery || 0;
  const critical = stats?.critical || 0;
  const pv = stats?.pv || 0;

  // Display current vs max if provided
  const displayHp = currentHp !== undefined ? `${currentHp}/${hp}` : hp;
  const displayArmor = currentArmor !== undefined ? `${currentArmor}/${armorHp}` : armorHp;

  // Weapons info
  const weapons = unit.weapons?.weapons;
  const weaponList = weapons ? Object.entries(weapons) : [];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <UnitImage
            iconName={unit.identity.icon}
            alt={unitName}
            className="w-12 h-12 rounded"
          />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{unitName}</CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs h-5">ID: {unitId}</Badge>
              <Badge variant="secondary" className="text-xs h-5">Rank {rank}/{maxRank}</Badge>
              {gridId !== undefined && (
                <Badge variant="outline" className="text-xs h-5">Grid: {gridId}</Badge>
              )}
              {isEnemy !== undefined && (
                <Badge variant={isEnemy ? "destructive" : "default"} className="text-xs h-5">
                  {isEnemy ? "Enemy" : "Friendly"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-2 px-4 space-y-3">
        {/* Core Stats */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Combat Stats</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">HP</span>
              <span className={cn(
                "font-medium",
                currentHp !== undefined && currentHp < hp && "text-red-500"
              )}>{displayHp}</span>
            </div>
            {armorHp > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Armor</span>
                <span className={cn(
                  "font-medium text-blue-500",
                  currentArmor !== undefined && currentArmor < armorHp && "text-blue-400"
                )}>{displayArmor}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-medium">{accuracy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Defense</span>
              <span className="font-medium">{defense}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Power</span>
              <span className="font-medium">{power}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Critical</span>
              <span className="font-medium">{critical}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bravery</span>
              <span className="font-medium">{bravery}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PV</span>
              <span className="font-medium">{pv}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Unit Properties */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Properties</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Class</span>
              <span className="font-medium">{classLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blocking</span>
              <span className={cn(
                "font-medium",
                blocking === UnitBlocking.Full && "text-orange-500",
                blocking === UnitBlocking.God && "text-purple-500"
              )}>{blockingLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Row</span>
              <span className="font-medium">{preferredRow === 1 ? "Front" : preferredRow === 2 ? "Middle" : "Back"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{size}</span>
            </div>
          </div>
        </div>

        {/* Weapons & Ammo */}
        {weaponList.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Weapons</div>
              <div className="space-y-1">
                {weaponList.map(([name, weapon]) => {
                  const currentAmmo = weaponAmmo?.[name];
                  const maxAmmo = weapon.stats.ammo;
                  const hasInfiniteAmmo = maxAmmo === -1;
                  const reloadTime = weapon.stats.reload_time;

                  return (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[120px]" title={t(weapon.name)}>
                        {t(weapon.name)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          currentAmmo !== undefined && currentAmmo === 0 && "text-red-500"
                        )}>
                          {hasInfiniteAmmo ? "∞" : (
                            currentAmmo !== undefined 
                              ? `${currentAmmo}/${maxAmmo}` 
                              : maxAmmo
                          )}
                        </span>
                        {reloadTime && reloadTime > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({reloadTime}t reload)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Status Effect Immunities */}
        {unit.statsConfig?.status_effect_immunities && unit.statsConfig.status_effect_immunities.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Immunities</div>
              <div className="flex flex-wrap gap-1">
                {unit.statsConfig.status_effect_immunities.map((immunity, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    Effect {immunity}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
