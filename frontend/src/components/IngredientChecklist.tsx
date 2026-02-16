import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildInstacartUrl } from "@/lib/instacart";

interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

export function IngredientChecklist({ ingredients }: { ingredients: Ingredient[] }) {
  const [checked, setChecked] = useState<Set<number>>(
    new Set(ingredients.map((_, i) => i)) // all checked by default
  );

  const toggle = (i: number) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const checkedIngredients = ingredients.filter((_, i) => checked.has(i));

  const openInstacart = () => {
    const url = buildInstacartUrl(checkedIngredients);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">Ingredients</h2>
      <p className="text-xs text-muted-foreground">Uncheck items you already have.</p>
      <ul className="space-y-2">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex items-center gap-3">
            <Checkbox
              id={`ing-${i}`}
              checked={checked.has(i)}
              onCheckedChange={() => toggle(i)}
            />
            <label
              htmlFor={`ing-${i}`}
              className={`text-sm cursor-pointer select-none ${!checked.has(i) ? "line-through text-muted-foreground" : ""}`}
            >
              <span className="font-medium">{ing.quantity} {ing.unit}</span> {ing.name}
              {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
            </label>
          </li>
        ))}
      </ul>
      <Separator />
      <Button
        onClick={openInstacart}
        disabled={checkedIngredients.length === 0}
        className="w-full"
        variant="outline"
      >
        🛒 Order {checkedIngredients.length} item{checkedIngredients.length !== 1 ? "s" : ""} on Instacart →
      </Button>
    </div>
  );
}
