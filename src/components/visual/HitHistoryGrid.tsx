import { useLayoutEffect, useRef, useState } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PAD_COLORS, PAD_NAMES, PAD_LABELS, type PadName } from "@/types";
import { cn } from "@/lib/utils";

const HISTORY_LENGTH = 20;

export function HitHistoryGrid() {
  const { triggers } = useDevice();
  // History is an array of "events", where each event is a list of pads hit simultaneously
  const [history, setHistory] = useState<PadName[][]>([]);
  const prevTriggersRef = useRef(triggers);

  useLayoutEffect(() => {
    const prev = prevTriggersRef.current;
    const current = triggers;
    
    const newHits: PadName[] = [];
    
    // Check all pads for rising edges
    for (const pad of PAD_NAMES) {
        if (current[pad] && !prev[pad]) {
            newHits.push(pad);
        }
    }
    
    if (newHits.length > 0) {
        setHistory(prevHist => {
            const nextHist = [...prevHist, newHits];
            // Keep only the last HISTORY_LENGTH items
            if (nextHist.length > HISTORY_LENGTH) {
                return nextHist.slice(nextHist.length - HISTORY_LENGTH);
            }
            return nextHist;
        });
    }

    prevTriggersRef.current = current;
  }, [triggers]);

  const clearHistory = () => setHistory([]);

  return (
    <Card className="border-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Input History</CardTitle>
        <Button variant="ghost" size="sm" onClick={clearHistory}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px] flex flex-col gap-2">
           {PAD_NAMES.map(padRow => (
             <div key={padRow} className="flex items-center gap-2">
               <div className="w-20 text-xs font-medium text-muted-foreground shrink-0">
                 {PAD_LABELS[padRow]}
               </div>
               <div className="flex-1 flex gap-1">
                 {Array.from({ length: HISTORY_LENGTH }).map((_, colIndex) => {
                   const hitEvent = history[colIndex];
                   const isActive = hitEvent?.includes(padRow);
                   
                   return (
                     <div 
                       key={colIndex}
                       className={cn(
                         "h-8 flex-1 rounded-sm border",
                         isActive ? "border-transparent shadow-sm" : "bg-muted/20 border-border"
                       )}
                       style={{
                         backgroundColor: isActive ? PAD_COLORS[padRow] : undefined,
                         opacity: isActive ? 1 : undefined,
                         transform: isActive ? "scale(0.95)" : "scale(1)"
                       }}
                     />
                   );
                 })}
               </div>
             </div>
           ))}
        </div>
      </CardContent>
    </Card>
  );
}
