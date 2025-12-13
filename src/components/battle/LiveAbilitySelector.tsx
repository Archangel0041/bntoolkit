import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAbilityById } from "@/lib/abilities";
import { getAbilityImageUrl } from "@/lib/abilityImages";
import { getDamageTypeIconUrl } from "@/lib/damageImages";
import { expandTargetTags } from "@/lib/tagHierarchy";
import type { AbilityInfo } from "@/types/battleSimulator";
import { LineOfFireLabels } from "@/types/battleSimulator";
import { AttackDirection, UnitTag } from "@/data/gameEnums";
import { Check, X } from "lucide-react";

// Detailed targeting categories matching what users care about
const TARGETING_TYPES = [
  { tag: UnitTag.Air, label: "Air", key: "air" },
  { tag: UnitTag.Lta, label: "LTA", key: "lta" },
  { tag: UnitTag.Soldier, label: "Soldier", key: "soldier" },
  { tag: UnitTag.Sniper, label: "Sniper", key: "sniper" },
  { tag: UnitTag.Vehicle, label: "Vehicle", key: "vehicle" },
  { tag: UnitTag.Tank, label: "Tank", key: "tank" },
  { tag: UnitTag.Metal, label: "Metal", key: "metal" },
  { tag: UnitTag.Critter, label: "Critter", key: "critter" },
  { tag: UnitTag.Civilian, label: "Civilian", key: "civilian" },
  { tag: UnitTag.Sea, label: "Sea", key: "sea" },
  { tag: UnitTag.Ship, label: "Ship", key: "ship" },
] as const;

function canTargetTag(abilityTargets: number[], tagToCheck: number, expandedTargets: Set<number>): boolean {
  if (abilityTargets.length === 0) return true;
  if (abilityTargets.includes(UnitTag.Unit) || expandedTargets.has(UnitTag.Unit)) return true;
  if (abilityTargets.includes(tagToCheck) || expandedTargets.has(tagToCheck)) return true;
  return false;
}

function getTargetingDetails(targets: number[]): { tag: number; label: string; canHit: boolean }[] {
  if (targets.length === 0) {
    return TARGETING_TYPES.map(t => ({ tag: t.tag, label: t.label, canHit: true }));
  }
  
  const expandedTargets = new Set(expandTargetTags(targets));
  targets.forEach(t => expandedTargets.add(t));
  
  return TARGETING_TYPES.map(t => ({
    tag: t.tag,
    label: t.label,
    canHit: canTargetTag(targets, t.tag, expandedTargets),
  }));
}

interface LiveAbilitySelectorProps {
  abilities: AbilityInfo[];
  selectedAbilityId: number | null;
  onSelectAbility: (abilityId: number) => void;
  cooldowns: Record<number, number>;
  weaponGlobalCooldowns: Record<string, number>;
  weaponAmmo?: Record<string, number>;
  weaponReloadCooldown?: Record<string, number>;
  disabled?: boolean;
  className?: string;
}

