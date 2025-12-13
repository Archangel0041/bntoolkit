import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAbilityById } from "@/lib/abilities";
import { getAbilityImageUrl } from "@/lib/abilityImages";
import type { AbilityInfo } from "@/types/battleSimulator";

interface LiveAbilitySelectorProps {
  abilities: AbilityInfo[];
  selectedAbilityId: number | null;
  onSelectAbility: (abilityId: number) => void;
  cooldowns: Record<number, number>;
  globalCooldown: number;
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
  globalCooldown,
  weaponAmmo,
  weaponReloadCooldown,
  disabled,
  className,
}: LiveAbilitySelectorProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {abilities.map(ability => {
        const abilityData = getAbilityById(ability.abilityId);
        const abilityName = abilityData ? t(abilityData.name) : `Ability ${ability.abilityId}`;
        const iconUrl = abilityData ? getAbilityImageUrl(abilityData.icon) : undefined;
        
        const abilityCooldown = cooldowns[ability.abilityId] || 0;
        const isOnCooldown = abilityCooldown > 0 || globalCooldown > 0;
        const isSelected = selectedAbilityId === ability.abilityId;
        
        // Ammo check
        const currentAmmo = weaponAmmo?.[ability.weaponName] ?? ability.weaponMaxAmmo;
        const isInfiniteAmmo = ability.weaponMaxAmmo === -1;
        const hasEnoughAmmo = isInfiniteAmmo || currentAmmo >= ability.ammoRequired;
        const isReloading = (weaponReloadCooldown?.[ability.weaponName] ?? 0) > 0;
        const reloadTurns = weaponReloadCooldown?.[ability.weaponName] ?? 0;
        
        const isDisabled = disabled || isOnCooldown || !hasEnoughAmmo || isReloading;

        return (
          <TooltipProvider key={ability.abilityId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => onSelectAbility(ability.abilityId)}
                  className={cn(
                    "relative",
                    isDisabled && "opacity-50"
                  )}
                >
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt=""
                      className="w-4 h-4 mr-1.5"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <span className="truncate max-w-[100px]">{abilityName}</span>
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
                      {Math.max(abilityCooldown, globalCooldown)}
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
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{abilityName}</p>
                  <p className="text-sm">
                    Damage: {ability.minDamage}-{ability.maxDamage}
                  </p>
                  <p className="text-sm">
                    Range: {ability.minRange}-{ability.maxRange}
                  </p>
                  {ability.cooldown > 0 && (
                    <p className="text-sm">Cooldown: {ability.cooldown} turns</p>
                  )}
                  {!isInfiniteAmmo && (
                    <p className="text-sm">
                      Ammo: {ability.ammoRequired} per use | {currentAmmo}/{ability.weaponMaxAmmo} remaining
                    </p>
                  )}
                  {ability.weaponReloadTime > 0 && (
                    <p className="text-sm">Reload: {ability.weaponReloadTime} turns</p>
                  )}
                  {isOnCooldown && (
                    <p className="text-sm text-yellow-500">
                      {globalCooldown > 0 
                        ? `Global cooldown: ${globalCooldown} turns`
                        : `On cooldown: ${abilityCooldown} turns`
                      }
                    </p>
                  )}
                  {isReloading && (
                    <p className="text-sm text-blue-500">
                      Reloading: {reloadTurns} turns
                    </p>
                  )}
                  {!hasEnoughAmmo && !isReloading && (
                    <p className="text-sm text-red-500">
                      Not enough ammo (needs {ability.ammoRequired})
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {abilities.length === 0 && (
        <p className="text-sm text-muted-foreground">No abilities available</p>
      )}
    </div>
  );
}
