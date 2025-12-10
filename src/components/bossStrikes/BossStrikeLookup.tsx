import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { BossStrikeViewer } from "./BossStrikeViewer";
import { getBossStrikeById, getAllBossStrikeIds, getBossStrikeName } from "@/lib/bossStrikes";
import { getMenuBackgroundUrl } from "@/lib/resourceImages";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function BossStrikeLookup() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBossStrikeId, setSelectedBossStrikeId] = useState<string | null>(null);

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

      <ScrollArea className="h-[200px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredBossStrikes.map(({ id, data, encounterName }) => {
            const isSelected = selectedBossStrikeId === id;
            const displayName = encounterName ? t(encounterName) : null;
            const showName = displayName && displayName !== encounterName;
            
            return (
              <Card 
                key={id}
                className={cn(
                  "cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedBossStrikeId(id)}
              >
                <div 
                  className="h-20 bg-cover bg-center bg-muted relative"
                  style={data.menu_background ? { 
                    backgroundImage: `url(${getMenuBackgroundUrl(data.menu_background)})` 
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
                <CardContent className="p-2">
                  <p className="text-xs font-medium truncate">
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
      </ScrollArea>

      {selectedBossStrike && (
        <BossStrikeViewer bossStrike={selectedBossStrike} bossStrikeId={selectedBossStrikeId!} />
      )}
    </div>
  );
}
