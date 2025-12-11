import { cn } from "@/lib/utils";
import { getAbilityById } from "@/lib/abilities";
import { getAbilityImageUrl } from "@/lib/abilityImages";
import { getDamageTypeIconUrl } from "@/lib/damageImages";
import { useLanguage } from "@/contexts/LanguageContext";
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
    <div className={cn("flex flex-wrap gap-2 p-2", className)}>
      {abilities.map((info) => {
        const ability = getAbilityById(info.abilityId);
        if (!ability) return null;

        const iconUrl = getAbilityImageUrl(ability.icon);
        const dmgTypeIcon = getDamageTypeIconUrl(info.damageType);
        const isSelected = selectedAbilityId === info.abilityId;

        return (
          <button
            key={info.abilityId}
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
                  {info.shotsPerAttack > 1 && ` x${info.shotsPerAttack}`}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
