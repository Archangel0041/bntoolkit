import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { CompareBar } from "@/components/units/CompareBar";
import { StatSection, StatRow, DamageModsGrid } from "@/components/units/StatSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUnitById } from "@/lib/units";
import { getAbilityById } from "@/lib/abilities";
import { getStatusEffectDisplayName, getStatusEffectColor } from "@/lib/statusEffects";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { 
  ArrowLeft, Heart, Zap, Shield, Target, Eye, Swords, 
  Clock, Coins, Wrench, Plus, Check, Activity
} from "lucide-react";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);
  
  return parts.join(" ") || "0s";
}

export default function UnitDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { addToCompare, removeFromCompare, isInCompare, compareUnits } = useCompare();

  const unit = getUnitById(parseInt(id || "0"));

  if (!unit) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Unit Not Found</h1>
          <p className="text-muted-foreground mb-6">The unit with ID {id} does not exist.</p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Units
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const allStats = unit.statsConfig?.stats || [];
  const maxRank = allStats.length;
  const [selectedRank, setSelectedRank] = useState(maxRank);
  
  const stats = allStats[selectedRank - 1];
  const inCompare = isInCompare(unit.id);
  const canAddToCompare = compareUnits.length < 2;

  const handleCompareClick = () => {
    if (inCompare) {
      removeFromCompare(unit.id);
    } else if (canAddToCompare) {
      addToCompare(unit);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{t(unit.identity.name)}</h1>
            <p className="text-muted-foreground">ID: {unit.id}</p>
          </div>
          {maxRank > 1 && (
            <Select value={selectedRank.toString()} onValueChange={(v) => setSelectedRank(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxRank }, (_, i) => i + 1).map((rank) => (
                  <SelectItem key={rank} value={rank.toString()}>
                    Rank {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant={inCompare ? "default" : "outline"}
            onClick={handleCompareClick}
            disabled={!inCompare && !canAddToCompare}
            className="gap-2"
          >
            {inCompare ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {inCompare ? "In Compare" : "Add to Compare"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {unit.identity.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              #{tag}
            </Badge>
          ))}
        </div>

        <p className="text-muted-foreground">{t(unit.identity.description)}</p>

        <div className="space-y-4">
          {/* Main Stats */}
          {stats && (
            <StatSection title="Main Stats" icon={<Activity className="h-4 w-4" />} defaultOpen>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatRow label="HP" value={<span className="flex items-center gap-1"><Heart className="h-4 w-4 text-destructive" />{stats.hp}</span>} />
                <StatRow label="Power" value={<span className="flex items-center gap-1"><Zap className="h-4 w-4 text-yellow-500" />{stats.power}</span>} />
                <StatRow label="PV" value={<span className="flex items-center gap-1"><Shield className="h-4 w-4 text-blue-500" />{stats.pv}</span>} />
                <StatRow label="Accuracy" value={<span className="flex items-center gap-1"><Target className="h-4 w-4" />{stats.accuracy}</span>} />
                <StatRow label="Defense" value={stats.defense} />
                <StatRow label="Dodge" value={<span className="flex items-center gap-1"><Eye className="h-4 w-4" />{stats.dodge}</span>} />
                <StatRow label="Bravery" value={stats.bravery} />
                <StatRow label="Critical" value={`${stats.critical}%`} />
                <StatRow label="Ability Slots" value={stats.ability_slots} />
                {stats.armor_hp && <StatRow label="Armor HP" value={stats.armor_hp} />}
              </div>
              {unit.statsConfig?.size && (
                <div className="mt-4 pt-4 border-t">
                  <StatRow label="Size" value={unit.statsConfig.size} />
                  <StatRow label="Preferred Row" value={unit.statsConfig.preferred_row} />
                </div>
              )}
            </StatSection>
          )}

          {/* Damage & Armor */}
          {stats && (stats.damage_mods || stats.armor_damage_mods) && (
            <StatSection title="Damage & Armor Modifiers" icon={<Swords className="h-4 w-4" />} defaultOpen>
              <div className="space-y-4">
                {stats.damage_mods && (
                  <DamageModsGrid mods={stats.damage_mods} title="Damage Resistance" />
                )}
                {stats.armor_damage_mods && (
                  <DamageModsGrid mods={stats.armor_damage_mods} title="Armor Damage Mods" />
                )}
              </div>
            </StatSection>
          )}

          {/* Status Immunities */}
          {unit.statsConfig?.status_effect_immunities && unit.statsConfig.status_effect_immunities.length > 0 && (
            <StatSection title="Status Effect Immunities" icon={<Shield className="h-4 w-4" />} defaultOpen>
              <div className="flex flex-wrap gap-2">
                {unit.statsConfig.status_effect_immunities.map((immunityId) => {
                  const displayName = getStatusEffectDisplayName(immunityId);
                  const color = getStatusEffectColor(immunityId);
                  return (
                    <Badge 
                      key={immunityId} 
                      variant="outline"
                      className="border-2"
                      style={{ borderColor: color, color }}
                    >
                      {t(displayName)}
                    </Badge>
                  );
                })}
              </div>
            </StatSection>
          )}

          {/* Abilities */}
          {unit.weapons && Object.keys(unit.weapons.weapons).length > 0 && (
            <StatSection title="Abilities" icon={<Swords className="h-4 w-4" />} defaultOpen>
              <div className="space-y-4">
                {Object.entries(unit.weapons.weapons).flatMap(([weaponKey, weapon]) =>
                  weapon.abilities.map((abilId) => {
                    const ability = getAbilityById(abilId);
                    if (!ability) return null;
                    return (
                      <div key={`${weaponKey}-${abilId}`} className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">{t(ability.name)}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          <StatRow label="Attack" value={ability.stats.attack} />
                          <StatRow label="Crit %" value={`${ability.stats.critical_hit_percent}%`} />
                          <StatRow label="Cooldown" value={ability.stats.ability_cooldown} />
                          <StatRow label="Ammo Required" value={ability.stats.ammo_required} />
                          <StatRow label="Range" value={`${ability.stats.min_range}-${ability.stats.max_range}`} />
                          <StatRow label="Shots" value={ability.stats.shots_per_attack} />
                          {ability.stats.armor_piercing_percent > 0 && (
                            <StatRow label="Armor Pierce" value={`${ability.stats.armor_piercing_percent}%`} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </StatSection>
          )}

          {/* Requirements */}
          {unit.requirements && (
            <StatSection title="Build Requirements" icon={<Coins className="h-4 w-4" />} defaultOpen>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(unit.requirements.cost).map(([resource, amount]) => (
                  <StatRow key={resource} label={resource} value={amount.toLocaleString()} />
                ))}
                <StatRow 
                  label="Build Time" 
                  value={<span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDuration(unit.requirements.build_time)}</span>} 
                />
              </div>
            </StatSection>
          )}

          {/* Healing */}
          {unit.healing && (
            <StatSection title="Healing" icon={<Wrench className="h-4 w-4" />} defaultOpen>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(unit.healing.heal_cost).map(([resource, amount]) => (
                  <StatRow key={resource} label={resource} value={amount.toLocaleString()} />
                ))}
                <StatRow 
                  label="Heal Time" 
                  value={<span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDuration(unit.healing.heal_time)}</span>} 
                />
              </div>
            </StatSection>
          )}
        </div>
      </main>
      <CompareBar />
    </div>
  );
}
