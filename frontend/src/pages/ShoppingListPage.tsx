import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildInstacartUrl } from "@/lib/instacart";
import { Trash2, Plus, Minus } from "lucide-react";
import type { Ingredient } from "@/types";

interface ShoppingItem {
  id: number;
  recipe_title: string;
  recipe_slug: string;
  name: string;
  quantity: string;
  unit: string;
  note: string;
  is_checked: boolean;
}

interface RecipeGroup {
  recipe_slug: string;
  recipe_title: string;
  multiplier: number;
  items: ShoppingItem[];
}

interface ShoppingListData {
  total_items: number;
  items_by_recipe: RecipeGroup[];
}

function itemToIngredient(item: ShoppingItem): Ingredient {
  return { quantity: item.quantity, unit: item.unit, name: item.name, note: item.note };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

const ingredientEmoji: Record<string, string> = {
  egg: "🥚", eggs: "🥚", salt: "🧂", pepper: "🌶️", butter: "🧈",
  milk: "🥛", cheese: "🧀", garlic: "🧄", onion: "🧅", tomato: "🍅",
  lemon: "🍋", chicken: "🍗", beef: "🥩", rice: "🍚", bread: "🍞",
  pasta: "🍝", olive: "🫒", carrot: "🥕", potato: "🥔", corn: "🌽",
  mushroom: "🍄", mushrooms: "🍄", avocado: "🥑", honey: "🍯",
  chocolate: "🍫", sugar: "🍬", water: "💧", oil: "🫒", flour: "🌾",
  shrimp: "🦐", fish: "🐟", salmon: "🐟", bacon: "🥓", apple: "🍎",
  banana: "🍌", strawberry: "🍓", blueberry: "🫐", peach: "🍑",
  peanut: "🥜", coconut: "🥥", broccoli: "🥦", cucumber: "🥒",
  "coca cola": "🥤", soda: "🥤", wine: "🍷", beer: "🍺", coffee: "☕", tea: "🍵",
};

export function ShoppingListPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"recipe" | "all">("recipe");
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.get("/shopping-list/", token);
      setData(d);
    } catch {
      setError("Failed to load shopping list.");
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (item: ShoppingItem) => {
    if (!token) return;
    const optimistic = !item.is_checked;
    setData(prev => prev ? {
      ...prev,
      items_by_recipe: prev.items_by_recipe.map(g => ({
        ...g,
        items: g.items.map(i => i.id === item.id ? { ...i, is_checked: optimistic } : i),
      })),
    } : prev);
    try {
      await api.patch(`/shopping-list/items/${item.id}/`, { is_checked: optimistic }, token);
    } catch {
      load(); // revert on error
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    if (!token) return;
    setData(prev => prev ? {
      ...prev,
      total_items: prev.total_items - 1,
      items_by_recipe: prev.items_by_recipe
        .map(g => ({ ...g, items: g.items.filter(i => i.id !== item.id) }))
        .filter(g => g.items.length > 0),
    } : prev);
    try {
      await api.delete(`/shopping-list/items/${item.id}/`, token);
      window.dispatchEvent(new Event("shopping-list-updated"));
    } catch {
      load();
    }
  };

  const removeRecipe = async (recipeSlug: string) => {
    if (!token) return;
    const group = data?.items_by_recipe.find(g => g.recipe_slug === recipeSlug);
    const count = group?.items.length ?? 0;
    setData(prev => prev ? {
      ...prev,
      total_items: prev.total_items - count,
      items_by_recipe: prev.items_by_recipe.filter(g => g.recipe_slug !== recipeSlug),
    } : prev);
    try {
      await api.post("/shopping-list/remove-recipe/", { recipe_slug: recipeSlug }, token);
      window.dispatchEvent(new Event("shopping-list-updated"));
    } catch {
      load();
    }
  };

  const updateMultiplier = async (recipeSlug: string, newMultiplier: number) => {
    if (!token || newMultiplier < 1) return;
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      items_by_recipe: prev.items_by_recipe.map(g =>
        g.recipe_slug === recipeSlug ? { ...g, multiplier: newMultiplier } : g
      ),
    } : prev);
    try {
      await api.patch("/shopping-list/multiplier/", { recipe_slug: recipeSlug, multiplier: newMultiplier }, token);
    } catch {
      load();
    }
  };

  const clearList = async () => {
    if (!token) return;
    setClearing(true);
    try {
      await api.post("/shopping-list/clear/", {}, token);
      setData(prev => prev ? { ...prev, total_items: 0, items_by_recipe: [] } : prev);
      window.dispatchEvent(new Event("shopping-list-updated"));
    } catch {
      setError("Failed to clear list.");
    } finally {
      setClearing(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to use your shopping list.</p>
        <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="link" onClick={load} className="mt-2 p-0">Try again</Button>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  const allItems = data.items_by_recipe.flatMap(g => g.items);
  const uncheckedAll = data.items_by_recipe.flatMap(g =>
    g.items.filter(i => !i.is_checked).map(i => {
      const ing = itemToIngredient(i);
      if (g.multiplier > 1 && ing.quantity && !isNaN(Number(ing.quantity))) {
        return { ...ing, quantity: String(Number(ing.quantity) * g.multiplier) };
      }
      return ing;
    })
  );

  function ItemRow({ item, multiplier = 1 }: { item: ShoppingItem; multiplier?: number }) {
    const rowRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const swiping = useRef(false);

    const onTouchStart = (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      currentX.current = 0;
      swiping.current = true;
    };

    const onTouchMove = (e: React.TouchEvent) => {
      if (!swiping.current || !rowRef.current) return;
      const dx = e.touches[0].clientX - startX.current;
      currentX.current = Math.min(0, dx);
      rowRef.current.style.transform = `translateX(${currentX.current}px)`;
      rowRef.current.style.transition = "none";
      // Show red tint proportional to swipe distance
      const progress = Math.min(1, Math.abs(currentX.current) / 80);
      rowRef.current.style.backgroundColor = `rgba(239, 68, 68, ${progress * 0.15})`;
    };

    const onTouchEnd = () => {
      if (!swiping.current || !rowRef.current) return;
      swiping.current = false;
      rowRef.current.style.transition = "transform 0.2s ease-out, background-color 0.2s ease-out";
      if (currentX.current < -80) {
        rowRef.current.style.transform = "translateX(-100%)";
        rowRef.current.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
        setTimeout(() => deleteItem(item), 200);
      } else {
        rowRef.current.style.transform = "translateX(0)";
        rowRef.current.style.backgroundColor = "";
      }
    };

    const nameLower = item.name.toLowerCase();
    const emoji = ingredientEmoji[nameLower] || Object.entries(ingredientEmoji).find(([k]) => nameLower.includes(k))?.[1] || "";

    return (
      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`flex items-center gap-3 py-2.5 px-1 ${item.is_checked ? "opacity-50" : ""}`}
      >
          <input
            type="checkbox"
            checked={item.is_checked}
            onChange={() => toggleItem(item)}
            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0 mt-px"
            aria-label={`Mark ${item.name} as picked up`}
          />
          <span className={`flex-1 text-sm leading-5 ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
            {emoji && <span className="mr-1">{emoji}</span>}
            {item.quantity && <span className="font-medium">{
              multiplier > 1 && !isNaN(Number(item.quantity))
                ? String(Number(item.quantity) * multiplier)
                : item.quantity
            }{item.unit && ` ${item.unit}`} </span>}
            {titleCase(item.name)}
            {item.note && <span className="text-muted-foreground ml-1">({item.note})</span>}
          </span>
          <button
            type="button"
            onClick={() => deleteItem(item)}
            className="trash-shake p-1.5 rounded text-muted-foreground transition-colors"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
      </div>
    );
  }

  return (
    <div className="min-h-full max-w-2xl mx-auto space-y-4 flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Shopping List</h1>
          {data.total_items > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {data.total_items} item{data.total_items !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Checkout buttons */}
      {uncheckedAll.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <a
              href={buildInstacartUrl(uncheckedAll, "pickup")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors whitespace-nowrap"
            >
              🚗 Pickup · {uncheckedAll.length}
            </a>
            <a
              href={buildInstacartUrl(uncheckedAll, "delivery")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold text-sm transition-colors"
            >
              🏠 Delivery
            </a>
          </div>
          <p className="text-xs text-center text-muted-foreground">via Instacart</p>
        </div>
      )}

      <div className="flex-1 space-y-6">
      {data.total_items === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🛒</p>
          <p className="text-muted-foreground font-medium">Your list is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Open a recipe and tap "Add to List" to get started.
          </p>
        </div>
      ) : (
        <>
          {/* View toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setView("recipe")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "recipe" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              By Recipe
            </button>
            <button
              type="button"
              onClick={() => setView("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "all" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              All Items
            </button>
          </div>

          {view === "recipe" ? (
            <div className="space-y-6">
              {data.items_by_recipe.map(group => (
                  <div key={group.recipe_slug} className="space-y-1">
                    {/* Recipe header with quantity widget */}
                    <div className="flex items-center justify-between gap-3 mb-2 bg-muted/60 rounded-lg px-3 py-2">
                      <Link
                        to={`/recipes/${group.recipe_slug}`}
                        className="font-bold text-sm hover:underline underline-offset-4 flex-1"
                      >
                        {group.recipe_title}
                      </Link>
                      <div className="flex items-center border-2 border-amber-400 rounded-lg overflow-hidden shrink-0 shadow-sm">
                        <button
                          type="button"
                          onClick={() => group.multiplier > 1
                            ? updateMultiplier(group.recipe_slug, group.multiplier - 1)
                            : removeRecipe(group.recipe_slug)
                          }
                          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors border-r-2 border-amber-400"
                          aria-label={group.multiplier > 1
                            ? `Decrease ${group.recipe_title} to ${group.multiplier - 1}`
                            : `Remove ${group.recipe_title} from shopping list`
                          }
                        >
                          {group.multiplier > 1
                            ? <Minus className="w-3.5 h-3.5" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                        <span className="px-3 py-1.5 text-sm font-bold text-amber-900 bg-white min-w-[2rem] text-center">
                          {group.multiplier}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateMultiplier(group.recipe_slug, group.multiplier + 1)}
                          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors border-l-2 border-amber-400"
                          aria-label={`Increase ${group.recipe_title} to ${group.multiplier + 1}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {group.items.map(item => <ItemRow key={item.id} item={item} multiplier={group.multiplier} />)}
                    <Separator className="mt-4" />
                  </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {allItems.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          )}
        </>
      )}
      </div>

      {/* Clear list */}
      {data.total_items > 0 && (
        <div className="flex justify-center py-2 mt-auto">
          <Button
            onClick={clearList}
            disabled={clearing}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            {clearing ? "Tossing…" : "🗑️ Start fresh"}
          </Button>
        </div>
      )}

    </div>
  );
}
