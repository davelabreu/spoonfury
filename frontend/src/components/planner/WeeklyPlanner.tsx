import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SHOPPING_LIST_UPDATED } from "@/contexts/ShoppingContext";
import type { WeeklyPlan, WeeklyPlanItem, Recipe } from "@/types";
import { Link } from "react-router-dom";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { RecipeLibrary } from "./RecipeLibrary";
import { DroppableDay } from "./DroppableDay";
import { X, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * WeeklyPlanner — Displays a 7-day grid of planned recipes.
 * Fetches data from GET /api/weekly-plan/
 * Handles drag-and-drop from RecipeLibrary to DroppableDay.
 */
export function WeeklyPlanner() {
  const { token } = useAuth();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const syncToCart = async () => {
    if (!token || !plan || plan.items.length === 0) return;

    setIsSyncing(true);
    try {
      const response = await api.post("/weekly-plan/sync-to-cart/", {}, token);
      toast.success(`Added ${response.added} items to your shopping list!`);
      
      // Dispatch event to update navbar cart capsule
      window.dispatchEvent(new CustomEvent(SHOPPING_LIST_UPDATED, {
        detail: { emojis: ["🛒", "🥗", "🥘", "🍅", "🥦"] }
      }));
    } catch (err) {
      console.error("Failed to sync to cart:", err);
      toast.error("Failed to sync items to your shopping list.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    // Fetch the weekly plan. The API returns a single object (OneToOne with User).
    api.get("/weekly-plan/", token)
      .then((data: WeeklyPlan) => setPlan(data))
      .catch((err) => {
        console.error("Failed to fetch weekly plan:", err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!token || !over || !plan) return;

    // We only care if something is dropped onto a day
    const dayData = over.data.current;
    if (!dayData || typeof dayData.dayIndex !== "number") return;

    const dayIndex = dayData.dayIndex;
    const recipe = active.data.current?.recipe as Recipe;

    if (!recipe) return;

    try {
      // Optimistic update
      const tempId = Math.floor(Math.random() * -1000);
      const newItem: WeeklyPlanItem = {
        id: tempId,
        day: dayIndex,
        order: (itemsByDay[dayIndex]?.length || 0),
        recipe: recipe
      };

      setPlan({
        ...plan,
        items: [...plan.items, newItem]
      });

      // API call
      const response = await api.post("/weekly-plan/add-recipe/", {
        recipe_slug: recipe.slug,
        day: dayIndex
      }, token);

      // Replace temp item with real one from response
      setPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => item.id === tempId ? response : item)
        };
      });
    } catch (err) {
      console.error("Failed to add recipe to plan:", err);
      // Rollback on error
      api.get("/weekly-plan/", token).then(data => setPlan(data));
    }
  };

  const removeItem = async (itemId: number) => {
    if (!token || !plan) return;

    try {
      // Optimistic update
      setPlan({
        ...plan,
        items: plan.items.filter(item => item.id !== itemId)
      });

      await api.post("/weekly-plan/remove-item/", { item_id: itemId }, token);
    } catch (err) {
      console.error("Failed to remove item:", err);
      // Rollback
      api.get("/weekly-plan/", token).then(data => setPlan(data));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground animate-pulse">Loading your plan…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
        <p className="text-muted-foreground">Couldn't load your plan. Try refreshing?</p>
      </div>
    );
  }

  // Group items by day (0=Monday, 6=Sunday)
  const itemsByDay: Record<number, WeeklyPlanItem[]> = {};
  plan.items.forEach(item => {
    if (!itemsByDay[item.day]) {
      itemsByDay[item.day] = [];
    }
    itemsByDay[item.day].push(item);
  });

  // Sort items within each day by their 'order' field
  Object.values(itemsByDay).forEach(dayItems => {
    dayItems.sort((a, b) => a.order - b.order);
  });

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Weekly Schedule</h2>
              <p className="text-xs text-muted-foreground">
                Plan your meals for the week. Drag recipes from your library onto the days below.
              </p>
            </div>
            {plan.updated_at && (
              <span className="text-[10px] text-muted-foreground">
                Last updated: {new Date(plan.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={syncToCart}
              disabled={isSyncing || !plan || plan.items.length === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                ${isSyncing || !plan || plan.items.length === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none border-2 border-black"
                }
              `}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              🛒 Commit to Cart
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {DAYS.map((dayName, index) => (
              <DroppableDay 
                key={dayName} 
                dayIndex={index} 
                dayName={dayName}
                isEmpty={!itemsByDay[index] || itemsByDay[index].length === 0}
              >
                {(itemsByDay[index] || []).map(item => (
                  <div
                    key={item.id}
                    className="group relative bg-background border rounded-md p-2 shadow-sm hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all"
                  >
                    <Link
                      to={`/recipes/${item.recipe.slug}`}
                      className="block pr-4"
                    >
                      <div className="font-medium text-[11px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.recipe.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground truncate uppercase tracking-tighter">
                          {item.recipe.category.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </DroppableDay>
            ))}
          </div>
        </div>

        <aside className="w-full lg:w-72 xl:w-80 shrink-0 h-[600px] lg:h-auto lg:max-h-[800px] sticky top-6">
          <RecipeLibrary />
        </aside>
      </div>
    </DndContext>
  );
}
