import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { UnitFilters } from "@/components/units/UnitFilters";
import { UnitGrid } from "@/components/units/UnitGrid";
import { CompareBar } from "@/components/units/CompareBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allUnits, getAllTags, filterUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";

const SIDE_LABELS: Record<number, string> = {
  1: "Friendly",
  2: "Enemy",
  3: "Unknown",
  4: "Cast (NPCs)",
  5: "Bosses",
  6: "Test",
};

const Index = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [nanopodFilter, setNanopodFilter] = useState<"all" | "nanopod" | "non-nanopod">("all");

  const allTags = useMemo(() => getAllTags(), []);

  const filteredUnits = useMemo(() => {
    let units = filterUnits(allUnits, searchQuery, selectedTags, null, t);
    
    if (nanopodFilter === "nanopod") {
      units = units.filter(u => u.requirements?.cost?.nanopods && u.requirements.cost.nanopods > 0);
    } else if (nanopodFilter === "non-nanopod") {
      units = units.filter(u => !u.requirements?.cost?.nanopods || u.requirements.cost.nanopods === 0);
    }
    
    return units;
  }, [searchQuery, selectedTags, nanopodFilter, t]);

  const unitsBySide = useMemo(() => ({
    friendly: filteredUnits.filter(u => u.identity.side === 1),
    enemy: filteredUnits.filter(u => u.identity.side === 2),
    unknown: filteredUnits.filter(u => u.identity.side === 3),
    cast: filteredUnits.filter(u => u.identity.side === 4),
    bosses: filteredUnits.filter(u => u.identity.side === 5),
    test: filteredUnits.filter(u => u.identity.side === 6),
  }), [filteredUnits]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Battle Unit Database</h1>
          <p className="text-muted-foreground">
            Browse and explore {allUnits.length} battle units. Click any card to view details.
          </p>
        </div>

        <UnitFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          allTags={allTags}
          nanopodFilter={nanopodFilter}
          setNanopodFilter={setNanopodFilter}
        />

        <div className="text-sm text-muted-foreground">
          Showing {filteredUnits.length} of {allUnits.length} units
        </div>

        <Tabs defaultValue="friendly" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="friendly">
              Friendly ({unitsBySide.friendly.length})
            </TabsTrigger>
            <TabsTrigger value="enemy">
              Enemy ({unitsBySide.enemy.length})
            </TabsTrigger>
            {unitsBySide.bosses.length > 0 && (
              <TabsTrigger value="bosses">
                Bosses ({unitsBySide.bosses.length})
              </TabsTrigger>
            )}
            {unitsBySide.cast.length > 0 && (
              <TabsTrigger value="cast">
                Cast/NPCs ({unitsBySide.cast.length})
              </TabsTrigger>
            )}
            {unitsBySide.unknown.length > 0 && (
              <TabsTrigger value="unknown">
                Unknown ({unitsBySide.unknown.length})
              </TabsTrigger>
            )}
            {unitsBySide.test.length > 0 && (
              <TabsTrigger value="test">
                Test ({unitsBySide.test.length})
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="friendly" className="mt-6">
            <UnitGrid units={unitsBySide.friendly} />
          </TabsContent>
          <TabsContent value="enemy" className="mt-6">
            <UnitGrid units={unitsBySide.enemy} />
          </TabsContent>
          <TabsContent value="bosses" className="mt-6">
            <UnitGrid units={unitsBySide.bosses} />
          </TabsContent>
          <TabsContent value="cast" className="mt-6">
            <UnitGrid units={unitsBySide.cast} />
          </TabsContent>
          <TabsContent value="unknown" className="mt-6">
            <UnitGrid units={unitsBySide.unknown} />
          </TabsContent>
          <TabsContent value="test" className="mt-6">
            <UnitGrid units={unitsBySide.test} />
          </TabsContent>
        </Tabs>
      </main>
      <CompareBar />
    </div>
  );
};

export default Index;
