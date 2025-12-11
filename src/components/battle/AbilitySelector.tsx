import { cn } from "@/lib/utils";
import { getAbilityById, getLineOfFireLabel } from "@/lib/abilities";
import { getAbilityImageUrl } from "@/lib/abilityImages";
import { getDamageTypeIconUrl } from "@/lib/damageImages";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { AbilityInfo } from "@/types/battleSimulator";

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
          const lofLabel = getLineOfFireLabel(info.lineOfFire);
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
                    {lofLabel && (
                      <>
                        <span>Line of Fire:</span>
                        <span>{lofLabel}</span>
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
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
