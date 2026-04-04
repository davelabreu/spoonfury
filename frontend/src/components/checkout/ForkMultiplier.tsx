import { Minus, Trash2, Plus } from "lucide-react";

interface ForkMultiplierProps {
  multiplier: number;
  onDecrement: () => void;
  onIncrement: () => void;
  recipeTitle: string;
}

export function ForkMultiplier({ multiplier, onDecrement, onIncrement, recipeTitle }: ForkMultiplierProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg overflow-hidden shrink-0">
      <button
        type="button"
        onClick={onDecrement}
        className="px-2 py-1.5 hover:bg-muted-foreground/10 transition-colors"
        aria-label={multiplier > 1
          ? `Decrease ${recipeTitle} to ${multiplier - 1}`
          : `Remove ${recipeTitle} from shopping list`}
      >
        {multiplier > 1
          ? <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
      </button>
      <span className="px-2 py-1.5 text-sm font-bold text-amber-500 min-w-[3rem] text-center select-none">
        🍴 {multiplier}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className="px-2 py-1.5 hover:bg-muted-foreground/10 transition-colors"
        aria-label={`Increase ${recipeTitle} to ${multiplier + 1}`}
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
