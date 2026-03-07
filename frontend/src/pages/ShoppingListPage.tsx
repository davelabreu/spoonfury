import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BuyNowSheet } from "@/components/BuyNowSheet";
import { Trash2 } from "lucide-react";
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
  items: ShoppingItem[];
}

interface ShoppingListData {
  total_items: number;
  items_by_recipe: RecipeGroup[];
}

function itemToIngredient(item: ShoppingItem): Ingredient {
  return { quantity: item.quantity, unit: item.unit, name: item.name, note: item.note };
}

export function ShoppingListPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"recipe" | "all">("recipe");
  const [buyNowIngredients, setBuyNowIngredients] = useState<Ingredient[] | null>(null);
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
  const uncheckedAll = allItems.filter(i => !i.is_checked).map(itemToIngredient);

  function ItemRow({ item }: { item: ShoppingItem }) {
    return (
      <div className={`flex items-center gap-3 py-2 group ${item.is_checked ? "opacity-50" : ""}`}>
        <input
          type="checkbox"
          checked={item.is_checked}
          onChange={() => toggleItem(item)}
          className="w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0"
          aria-label={`Mark ${item.name} as picked up`}
        />
        <span className={`flex-1 text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
          {item.quantity && <span className="font-medium">{item.quantity}{item.unit && ` ${item.unit}`} </span>}
          {item.name}
          {item.note && <span className="text-muted-foreground ml-1">({item.note})</span>}
        </span>
        <button
          type="button"
          onClick={() => deleteItem(item)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
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
              {data.items_by_recipe.map(group => {
                const unchecked = group.items.filter(i => !i.is_checked).map(itemToIngredient);
                return (
                  <div key={group.recipe_slug} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Link
                        to={`/recipes/${group.recipe_slug}`}
                        className="font-semibold text-sm hover:underline underline-offset-4"
                      >
                        {group.recipe_title}
                      </Link>
                      {unchecked.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBuyNowIngredients(unchecked)}
                          className="shrink-0 text-xs border-green-200 text-green-700 hover:bg-green-50"
                        >
                          🛒 Buy it NOW!
                        </Button>
                      )}
                    </div>
                    {group.items.map(item => <ItemRow key={item.id} item={item} />)}
                    <Separator className="mt-4" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {allItems.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          )}
        </>
      )}

      {/* Sticky footer */}
      {data.total_items > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 py-3 flex items-center gap-3 justify-between">
          <Button
            onClick={clearList}
            disabled={clearing}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            {clearing ? "Clearing…" : "Clear list"}
          </Button>
          {uncheckedAll.length > 0 && (
            <Button
              onClick={() => setBuyNowIngredients(uncheckedAll)}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              🛒 Buy it ALL NOW!
            </Button>
          )}
        </div>
      )}

      {buyNowIngredients && (
        <BuyNowSheet
          ingredients={buyNowIngredients}
          onClose={() => setBuyNowIngredients(null)}
        />
      )}
    </div>
  );
}
