import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { EncounterViewer } from "./EncounterViewer";
import { getEncounterById, getAllEncounterIds } from "@/lib/encounters";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EncounterLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  const allIds = useMemo(() => getAllEncounterIds(), []);
  
  const filteredIds = useMemo(() => {
    if (!searchQuery) return allIds.slice(0, 100); // Show first 100 by default
    return allIds.filter(id => id.includes(searchQuery));
  }, [searchQuery, allIds]);

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
              placeholder="Enter encounter ID..."
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
              {filteredIds.map(id => (
                <Button
                  key={id}
                  variant={selectedEncounterId === id ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedEncounterId(id)}
                >
                  Encounter {id}
                </Button>
              ))}
              {filteredIds.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No encounters found</p>
              )}
              {!searchQuery && filteredIds.length === 100 && (
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
