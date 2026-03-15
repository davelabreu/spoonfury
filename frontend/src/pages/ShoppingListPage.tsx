import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildInstacartUrl } from "@/lib/instacart";
import { getIngredientEmoji } from "@/lib/ingredientEmoji";
import { getIngredientInfo } from "@/lib/ingredientInfo";
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

const TOOLTIP_CONTENT_CLASS =
  "max-w-sm p-0 text-pretty bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-lg rounded-xl overflow-hidden [&>svg]:bg-neutral-100 [&>svg]:fill-neutral-100 [&>svg]:size-4 [&>svg]:translate-y-[calc(-50%_-_1px)]";

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
      load();
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

  // ── Multiplier widget ─────────────────────────────────────────────────────
  function MultiplierWidget({ group }: { group: RecipeGroup }) {
    return (
      <div className="flex items-center border-2 border-amber-400 rounded-lg overflow-hidden shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => group.multiplier > 1
            ? updateMultiplier(group.recipe_slug, group.multiplier - 1)
            : removeRecipe(group.recipe_slug)}
          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors border-r-2 border-amber-400"
          aria-label={group.multiplier > 1
            ? `Decrease ${group.recipe_title} to ${group.multiplier - 1}`
            : `Remove ${group.recipe_title} from shopping list`}
        >
          {group.multiplier > 1 ? <Minus className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
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
    );
  }

  // ── ItemRow ───────────────────────────────────────────────────────────────
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

    const rawEmoji = getIngredientEmoji(item.name);
    const emoji = rawEmoji !== "🛒" ? rawEmoji : "";
    const info = getIngredientInfo(item.name);

    const qty = item.quantity
      ? (multiplier > 1 && !isNaN(Number(item.quantity))
          ? String(Number(item.quantity) * multiplier)
          : item.quantity)
      : "";

    const tooltipInner = info ? (
      <div className="flex">
        <div className="w-1 shrink-0 bg-indigo-400 rounded-l-xl" />
        <div className="px-3 py-2.5 space-y-1.5">
          <div>
            <p className="text-sm font-semibold">{emoji || "🛒"} {item.name}</p>
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
    ) : null;

    function WithTooltip({ children }: { children: React.ReactNode }) {
      if (!info) return <div className="flex-1">{children}</div>;
      return (
        <div className="flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0} className="cursor-default outline-none inline-flex">{children}</div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className={TOOLTIP_CONTENT_CLASS}>
              {tooltipInner}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    // Emoji tile stays full-opacity; only the text dims when checked
    const label = (
      <div className="flex flex-col min-w-0">
        <span className={`text-sm font-medium leading-tight ${item.is_checked ? "line-through text-muted-foreground opacity-60" : ""}`}>
          {qty && <span>{qty}{item.unit ? ` ${item.unit}` : ""} </span>}{titleCase(item.name)}
        </span>
        {item.note && <span className="text-xs text-muted-foreground mt-0.5">{item.note}</span>}
      </div>
    );

    return (
      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex items-center gap-3 py-2 px-1"
      >
        <input
          type="checkbox"
          checked={item.is_checked}
          onChange={() => toggleItem(item)}
          className="w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0"
          aria-label={`Mark ${item.name} as picked up`}
        />
        <div className={`w-10 h-10 flex items-center justify-center text-2xl shrink-0 rounded-2xl select-none transition-colors ${item.is_checked ? "bg-muted/30" : "bg-muted/50"}`}>
          {emoji || "🛒"}
        </div>
        <WithTooltip>{label}</WithTooltip>
        <button
          type="button"
          onClick={() => deleteItem(item)}
          className="trash-shake p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Guards ────────────────────────────────────────────────────────────────
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

  const isEmpty = data.total_items === 0;
  const groups = data.items_by_recipe;

  return (
    <div className="max-w-2xl mx-auto w-full min-h-full space-y-4 flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Shopping List</h1>
        {data.total_items > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {data.total_items} item{data.total_items !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Instacart checkout buttons ── */}
      {!isEmpty && uncheckedAll.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <a
              href={buildInstacartUrl(uncheckedAll, "pickup")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 relative overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 text-white font-semibold text-sm whitespace-nowrap before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:transition-[background-position_0s_ease] before:duration-1000 hover:before:bg-[position:-100%_0,0_0]"
            >
              🚗 Pickup · {uncheckedAll.length}
            </a>
            <a
              href={buildInstacartUrl(uncheckedAll, "delivery")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-green-700 via-green-500/80 to-green-700 [background-size:200%_auto] text-white font-semibold text-sm hover:[background-position:99%_center] transition-[background-position] duration-500"
            >
              🏠 Delivery
            </a>
          </div>
          <p className="text-xs text-center text-muted-foreground">via Instacart</p>
        </div>
      )}

      <div className="flex-1 space-y-6">
        {isEmpty ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🛒</p>
            <p className="text-muted-foreground font-medium">Your list is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Open a recipe and tap "Add to List" to get started.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <button type="button" onClick={() => setView("recipe")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "recipe" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                By Recipe
              </button>
              <button type="button" onClick={() => setView("all")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "all" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                All Items
              </button>
            </div>

            {view === "recipe" ? (
              <div className="space-y-6">
                {groups.map((group, idx) => (
                  <div key={group.recipe_slug} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <Link
                        to={`/recipes/${group.recipe_slug}`}
                        className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
                      >
                        {group.recipe_title}
                      </Link>
                      <MultiplierWidget group={group} />
                    </div>
                    <div className="space-y-1">
                      {group.items.map(item => <ItemRow key={item.id} item={item} multiplier={group.multiplier} />)}
                    </div>
                    {idx < groups.length - 1 && <Separator className="mt-4" />}
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

      {data.total_items > 0 && (
        <div className="flex justify-center py-2 mt-auto">
          <Button onClick={clearList} disabled={clearing} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            {clearing ? "Tossing…" : "🗑️ Start fresh"}
          </Button>
        </div>
      )}
    </div>
  );
}
