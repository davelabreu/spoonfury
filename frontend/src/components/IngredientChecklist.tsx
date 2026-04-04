import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShoppingCart, Zap } from "lucide-react";
import type { Ingredient } from "@/types";
import { getIngredientEmoji } from "@/lib/ingredientEmoji";
import { getIngredientInfo } from "@/lib/ingredientInfo";

interface Props {
  ingredients: Ingredient[];
  inList?: boolean;
  onAddToList?: (needed: Ingredient[]) => void;
  onBuyNow?: (needed: Ingredient[]) => void;
  addBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

function IngredientRow({ ing, index, checked, onToggle }: {
  ing: Ingredient; index: number; checked: boolean; onToggle: () => void;
}) {
  const info = getIngredientInfo(ing.name);
  const emoji = ing.emoji || getIngredientEmoji(ing.name);

  const content = (
    <div className="flex items-center gap-3">
      <Checkbox
        id={`ing-${index}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <label
        htmlFor={`ing-${index}`}
        className={`text-sm cursor-pointer select-none flex items-center gap-2 ${checked ? "line-through text-muted-foreground" : ""}`}
      >
        <span className="text-2xl leading-none">{emoji}</span>
        <span>
          <span className="font-medium">{ing.quantity} {ing.unit}</span> {ing.name}
          {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
        </span>
      </label>
    </div>
  );

  if (!info) return <li>{content}</li>;

  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <div tabIndex={0} className="cursor-default outline-none inline-flex">{content}</div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={14}
          className="max-w-sm p-0 text-pretty bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-lg rounded-xl overflow-hidden [&>svg]:bg-neutral-100 [&>svg]:fill-neutral-100 [&>svg]:size-4 [&>svg]:translate-y-[calc(-50%_-_1px)]"
        >
          <div className="flex">
            <div className="w-1 shrink-0 bg-indigo-400 rounded-l-xl" />
            <div className="px-3 py-2.5 space-y-1.5">
              <div>
                <p className="text-sm font-semibold">{emoji} {ing.name}</p>
                <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">{info.description}</p>
              </div>
              {info.nutrition && (
                <p className="text-xs leading-snug">
                  <span className="font-semibold text-green-700">🌱 Health: </span>
                  <span className="text-neutral-700">{info.nutrition}</span>
                </p>
              )}
              {info.tip && (
                <p className="text-xs leading-snug">
                  <span className="font-semibold text-amber-600">✦ Tip: </span>
                  <span className="text-neutral-700">{info.tip}</span>
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

export function IngredientChecklist({ ingredients, inList, onAddToList, onBuyNow, addBtnRef }: Props) {
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
      <p className="text-xs text-muted-foreground">Tick ingredients you already have. Hover for tips.</p>
      <ul className="space-y-2">
        {valid.map((ing, i) => (
          <IngredientRow
            key={i}
            ing={ing}
            index={i}
            checked={haveAlready.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </ul>

      {(onAddToList || onBuyNow) && (
        <div className="flex gap-2 pt-1">
          {onAddToList && (
            <Button
              ref={addBtnRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={needed.length === 0 || inList}
              onClick={() => onAddToList(needed)}
              className="flex-1 relative overflow-hidden border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.55)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0]"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add {needed.length} to List
            </Button>
          )}
          {onBuyNow && (
            <Button
              type="button"
              size="sm"
              disabled={needed.length === 0}
              onClick={() => onBuyNow(needed)}
              className="flex-1 bg-[#1e4b33] hover:bg-[#153624] text-white border-0 font-semibold focus-visible:ring-[#1e4b33]/20 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Buy it NOW!
            </Button>
          )}
        </div>
      )}

      {inList && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          <Badge className="w-full justify-center gap-2 py-2 text-sm border-green-200 bg-green-600/10 text-green-700 hover:bg-green-600/10">
            <span className="size-1.5 rounded-full bg-green-600" aria-hidden="true" />
            🛍️❤️ In your shopping list
          </Badge>
        </div>
      )}
    </div>
  );
}
