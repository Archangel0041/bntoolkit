import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sword, Shield, Skull, Zap, Wind, Target } from "lucide-react";
import type { BattleAction, BattleTurn } from "@/types/liveBattle";

interface BattleLogProps {
  turns: BattleTurn[];
  currentTurn: number;
  className?: string;
}

function ActionIcon({ type }: { type: BattleAction["type"] }) {
  switch (type) {
    case "attack":
      return <Sword className="h-3 w-3 text-red-500" />;
    case "dodge":
      return <Wind className="h-3 w-3 text-blue-400" />;
    case "crit":
      return <Target className="h-3 w-3 text-yellow-500" />;
    case "death":
      return <Skull className="h-3 w-3 text-red-600" />;
    case "status_applied":
    case "status_tick":
      return <Zap className="h-3 w-3 text-purple-500" />;
    case "skip":
      return <Shield className="h-3 w-3 text-gray-400" />;
    default:
      return null;
  }
}

export function BattleLog({ turns, currentTurn, className }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new turns are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  return (
    <div className={cn("border rounded-lg", className)}>
      <div className="p-2 border-b bg-muted/50">
        <h3 className="text-sm font-semibold">Battle Log</h3>
      </div>
      <ScrollArea className="h-[200px]" ref={scrollRef}>
        <div className="p-2 space-y-2">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Battle not started
            </p>
          ) : (
            turns.map((turn, turnIndex) => (
              <div
                key={turnIndex}
                className={cn(
                  "space-y-1",
                  turn.turnNumber === currentTurn && "bg-primary/10 -mx-2 px-2 py-1 rounded"
                )}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    turn.isPlayerTurn ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                  )}>
                    Turn {turn.turnNumber}
                  </span>
                  <span className="text-muted-foreground">
                    {turn.isPlayerTurn ? "Player" : "Enemy"}
                  </span>
                </div>
                <div className="space-y-0.5 ml-2">
                  {turn.actions.map((action, actionIndex) => (
                    <div
                      key={actionIndex}
                      className="flex items-start gap-1.5 text-xs"
                    >
                      <ActionIcon type={action.type} />
                      <span className="text-muted-foreground">
                        {action.abilityName && (
                          <span className="font-medium text-foreground">
                            {action.abilityName}:{" "}
                          </span>
                        )}
                        {action.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
