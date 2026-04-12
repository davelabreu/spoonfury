import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Recipe } from "@/types";
import { DraggableRecipe } from "./DraggableRecipe";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function RecipeLibrary() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;

    api.get("/recipes/planner-library/", token)
      .then((data: Recipe[]) => setRecipes(data))
      .catch((err) => console.error("Failed to fetch library:", err))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-xl border border-muted-foreground/10 overflow-hidden">
      <div className="p-4 border-b bg-background/50">
        <h3 className="font-semibold text-sm mb-3">Recipe Library</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes..."
            className="pl-8 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground font-medium">Loading library...</p>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filteredRecipes.map((recipe) => (
              <DraggableRecipe key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-muted-foreground italic">
              {search ? "No recipes match your search." : "Your library is empty. Create some recipes first!"}
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t bg-background/50 text-[10px] text-muted-foreground text-center">
        Drag a recipe into the grid to plan it.
      </div>
    </div>
  );
}
