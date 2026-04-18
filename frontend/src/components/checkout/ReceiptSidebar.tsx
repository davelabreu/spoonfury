// frontend/src/components/checkout/ReceiptSidebar.tsx
import { getCategoryFallback } from "@/lib/categoryFallback";
import { getEstimatedPrice, calculateSummary } from "@/lib/pricing";
import { buildInstacartUrl } from "@/lib/instacart";
import { Button } from "@/components/ui/button";
import type { Fulfillment } from "@/lib/pricing";
import type { RecipeGroup } from "@/types";
import type { Ingredient } from "@/types";

interface ReceiptSidebarProps {
  groups: RecipeGroup[];
  fulfillment: Fulfillment;
  onFulfillmentChange: (f: Fulfillment) => void;
  brokenThumbs: Set<string>;
  onBrokenThumb: (slug: string) => void;
}

function itemToIngredient(item: { quantity: string; unit: string; name: string }, multiplier: number): Ingredient {
  const ing: Ingredient = { quantity: item.quantity, unit: item.unit, name: item.name, note: "" };
  if (multiplier > 1 && ing.quantity && !isNaN(Number(ing.quantity))) {
    return { ...ing, quantity: String(Number(ing.quantity) * multiplier) };
  }
  return ing;
}

export function ReceiptSidebar({ groups, fulfillment, onFulfillmentChange, brokenThumbs, onBrokenThumb }: ReceiptSidebarProps) {
  const recipeSubtotals = groups.map(g => ({
    slug: g.recipe_slug,
    title: g.recipe_title,
    multiplier: g.multiplier,
    subtotal: g.items.reduce((sum, item) => sum + getEstimatedPrice(item.name), 0) * g.multiplier,
  }));

  const summary = calculateSummary(recipeSubtotals, fulfillment);

  const uncheckedIngredients = groups.flatMap(g =>
    g.items.filter(i => !i.is_checked).map(i => itemToIngredient(i, g.multiplier))
  );

  const instacartUrl = buildInstacartUrl(uncheckedIngredients, fulfillment);

  return (
    <div className="space-y-4">
      {/* Fulfillment toggle */}
      <div className="flex justify-end">
        <div className="flex bg-muted rounded-lg p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFulfillmentChange("pickup")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
              fulfillment === "pickup" ? "bg-amber-500 text-black hover:bg-amber-500" : "text-muted-foreground"
            }`}
          >
            🚗 Pickup
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFulfillmentChange("delivery")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
              fulfillment === "delivery" ? "bg-amber-500 text-black hover:bg-amber-500" : "text-muted-foreground"
            }`}
          >
            🏠 Delivery
          </Button>
        </div>
      </div>

      {/* Mini recipe previews */}
      {groups.length > 0 && (
        <div className="flex gap-2">
          {groups.map(g => {
            const fb = getCategoryFallback(g.recipe_category ?? "other");
            return (
              <div key={g.recipe_slug} className="flex-1 h-14 rounded-lg overflow-hidden relative">
                {g.recipe_image_url && !brokenThumbs.has(g.recipe_slug) ? (
                  <img
                    src={g.recipe_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => onBrokenThumb(g.recipe_slug)}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${fb.gradient} flex items-center justify-center text-xl`}>
                    {fb.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white z-10">
                  {g.recipe_title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt summary */}
      <div className="bg-card border border-dashed border-border/50 rounded-lg p-4 font-mono text-sm">
        <div className="text-center font-bold text-amber-500 tracking-[0.15em] text-sm">SPOONFURY</div>
        <div className="text-center text-[9px] text-muted-foreground mb-2">ORDER SUMMARY</div>
        <div className="text-center text-muted-foreground/30 text-xs tracking-[0.2em] my-1">- - - - - - - - - - -</div>

        {recipeSubtotals.map(r => (
          <div key={r.slug} className="flex justify-between text-xs py-0.5">
            <span className="text-muted-foreground truncate">
              {r.title}{r.multiplier > 1 ? ` (x${r.multiplier})` : ""}
            </span>
            <span className="text-muted-foreground">${r.subtotal.toFixed(2)}</span>
          </div>
        ))}

        <div className="text-center text-muted-foreground/30 text-xs tracking-[0.2em] my-1">- - - - - - - - - - -</div>

        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${summary.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">Estimated tax</span>
          <span>${summary.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">{fulfillment === "pickup" ? "Pickup" : "Delivery"} fee</span>
          <span>${summary.fee.toFixed(2)}</span>
        </div>

        <div className="border-t-2 border-border mt-2 pt-2 flex justify-between text-base font-extrabold">
          <span>TOTAL</span>
          <span className="text-amber-500">${summary.total.toFixed(2)}</span>
        </div>

        <a
          href={instacartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-3 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-center text-black font-extrabold text-sm tracking-wide font-sans hover:brightness-110 transition"
        >
          Proceed to Instacart
        </a>
        <p className="text-center text-[10px] text-muted-foreground mt-1.5 font-sans">
          Prices are estimates. Final total on Instacart.
        </p>
      </div>
    </div>
  );
}
