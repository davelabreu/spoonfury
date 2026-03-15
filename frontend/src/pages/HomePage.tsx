import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/types";

export function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/recipes/")
      .then(data => setRecipes(data.results || []))
      .catch(() => setError("Failed to load recipes. Try refreshing."));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Latest Recipes</h1>
      <div className="space-y-3">
        {recipes.map((r: Recipe) => (
          <RecipeCard key={r.slug} recipe={r} />
        ))}
        {recipes.length === 0 && (
          <p className="text-muted-foreground">No recipes yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
