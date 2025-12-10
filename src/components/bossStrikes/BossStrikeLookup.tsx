import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown } from "lucide-react";
import { BossStrikeViewer } from "./BossStrikeViewer";
import { getBossStrikeById, getAllBossStrikeIds, getBossStrikeName } from "@/lib/bossStrikes";
import { getBossStrikeBackgroundUrl } from "@/lib/bossStrikeImages";
import { getMissionIconUrl } from "@/lib/resourceImages";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function BossStrikeLookup() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBossStrikeId, setSelectedBossStrikeId] = useState<string | null>(null);
  const [isGridOpen, setIsGridOpen] = useState(true);

  const allBossStrikes = useMemo(() => {
    const ids = getAllBossStrikeIds();
    return ids.map(id => {
      const data = getBossStrikeById(id)!;
      const encounterName = getBossStrikeName(data);
      return { id, data, encounterName };
    });
  }, []);
  
  const filteredBossStrikes = useMemo(() => {
    if (!searchQuery) return allBossStrikes;
    const query = searchQuery.toLowerCase();
    return allBossStrikes.filter(bs => {
      const idMatch = bs.id.includes(query);
      const nameMatch = bs.encounterName && t(bs.encounterName).toLowerCase().includes(query);
      return idMatch || nameMatch;
    });
  }, [searchQuery, allBossStrikes, t]);

  const selectedBossStrike = selectedBossStrikeId ? getBossStrikeById(selectedBossStrikeId) : null;

  // When a boss strike is selected, collapse the grid
  const handleSelectBossStrike = (id: string) => {
    setSelectedBossStrikeId(id);
    setIsGridOpen(false);
  };

  // Get background image URL - try local first, then mission icon as fallback
  const getBackgroundImage = (id: string, missionIcon?: string): string | undefined => {
    const localUrl = getBossStrikeBackgroundUrl(id);
    if (localUrl) return localUrl;
    
    if (missionIcon) {
      return getMissionIconUrl(missionIcon);
    }
    
    return undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Collapsible open={isGridOpen} onOpenChange={setIsGridOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <ChevronDown className={cn("h-4 w-4 transition-transform", isGridOpen && "rotate-180")} />
          {isGridOpen ? "Hide" : "Show"} Boss Strikes ({filteredBossStrikes.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBossStrikes.map(({ id, data, encounterName }) => {
              const isSelected = selectedBossStrikeId === id;
              const displayName = encounterName ? t(encounterName) : null;
              const showName = displayName && displayName !== encounterName;
              
              const backgroundUrl = getBackgroundImage(id, data.mission_icon);
              
              return (
                <Card 
                  key={id}
                  className={cn(
                    "cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => handleSelectBossStrike(id)}
                >
                  <div 
                    className="h-28 bg-cover bg-center bg-muted relative"
                    style={backgroundUrl ? { 
                      backgroundImage: `url(${backgroundUrl})` 
                    } : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 text-xs"
                    >
                      #{id}
                    </Badge>
                    {data.tier_info && (
                      <Badge 
                        variant="outline" 
                        className="absolute top-2 right-2 text-xs bg-background/80"
                      >
                        {data.tier_info.length} Tiers
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">
                      {showName ? displayName : `Boss Strike #${id}`}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
            {filteredBossStrikes.length === 0 && (
              <p className="text-muted-foreground text-center py-4 col-span-full">
                No boss strikes found
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {selectedBossStrike && (
        <BossStrikeViewer bossStrike={selectedBossStrike} bossStrikeId={selectedBossStrikeId!} />
      )}
    </div>
  );
}
