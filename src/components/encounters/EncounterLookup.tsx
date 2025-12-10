import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { EncounterViewer } from "./EncounterViewer";
import { getEncounterById, getAllEncounterIds } from "@/lib/encounters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

export function EncounterLookup() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  const allEncounters = useMemo(() => {
    const ids = getAllEncounterIds();
    return ids.map(id => {
      const encounter = getEncounterById(id);
      return { id, encounter };
    });
  }, []);
  
  const filteredEncounters = useMemo(() => {
    const encounters = searchQuery ? allEncounters : allEncounters.slice(0, 100);
    if (!searchQuery) return encounters;
    
    const query = searchQuery.toLowerCase();
    return allEncounters.filter(({ id, encounter }) => {
      const idMatch = id.includes(query);
      const nameMatch = encounter?.name && t(encounter.name).toLowerCase().includes(query);
      return idMatch || nameMatch;
    });
  }, [searchQuery, allEncounters, t]);

  const selectedEncounter = selectedEncounterId ? getEncounterById(selectedEncounterId) : null;

  const handleSearch = () => {
    if (searchQuery && getEncounterById(searchQuery)) {
      setSelectedEncounterId(searchQuery);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Encounter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="h-[400px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredEncounters.map(({ id, encounter }) => {
                const encounterName = encounter?.name ? t(encounter.name) : null;
                const displayName = encounterName && encounterName !== encounter?.name ? encounterName : null;
                
                return (
                  <Button
                    key={id}
                    variant={selectedEncounterId === id ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm h-auto py-2"
                    onClick={() => setSelectedEncounterId(id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate">{displayName || `Encounter ${id}`}</span>
                      <Badge variant="outline" className="text-xs shrink-0">#{id}</Badge>
                      {encounter?.level && (
                        <Badge variant="secondary" className="text-xs shrink-0">Lv. {encounter.level}</Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
              {filteredEncounters.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No encounters found</p>
              )}
              {!searchQuery && filteredEncounters.length === 100 && (
                <p className="text-muted-foreground text-center text-xs py-2">
                  Showing first 100 • Search to find more
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div>
        {selectedEncounter ? (
          <EncounterViewer encounter={selectedEncounter} encounterId={selectedEncounterId!} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select an encounter to view its grid layout
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
