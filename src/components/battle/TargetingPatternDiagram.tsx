import { cn } from "@/lib/utils";
import type { TargetArea } from "@/types/battleSimulator";

interface TargetingPatternDiagramProps {
  targetArea: TargetArea;
  className?: string;
}

export function TargetingPatternDiagram({ targetArea, className }: TargetingPatternDiagramProps) {
  if (!targetArea || targetArea.targetType === 1) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-500/30 rounded-sm" />
        <span className="text-xs text-muted-foreground">Single Target</span>
      </div>
    );
  }

  // Calculate bounds of the pattern
  const positions = targetArea.data;
  if (positions.length === 0) return null;

  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  }

  // Always include center (0,0) in bounds
  minX = Math.min(minX, 0);
  maxX = Math.max(maxX, 0);
  minY = Math.min(minY, 0);
  maxY = Math.max(maxY, 0);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Create a grid of the pattern
  const grid: (number | null)[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = null;
    }
  }

  // Fill in the pattern positions
  for (const pos of positions) {
    const gridX = pos.x - minX;
    const gridY = pos.y - minY;
    grid[gridY][gridX] = pos.damagePercent || 100;
  }

  // Mark center
  const centerX = 0 - minX;
  const centerY = 0 - minY;

  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-xs text-muted-foreground">AOE Pattern:</span>
      <div 
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
      >
        {grid.map((row, y) =>
          row.map((dmgPercent, x) => {
            const isCenter = x === centerX && y === centerY;
            const hasValue = dmgPercent !== null;
            
            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "w-4 h-4 rounded-sm text-[6px] flex items-center justify-center font-bold",
                  isCenter && hasValue && "border-2 border-yellow-500 bg-yellow-500/40 text-yellow-200",
                  isCenter && !hasValue && "border-2 border-yellow-500 bg-yellow-500/40",
                  !isCenter && hasValue && "border border-orange-500/70 bg-orange-500/30 text-orange-200",
                  !isCenter && !hasValue && "border border-muted-foreground/20 bg-transparent"
                )}
              >
                {hasValue && dmgPercent !== 100 && dmgPercent}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 border border-yellow-500 bg-yellow-500/40 rounded-sm" />
          <span>Center</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 border border-orange-500/70 bg-orange-500/30 rounded-sm" />
          <span>Splash</span>
        </div>
      </div>
    </div>
  );
}