export function LiveAbilitySelector({
  abilities,
  selectedAbilityId,
  onSelectAbility,
  cooldowns,
  weaponGlobalCooldowns,
  weaponAmmo,
  weaponReloadCooldown,
  disabled,
  className,
}: LiveAbilitySelectorProps) {
  const { t } = useLanguage();

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {abilities.map(ability => {
          const abilityData = getAbilityById(ability.abilityId);
          const abilityName = abilityData ? t(abilityData.name) : `Ability ${ability.abilityId}`;
          const iconUrl = abilityData ? getAbilityImageUrl(abilityData.icon) : undefined;
          const dmgTypeIcon = getDamageTypeIconUrl(ability.damageType);
          
          const abilityCooldown = cooldowns[ability.abilityId] || 0;
          const weaponCooldown = weaponGlobalCooldowns[ability.weaponName] || 0;
          const isOnCooldown = abilityCooldown > 0 || weaponCooldown > 0;
          const isSelected = selectedAbilityId === ability.abilityId;
          
          // Ammo check
          const currentAmmo = weaponAmmo?.[ability.weaponName] ?? ability.weaponMaxAmmo;
          const isInfiniteAmmo = ability.weaponMaxAmmo === -1;
          const hasEnoughAmmo = isInfiniteAmmo || currentAmmo >= ability.ammoRequired;
          const isReloading = (weaponReloadCooldown?.[ability.weaponName] ?? 0) > 0;
          const reloadTurns = weaponReloadCooldown?.[ability.weaponName] ?? 0;
          
          const isDisabled = disabled || isOnCooldown || !hasEnoughAmmo || isReloading;
          const totalShots = ability.shotsPerAttack * ability.attacksPerUse;

          return (
            <Tooltip key={ability.abilityId}>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => onSelectAbility(ability.abilityId)}
                  className={cn(
                    "relative flex items-center gap-2",
                    isDisabled && "opacity-50"
                  )}
                >
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt=""
                      className="w-6 h-6 rounded"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="text-left">
                    <span className="truncate max-w-[100px] block text-xs font-medium">{abilityName}</span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {dmgTypeIcon && <img src={dmgTypeIcon} alt="" className="w-3 h-3" />}
                      <span>
                        {ability.minDamage}-{ability.maxDamage}
                        {totalShots > 1 && ` x${totalShots}`}
                      </span>
                    </div>
                  </div>
                  {/* Ammo indicator */}
                  {!isInfiniteAmmo && ability.ammoRequired > 0 && (
                    <Badge
                      variant={hasEnoughAmmo ? "outline" : "destructive"}
                      className="ml-1 h-5 px-1 text-xs"
                    >
                      {currentAmmo}/{ability.weaponMaxAmmo}
                    </Badge>
                  )}
                  {/* Cooldown badge */}
                  {isOnCooldown && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {Math.max(abilityCooldown, weaponCooldown)}
                    </Badge>
                  )}
                  {/* Reload badge */}
                  {isReloading && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500"
                    >
                      {reloadTurns}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold">{abilityName}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <span>Damage:</span>
                    <span>{ability.minDamage}-{ability.maxDamage}{totalShots > 1 && ` x${totalShots}`}</span>
                    <span>Offense:</span>
                    <span>{ability.offense}</span>
                    <span>Range:</span>
                    <span>{ability.minRange}-{ability.maxRange}</span>
                    <span>Line of Fire:</span>
                    <span>{LineOfFireLabels[ability.lineOfFire] || "Direct"}</span>
                    {ability.attackDirection === AttackDirection.Back && (
                      <>
                        <span>Direction:</span>
                        <span className="text-purple-400">Back Attack</span>
                      </>
                    )}
                    <span>Cooldown:</span>
                    <span>{ability.cooldown}{ability.globalCooldown > 0 && ` (global: ${ability.globalCooldown})`}</span>
                    {ability.chargeTime > 0 && (
                      <>
                        <span>Charge:</span>
                        <span>{ability.chargeTime}</span>
                      </>
                    )}
                    <span>Armor Pierce:</span>
                    <span>{Math.round(ability.armorPiercing * 100)}%</span>
                    <span>Crit:</span>
                    <span>{ability.critPercent}%</span>
                    {ability.suppressionMultiplier !== 1 && (
                      <>
                        <span>Suppression:</span>
                        <span>{ability.suppressionMultiplier}x {ability.suppressionBonus > 0 && `+${ability.suppressionBonus}`}</span>
                      </>
                    )}
                    {ability.isFixed && (
                      <>
                        <span>Pattern:</span>
                        <span className="text-amber-400">Fixed</span>
                      </>
                    )}
                    {ability.targetArea && !ability.isFixed && ability.targetArea.targetType === 2 && (
                      <>
                        <span>Pattern:</span>
                        <span>AOE ({ability.targetArea.data.length} tiles)</span>
                      </>
                    )}
                    {!isInfiniteAmmo && (
                      <>
                        <span>Ammo:</span>
                        <span>{ability.ammoRequired} per use | {currentAmmo}/{ability.weaponMaxAmmo}</span>
                      </>
                    )}
                    {ability.weaponReloadTime > 0 && (
                      <>
                        <span>Reload:</span>
                        <span>{ability.weaponReloadTime} turns</span>
                      </>
                    )}
                  </div>
                  
                  {/* Cooldown/reload status */}
                  {(isOnCooldown || isReloading || !hasEnoughAmmo) && (
                    <div className="pt-1 border-t space-y-0.5">
                      {isOnCooldown && (
                        <p className="text-yellow-500">
                          {weaponCooldown > 0 
                            ? `Weapon cooldown: ${weaponCooldown} turns`
                            : `On cooldown: ${abilityCooldown} turns`
                          }
                        </p>
                      )}
                      {isReloading && (
                        <p className="text-blue-500">
                          Reloading: {reloadTurns} turns
                        </p>
                      )}
                      {!hasEnoughAmmo && !isReloading && (
                        <p className="text-red-500">
                          Not enough ammo (needs {ability.ammoRequired})
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Detailed targeting breakdown */}
                  <div className="pt-1 border-t space-y-1">
                    <span className="text-muted-foreground font-medium">Targets:</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {getTargetingDetails(ability.targets).map(({ tag, label, canHit }) => (
                        <div key={tag} className="flex items-center gap-1.5">
                          {canHit ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          <span className={cn(
                            "text-[10px]",
                            canHit ? "text-foreground" : "text-muted-foreground line-through"
                          )}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {abilities.length === 0 && (
          <p className="text-sm text-muted-foreground">No abilities available</p>
        )}
      </div>
    </TooltipProvider>
  );
}