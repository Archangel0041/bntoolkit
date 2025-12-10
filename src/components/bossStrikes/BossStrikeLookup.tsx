import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { BossStrikeViewer } from "./BossStrikeViewer";
import { getBossStrikeById, getAllBossStrikeIds } from "@/lib/bossStrikes";

export function BossStrikeLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBossStrikeId, setSelectedBossStrikeId] = useState<string | null>(null);

  const allIds = useMemo(() => getAllBossStrikeIds(), []);
  
  const filteredIds = useMemo(() => {
    if (!searchQuery) return allIds;
    return allIds.filter(id => id.includes(searchQuery));
  }, [searchQuery, allIds]);

  const selectedBossStrike = selectedBossStrikeId ? getBossStrikeById(selectedBossStrikeId) : null;

  const handleSearch = () => {
    if (searchQuery && getBossStrikeById(searchQuery)) {
      setSelectedBossStrikeId(searchQuery);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Boss Strike</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="h-[150px] border rounded-md">
            <div className="p-2 flex flex-wrap gap-2">
              {filteredIds.map(id => (
                <Button
                  key={id}
                  variant={selectedBossStrikeId === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedBossStrikeId(id)}
                >
                  #{id}
                </Button>
              ))}
              {filteredIds.length === 0 && (
                <p className="text-muted-foreground text-center py-4 w-full">No boss strikes found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedBossStrike && (
        <BossStrikeViewer bossStrike={selectedBossStrike} bossStrikeId={selectedBossStrikeId!} />
      )}
    </div>
  );
}
