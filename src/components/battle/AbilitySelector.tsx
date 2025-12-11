import { cn } from "@/lib/utils";
import { getAbilityById } from "@/lib/abilities";
import { getAbilityImageUrl } from "@/lib/abilityImages";
import { getDamageTypeIconUrl } from "@/lib/damageImages";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { expandTargetTags } from "@/lib/tagHierarchy";
import type { AbilityInfo } from "@/types/battleSimulator";
import { LineOfFireLabels } from "@/types/battleSimulator";
import { AttackDirection } from "@/data/gameEnums";

// Main targeting categories
const TARGETING_CATEGORIES = {
  air: { tag: 39, label: "Air", color: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50" },
  ground: { tag: 24, label: "Ground", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50" },
  sea: { tag: 15, label: "Sea", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50" },
};

function getTargetingCategories(targets: number[]): { canTarget: string[]; cannotTarget: string[] } {
  if (targets.length === 0) {
    return { canTarget: ["Air", "Ground", "Sea"], cannotTarget: [] };
  }
  
  const expandedTargets = expandTargetTags(targets);
  const canTarget: string[] = [];
  const cannotTarget: string[] = [];
  
  if (targets.includes(51) || expandedTargets.includes(51)) {
    return { canTarget: ["Air", "Ground", "Sea"], cannotTarget: [] };
  }
  
  for (const [key, { tag, label }] of Object.entries(TARGETING_CATEGORIES)) {
    if (targets.includes(tag) || expandedTargets.includes(tag)) {
      canTarget.push(label);
    } else {
      cannotTarget.push(label);
    }
  }
  
  return { canTarget, cannotTarget };
}

interface AbilitySelectorProps {
  abilities: AbilityInfo[];
  selectedAbilityId: number | null;
  onSelectAbility: (abilityId: number) => void;
  className?: string;
}

export function AbilitySelector({
  abilities,
  selectedAbilityId,
  onSelectAbility,
  className,
}: AbilitySelectorProps) {
  const { t } = useLanguage();

  if (abilities.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground p-2", className)}>
        No abilities available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2 p-2", className)}>
        {abilities.map((info) => {
          const ability = getAbilityById(info.abilityId);
          if (!ability) return null;

          const iconUrl = getAbilityImageUrl(ability.icon);
          const dmgTypeIcon = getDamageTypeIconUrl(info.damageType);
          const isSelected = selectedAbilityId === info.abilityId;
          const totalShots = info.shotsPerAttack * info.attacksPerUse;

          return (
            <Tooltip key={info.abilityId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectAbility(info.abilityId)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-all",
                    "hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border bg-background"
                  )}
                >
                  {iconUrl && (
                    <img src={iconUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-medium truncate max-w-24">
                      {t(ability.name)}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {dmgTypeIcon && <img src={dmgTypeIcon} alt="" className="w-3 h-3" />}
                      <span>
                        {info.minDamage}-{info.maxDamage}
                        {totalShots > 1 && ` x${totalShots}`}
                      </span>
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold">{t(ability.name)}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <span>Damage:</span>
                    <span>{info.minDamage}-{info.maxDamage}{totalShots > 1 && ` x${totalShots}`}</span>
                    <span>Offense:</span>
                    <span>{info.offense}</span>
                    <span>Range:</span>
                    <span>{info.minRange}-{info.maxRange}</span>
                    <span>Line of Fire:</span>
                    <span>{LineOfFireLabels[info.lineOfFire] || "Direct"}</span>
                    {info.attackDirection === AttackDirection.Back && (
                      <>
                        <span>Direction:</span>
                        <span className="text-purple-400">Back Attack</span>
                      </>
                    )}
                    <span>Cooldown:</span>
                    <span>{info.cooldown}{info.globalCooldown > 0 && ` (global: ${info.globalCooldown})`}</span>
                    {info.chargeTime > 0 && (
                      <>
                        <span>Charge:</span>
                        <span>{info.chargeTime}</span>
                      </>
                    )}
                    <span>Armor Pierce:</span>
                    <span>{Math.round(info.armorPiercing * 100)}%</span>
                    <span>Crit:</span>
                    <span>{info.critPercent}%</span>
                    {info.suppressionMultiplier !== 1 && (
                      <>
                        <span>Suppression:</span>
                        <span>{info.suppressionMultiplier}x {info.suppressionBonus > 0 && `+${info.suppressionBonus}`}</span>
                      </>
                    )}
                    {info.isFixed && (
                      <>
                        <span>Pattern:</span>
                        <span className="text-amber-400">Fixed</span>
                      </>
                    )}
                    {info.targetArea && !info.isFixed && info.targetArea.targetType === 2 && (
                      <>
                        <span>Pattern:</span>
                        <span>AOE ({info.targetArea.data.length} tiles)</span>
                      </>
                    )}
                  </div>
                  
                  {/* Targeting categories */}
                  {(() => {
                    const { canTarget, cannotTarget } = getTargetingCategories(info.targets);
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t">
                        <span className="text-muted-foreground">Targets:</span>
                        {canTarget.map(cat => (
                          <Badge 
                            key={cat} 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              cat === "Air" && TARGETING_CATEGORIES.air.color,
                              cat === "Ground" && TARGETING_CATEGORIES.ground.color,
                              cat === "Sea" && TARGETING_CATEGORIES.sea.color
                            )}
                          >
                            ✓ {cat}
                          </Badge>
                        ))}
                        {cannotTarget.map(cat => (
                          <Badge 
                            key={cat} 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground line-through"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
