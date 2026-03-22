// frontend/src/pages/ShoppingListPage.tsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SHOPPING_LIST_UPDATED } from "@/contexts/ShoppingContext";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/checkout/RecipeCard";
import { ReceiptSidebar } from "@/components/checkout/ReceiptSidebar";
import type { Fulfillment } from "@/lib/pricing";
import type { ShoppingItem, ShoppingListData } from "@/types";

export function ShoppingListPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");

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
      window.dispatchEvent(new Event(SHOPPING_LIST_UPDATED));
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
      window.dispatchEvent(new Event(SHOPPING_LIST_UPDATED));
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
      window.dispatchEvent(new CustomEvent(SHOPPING_LIST_UPDATED, { detail: { cleared: true } }));
    } catch {
      setError("Failed to clear list.");
    } finally {
      setClearing(false);
    }
  };

  const handleBrokenThumb = (slug: string) => {
    setBrokenThumbs(prev => new Set(prev).add(slug));
  };

  // ── Guards ──
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

  const isEmpty = data.total_items === 0;
  const groups = data.items_by_recipe;

  if (isEmpty) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-16">
        <p className="text-4xl mb-4">🛒</p>
        <p className="text-muted-foreground font-medium">Your cart is empty</p>
        <p className="text-sm text-muted-foreground mt-1">Open a recipe and tap "Add to List" to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">
          Your Cart{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {groups.length} recipe{groups.length !== 1 ? "s" : ""}, {data.total_items} item{data.total_items !== 1 ? "s" : ""}
          </span>
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        {/* Left: Recipe cards */}
        <div className="space-y-4">
          {groups.map(group => (
            <RecipeCard
              key={group.recipe_slug}
              group={group}
              brokenThumbs={brokenThumbs}
              onBrokenThumb={handleBrokenThumb}
              onUpdateMultiplier={updateMultiplier}
              onRemoveRecipe={removeRecipe}
              onDeleteItem={deleteItem}
              onToggleItem={toggleItem}
            />
          ))}

          {/* Clear all */}
          <div className="flex justify-center py-2">
            <Button onClick={clearList} disabled={clearing} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              {clearing ? "Clearing…" : "🗑️ Start fresh"}
            </Button>
          </div>
        </div>

        {/* Right: Receipt sidebar */}
        <div className="md:sticky md:top-20 md:self-start">
          <ReceiptSidebar
            groups={groups}
            fulfillment={fulfillment}
            onFulfillmentChange={setFulfillment}
            brokenThumbs={brokenThumbs}
            onBrokenThumb={handleBrokenThumb}
          />
        </div>
      </div>
    </div>
  );
}
