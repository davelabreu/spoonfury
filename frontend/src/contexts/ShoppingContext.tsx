import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Ingredient, ShoppingListData } from "@/types";

interface ShoppingContextType {
  count: number;
  items: Ingredient[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export const SHOPPING_LIST_UPDATED = "shopping-list-updated";

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setCount(0);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const data: ShoppingListData = await api.get("/shopping-list/", token);
      setCount(data.total_items ?? 0);
      
      const unchecked: Ingredient[] = (data.items_by_recipe ?? [])
        .flatMap(g => g.items.filter(i => !i.is_checked))
        .map(i => ({
          quantity: i.quantity,
          unit: i.unit,
          name: i.name,
          note: i.note
        }));
      
      setItems(unchecked);
    } catch (err) {
      console.error("Failed to fetch shopping list:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load and listen for manual update events
  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener(SHOPPING_LIST_UPDATED, handleUpdate);
    return () => window.removeEventListener(SHOPPING_LIST_UPDATED, handleUpdate);
  }, [refresh]);

  return (
    <ShoppingContext.Provider value={{ count, items, loading, refresh }}>
      {children}
    </ShoppingContext.Provider>
  );
}

export function useShopping() {
  const context = useContext(ShoppingContext);
  if (context === undefined) {
    throw new Error("useShopping must be used within a ShoppingProvider");
  }
  return context;
}
