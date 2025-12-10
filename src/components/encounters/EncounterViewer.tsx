import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EncounterGrid } from "./EncounterGrid";
import { getEncounterWaves } from "@/lib/encounters";
import type { Encounter } from "@/types/encounters";
import { useLanguage } from "@/contexts/LanguageContext";

interface EncounterViewerProps {
  encounter: Encounter;
  encounterId: string | number;
}

export function EncounterViewer({ encounter, encounterId }: EncounterViewerProps) {
  const { t } = useLanguage();
  const waves = getEncounterWaves(encounter);
  const [activeWave, setActiveWave] = useState("0");

  const encounterName = encounter.name ? t(encounter.name) : `Encounter ${encounterId}`;
  const displayName = encounterName !== encounter.name ? encounterName : `Encounter ${encounterId}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{displayName}</CardTitle>
          <Badge variant="outline">ID: {encounterId}</Badge>
          {encounter.level && <Badge variant="secondary">Lv. {encounter.level}</Badge>}
          {waves.length > 1 && <Badge>{waves.length} Waves</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {waves.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No units in this encounter</p>
        ) : waves.length === 1 ? (
          <EncounterGrid 
            units={waves[0]} 
            showPlayerUnits={encounter.player_units}
          />
        ) : (
          <Tabs value={activeWave} onValueChange={setActiveWave}>
            <TabsList className="mb-4">
              {waves.map((_, index) => (
                <TabsTrigger key={index} value={String(index)}>
                  Wave {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {waves.map((waveUnits, index) => (
              <TabsContent key={index} value={String(index)}>
                <EncounterGrid 
                  units={waveUnits} 
                  showPlayerUnits={index === 0 ? encounter.player_units : undefined}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
