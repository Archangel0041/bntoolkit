import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EncounterViewer } from "@/components/encounters/EncounterViewer";
import { getEncounterById } from "@/lib/encounters";
import { getTierEncountersByLevelRange, formatRewards, getBossStrikeName } from "@/lib/bossStrikes";
import { getEventRewardIconUrl, getMenuBackgroundUrl } from "@/lib/resourceImages";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BossStrike, TierInfo } from "@/types/bossStrike";

interface BossStrikeViewerProps {
  bossStrike: BossStrike;
  bossStrikeId: string | number;
}

export function BossStrikeViewer({ bossStrike, bossStrikeId }: BossStrikeViewerProps) {
  const { t } = useLanguage();
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("tiers");

  const tierCount = bossStrike.tier_info?.length ?? 0;
  const selectedEncounter = selectedEncounterId ? getEncounterById(selectedEncounterId) : null;
  
  const bossStrikeName = getBossStrikeName(bossStrike);
  const displayName = bossStrikeName ? t(bossStrikeName) : null;
  const showName = displayName && displayName !== bossStrikeName;

  return (
    <div className="space-y-6">
      {/* Header with background */}
      <Card className="overflow-hidden">
        {bossStrike.menu_background && (
          <div 
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${getMenuBackgroundUrl(bossStrike.menu_background)})` }}
          />
        )}
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>
              {showName ? displayName : `Boss Strike #${bossStrikeId}`}
            </CardTitle>
            <Badge variant="outline">#{bossStrikeId}</Badge>
            {tierCount > 0 && <Badge>{tierCount} Tiers</Badge>}
          </div>
          {bossStrike.default_progress_cost && (
            <p className="text-sm text-muted-foreground">
              Default: {bossStrike.default_progress_cost.awarded_points} points per battle
            </p>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tiers">Tier Rewards</TabsTrigger>
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="guild">Guild Weights</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="mt-4">
          <TierRewardsSection tierInfo={bossStrike.tier_info} />
        </TabsContent>

        <TabsContent value="encounters" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EncounterListSection 
              tierInfo={bossStrike.tier_info} 
              onSelectEncounter={setSelectedEncounterId}
              selectedEncounterId={selectedEncounterId}
            />
            <div>
              {selectedEncounter ? (
                <EncounterViewer encounter={selectedEncounter} encounterId={selectedEncounterId!} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select an encounter to view its grid
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guild" className="mt-4">
          <GuildWeightsSection guildWeights={bossStrike.guild_weights} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TierRewardsSection({ tierInfo }: { tierInfo?: TierInfo[] }) {
  if (!tierInfo || tierInfo.length === 0) {
    return <p className="text-muted-foreground">No tier information available</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tierInfo.map((tier, index) => {
        const rewards = formatRewards(tier.rewards);
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tier {index + 1}</CardTitle>
                <Badge variant="outline">{tier.required_completion_points.toLocaleString()} pts</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tier.reward_image && (
                <img 
                  src={getEventRewardIconUrl(tier.reward_image)} 
                  alt="Reward"
                  className="w-12 h-12 object-contain mx-auto"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="space-y-1">
                {rewards.map((reward, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="capitalize">{reward.key}</span>
                    <span className="font-medium">{reward.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {tier.tier_progress_cost && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{tier.tier_progress_cost.awarded_points} pts/battle
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EncounterListSection({ 
  tierInfo, 
  onSelectEncounter,
  selectedEncounterId 
}: { 
  tierInfo?: TierInfo[]; 
  onSelectEncounter: (id: number) => void;
  selectedEncounterId: number | null;
}) {
  // Group encounters by tier ranges: Tiers 1-5 and Tiers 6-10
  const { lowTierEncounters, highTierEncounters } = useMemo(() => {
    if (!tierInfo || tierInfo.length === 0) {
      return { lowTierEncounters: new Map(), highTierEncounters: new Map() };
    }
    
    const groupByLevel = (tiers: TierInfo[]) => {
      const grouped = new Map<string, Set<number>>();
      tiers.flatMap(tier => tier.encounters).forEach(enc => {
        const minLevel = enc.min_level ?? 1;
        const key = `${minLevel}-${enc.max_level}`;
        if (!grouped.has(key)) {
          grouped.set(key, new Set());
        }
        grouped.get(key)!.add(enc.encounter_id);
      });
      return grouped;
    };
    
    // Tiers 1-5 (index 0-4) and Tiers 6-10 (index 5-9)
    const lowTiers = tierInfo.slice(0, 5);
    const highTiers = tierInfo.slice(5, 10);
    
    return {
      lowTierEncounters: groupByLevel(lowTiers),
      highTierEncounters: groupByLevel(highTiers)
    };
  }, [tierInfo]);

  if (lowTierEncounters.size === 0 && highTierEncounters.size === 0) {
    return <p className="text-muted-foreground">No encounters available</p>;
  }

  const renderLevelGroup = (grouped: Map<string, Set<number>>, groupName: string) => {
    const sortedLevelRanges = Array.from(grouped.keys()).sort((a, b) => {
      const aMin = parseInt(a.split('-')[0]);
      const bMin = parseInt(b.split('-')[0]);
      return aMin - bMin;
    });

    if (sortedLevelRanges.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">{groupName}</h4>
        <Accordion type="multiple" defaultValue={sortedLevelRanges.slice(0, 2)}>
          {sortedLevelRanges.map(levelRange => {
            const encounterIds = Array.from(grouped.get(levelRange)!) as number[];
            const sortedIds = encounterIds.sort((a, b) => a - b);
            return (
              <AccordionItem key={levelRange} value={levelRange}>
                <AccordionTrigger className="text-sm">
                  Level {levelRange} ({sortedIds.length} encounters)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-1">
                    {sortedIds.map(encId => (
                      <Badge
                        key={encId}
                        variant={selectedEncounterId === encId ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => onSelectEncounter(encId)}
                      >
                        {encId}
                      </Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Encounters by Tier</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-6">
            {renderLevelGroup(lowTierEncounters, "Tiers 1-5")}
            {renderLevelGroup(highTierEncounters, "Tiers 6-10")}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function GuildWeightsSection({ guildWeights }: { guildWeights?: BossStrike["guild_weights"] }) {
  if (!guildWeights || guildWeights.length === 0) {
    return <p className="text-muted-foreground">No guild weight information available</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Guild Size Point Multipliers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guild Size</TableHead>
                <TableHead className="text-right">Multiplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guildWeights.map((weight, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {weight.min_guild_size === weight.max_guild_size 
                      ? weight.min_guild_size 
                      : `${weight.min_guild_size} - ${weight.max_guild_size}`}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {weight.percent}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
