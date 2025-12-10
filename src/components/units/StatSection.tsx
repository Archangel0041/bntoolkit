import { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const elements = ["cold", "crushing", "explosive", "fire", "piercing"];
  
  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <div className="grid grid-cols-5 gap-2 text-center text-sm">
        {elements.map((elem) => (
          <div key={elem} className="space-y-1">
            <div className="text-muted-foreground capitalize">{elem}</div>
            <div className={cn(
              "font-medium",
              mods[elem] !== undefined && mods[elem] < 1 && "text-green-600 dark:text-green-400",
              mods[elem] !== undefined && mods[elem] > 1 && "text-destructive"
            )}>
              {mods[elem] !== undefined ? `${(mods[elem] * 100).toFixed(0)}%` : "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
