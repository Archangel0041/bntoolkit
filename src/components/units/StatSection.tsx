import { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDamageResistanceIconUrl } from "@/lib/damageImages";

interface StatSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function StatSection({ title, icon, children, defaultOpen = false }: StatSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </div>
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border border-t-0 rounded-b-lg bg-card">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface StatRowProps {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

export function StatRow({ label, value, highlight }: StatRowProps) {
  return (
    <div className={cn("flex justify-between py-1", highlight && "font-medium text-primary")}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface DamageModsGridProps {
  mods: { cold?: number; crushing?: number; explosive?: number; fire?: number; piercing?: number };
  title: string;
}

export function DamageModsGrid({ mods, title }: DamageModsGridProps) {
  const elements: Array<{ key: keyof typeof mods; label: string }> = [
    { key: "cold", label: "Cold" },
    { key: "crushing", label: "Crushing" },
    { key: "explosive", label: "Explosive" },
    { key: "fire", label: "Fire" },
    { key: "piercing", label: "Piercing" },
  ];
  
  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <div className="grid grid-cols-5 gap-2 text-center text-sm">
        {elements.map(({ key, label }) => {
          const value = mods[key];
          const isResistant = value !== undefined && value < 1;
          const isVulnerable = value !== undefined && value > 1;
          const iconUrl = getDamageResistanceIconUrl(key, isResistant, isVulnerable);
          
          return (
            <div key={key} className="space-y-1">
              <div className="flex flex-col items-center gap-1">
                {iconUrl && (
                  <img 
                    src={iconUrl} 
                    alt={label} 
                    className="h-8 w-8 object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span className="text-muted-foreground text-xs">{label}</span>
              </div>
              <div className={cn(
                "font-medium",
                isResistant && "text-green-600 dark:text-green-400",
                isVulnerable && "text-destructive"
              )}>
                {value !== undefined ? `${(value * 100).toFixed(0)}%` : "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
