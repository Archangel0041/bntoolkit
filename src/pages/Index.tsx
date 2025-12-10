import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { UnitFilters } from "@/components/units/UnitFilters";
import { UnitGrid } from "@/components/units/UnitGrid";
import { CompareBar } from "@/components/units/CompareBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allUnits, getAllTags, filterUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const Index = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [nanopodFilter, setNanopodFilter] = useState<"all" | "nanopod" | "non-nanopod">("all");

  const allTags = useMemo(() => getAllTags(), []);

  // Check for unusual sides on mount
  useEffect(() => {
    const unusualUnits = allUnits.filter(u => u.identity.side !== 1 && u.identity.side !== 2);
    if (unusualUnits.length > 0) {
      const sides = [...new Set(unusualUnits.map(u => u.identity.side))];
      toast.warning(`Found ${unusualUnits.length} units with unusual sides: ${sides.join(", ")}`, {
        duration: 10000,
      });
      console.log("Units with unusual sides:", unusualUnits.map(u => ({ id: u.id, name: u.identity.name, side: u.identity.side })));
    }
  }, []);

  const filteredUnits = useMemo(() => {
    let units = filterUnits(allUnits, searchQuery, selectedTags, null, t);
    
    // Apply nanopod filter
    if (nanopodFilter === "nanopod") {
      units = units.filter(u => u.requirements?.cost?.nanopods && u.requirements.cost.nanopods > 0);
    } else if (nanopodFilter === "non-nanopod") {
      units = units.filter(u => !u.requirements?.cost?.nanopods || u.requirements.cost.nanopods === 0);
    }
    
    return units;
  }, [searchQuery, selectedTags, nanopodFilter, t]);

  const friendlyUnits = useMemo(() => filteredUnits.filter(u => u.identity.side === 1), [filteredUnits]);
  const enemyUnits = useMemo(() => filteredUnits.filter(u => u.identity.side === 2), [filteredUnits]);
  const otherUnits = useMemo(() => filteredUnits.filter(u => u.identity.side !== 1 && u.identity.side !== 2), [filteredUnits]);

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
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="friendly">
              Friendly Units ({friendlyUnits.length})
            </TabsTrigger>
            <TabsTrigger value="enemy">
              Enemy Units ({enemyUnits.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friendly" className="mt-6">
            <UnitGrid units={friendlyUnits} />
          </TabsContent>
          <TabsContent value="enemy" className="mt-6">
            <UnitGrid units={enemyUnits} />
          </TabsContent>
        </Tabs>

        {otherUnits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Other Units (Side: Unknown)</h2>
            <UnitGrid units={otherUnits} />
          </div>
        )}
      </main>
      <CompareBar />
    </div>
  );
};

export default Index;
