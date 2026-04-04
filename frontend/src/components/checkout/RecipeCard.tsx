import { Link } from "react-router-dom";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { getMockedRating, renderSpoonRating, getEstimatedPrice } from "@/lib/pricing";
import { ForkMultiplier } from "./ForkMultiplier";
import { IngredientRow } from "./IngredientRow";
import type { RecipeGroup, ShoppingItem } from "@/types";

interface RecipeCardProps {
  group: RecipeGroup;
  brokenThumbs: Set<string>;
  onBrokenThumb: (slug: string) => void;
  onUpdateMultiplier: (slug: string, multiplier: number) => void;
  onRemoveRecipe: (slug: string) => void;
  onDeleteItem: (item: ShoppingItem) => void;
  onToggleItem: (item: ShoppingItem) => void;
}

export function RecipeCard({
  group, brokenThumbs, onBrokenThumb,
  onUpdateMultiplier, onRemoveRecipe, onDeleteItem, onToggleItem,
}: RecipeCardProps) {
  const rating = getMockedRating(group.recipe_slug);
  const fb = getCategoryFallback(group.recipe_category ?? "other");

  const recipeSubtotal = group.items.reduce(
    (sum, item) => sum + getEstimatedPrice(item.name), 0
  ) * group.multiplier;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-dashed border-border/50">
        <Link to={`/recipes/${group.recipe_slug}`} className="shrink-0">
          {group.recipe_image_url && !brokenThumbs.has(group.recipe_slug) ? (
            <img
              src={group.recipe_image_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
              onError={() => onBrokenThumb(group.recipe_slug)}
            />
          ) : (
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br ${fb.gradient}`}>
              {fb.emoji}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/recipes/${group.recipe_slug}`} className="text-sm font-bold hover:underline">
            {group.recipe_title}
          </Link>
          <div className="text-xs text-amber-500">{renderSpoonRating(rating)}</div>
        </div>
        <ForkMultiplier
          multiplier={group.multiplier}
          onDecrement={() => group.multiplier > 1
            ? onUpdateMultiplier(group.recipe_slug, group.multiplier - 1)
            : onRemoveRecipe(group.recipe_slug)}
          onIncrement={() => onUpdateMultiplier(group.recipe_slug, group.multiplier + 1)}
          recipeTitle={group.recipe_title}
        />
      </div>

      {/* Ingredient rows */}
      <div>
        {group.items.map(item => (
          <IngredientRow
            key={item.id}
            item={item}
            multiplier={group.multiplier}
            onDelete={onDeleteItem}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      {/* Subtotal */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-dashed border-border/50 text-sm">
        <span className="text-muted-foreground">Recipe subtotal</span>
        <span className="font-semibold text-amber-500">${recipeSubtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
