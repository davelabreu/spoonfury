import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DroppableDayProps {
  dayIndex: number;
  dayName: string;
  children: ReactNode;
  isEmpty: boolean;
}

export function DroppableDay({ dayIndex, dayName, children, isEmpty }: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayIndex}`,
    data: {
      dayIndex,
    },
  });

  return (
    <div key={dayName} className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 px-1">
        {dayName}
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 min-h-[150px] bg-muted/20 rounded-lg p-2 border-2 border-transparent transition-all",
          isOver && "bg-primary/5 border-primary/20 border-dashed scale-[1.02] shadow-sm",
          !isOver && "hover:border-muted/50"
        )}
      >
        {children}
        
        {isEmpty && !isOver && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <span className="text-[10px] italic">Empty</span>
          </div>
        )}

        {isOver && (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-primary/30 rounded bg-primary/5 animate-pulse">
            <span className="text-[10px] text-primary font-medium">Drop to add!</span>
          </div>
        )}
      </div>
    </div>
  );
}
