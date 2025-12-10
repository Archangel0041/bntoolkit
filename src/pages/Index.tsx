import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { UnitFilters } from "@/components/units/UnitFilters";
import { UnitGrid } from "@/components/units/UnitGrid";
import { CompareBar } from "@/components/units/CompareBar";
import { allUnits, getAllTags, filterUnits } from "@/lib/units";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [nanopodFilter, setNanopodFilter] = useState<"all" | "nanopod" | "non-nanopod">("all");

  const allTags = useMemo(() => getAllTags(), []);

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

        <UnitGrid units={filteredUnits} />
      </main>
      <CompareBar />
    </div>
  );
};

export default Index;
