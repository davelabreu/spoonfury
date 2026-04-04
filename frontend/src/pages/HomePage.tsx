import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RecipeCard } from "@/components/RecipeCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Recipe } from "@/types";

/**
 * HomePage — The public "Stir the Pot" feed.
 *
 * Two sections for authenticated users:
 *   1. Needs Your Vote 🗳️ — in_review recipes awaiting community votes
 *   2. Perfected recipes ✅ — the standard published feed
 *
 * Unauthenticated users only see the published feed.
 */
export function HomePage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inReviewRecipes, setInReviewRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/recipes/")
      .then(data => setRecipes(data.results || []))
      .catch(() => setError("Failed to load recipes. Try refreshing."));
  }, []);

  useEffect(() => {
    if (!token) return;
    api.get("/recipes/?status=in_review", token)
      .then(data => setInReviewRecipes(data.results || []))
      .catch(() => {});
  }, [token]);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Stir the Pot</h1>
      <p className="text-sm text-muted-foreground mb-6">Perfected recipes from the community</p>

      {/* Needs Your Vote — only shown to logged-in users */}
      {token && inReviewRecipes.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold">🗳️ Needs Your Vote</h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {inReviewRecipes.length} under review
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            These recipes are in community review — cast your vote to help them go live.
          </p>
          <div className="space-y-3 mb-6">
            {inReviewRecipes.map((r: Recipe) => (
              <RecipeCard key={r.slug} recipe={r} />
            ))}
          </div>
          <Separator className="mb-6" />
        </>
      )}

      {/* Published feed */}
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
