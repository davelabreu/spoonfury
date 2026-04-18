import { Minus, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForkMultiplierProps {
  multiplier: number;
  onDecrement: () => void;
  onIncrement: () => void;
  recipeTitle: string;
}

export function ForkMultiplier({ multiplier, onDecrement, onIncrement, recipeTitle }: ForkMultiplierProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg overflow-hidden shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none hover:bg-muted-foreground/10"
        onClick={onDecrement}
        aria-label={multiplier > 1
          ? `Decrease ${recipeTitle} to ${multiplier - 1}`
          : `Remove ${recipeTitle} from shopping list`}
      >
        {multiplier > 1
          ? <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
      </Button>
      <span className="px-2 py-1.5 text-sm font-bold text-amber-500 min-w-[3rem] text-center select-none">
        🍴 {multiplier}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none hover:bg-muted-foreground/10"
        onClick={onIncrement}
        aria-label={`Increase ${recipeTitle} to ${multiplier + 1}`}
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
