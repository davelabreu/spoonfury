import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Ingredient } from "@/types";

interface Props {
  ingredients: Ingredient[];
  inList?: boolean;
  onAddToList?: (needed: Ingredient[]) => void;
  onBuyNow?: (needed: Ingredient[]) => void;
}

export function IngredientChecklist({ ingredients, inList, onAddToList, onBuyNow }: Props) {
  const valid = ingredients.filter(i => i.name.trim() !== "");

  // checked = "I already have this" — start empty (assume you need everything)
  const [haveAlready, setHaveAlready] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setHaveAlready(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });

  const needed = valid.filter((_, i) => !haveAlready.has(i));

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">Ingredients</h2>
      <p className="text-xs text-muted-foreground">Tick ingredients you already have.</p>
      <ul className="space-y-2">
        {valid.map((ing, i) => (
          <li key={i} className="flex items-center gap-3">
            <Checkbox
              id={`ing-${i}`}
              checked={haveAlready.has(i)}
              onCheckedChange={() => toggle(i)}
            />
            <label
              htmlFor={`ing-${i}`}
              className={`text-sm cursor-pointer select-none ${haveAlready.has(i) ? "line-through text-muted-foreground" : ""}`}
            >
              <span className="font-medium">{ing.quantity} {ing.unit}</span> {ing.name}
              {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
            </label>
          </li>
        ))}
      </ul>

      {(onAddToList || onBuyNow) && (
        <div className="flex gap-2 pt-1">
          {onAddToList && (
            <button
              type="button"
              disabled={needed.length === 0 || inList}
              onClick={() => onAddToList(needed)}
              className="flex-1 text-sm border border-indigo-200 rounded-md px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + Add {needed.length} to Shopping List
            </button>
          )}
          {onBuyNow && (
            <button
              type="button"
              disabled={needed.length === 0}
              onClick={() => onBuyNow(needed)}
              className="flex-1 text-sm border border-amber-200 rounded-md px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              🛒 Buy it NOW!
            </button>
          )}
        </div>
      )}

      {inList && (
        <div className="flex items-center gap-2 w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-1">
          <span className="text-base">🛍️❤️</span>
          In your shopping list
        </div>
      )}
    </div>
  );
}
