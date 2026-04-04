import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RecipeCard } from "@/components/RecipeCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe } from "@/types";

function UnderReviewCard({ recipes }: { recipes: Recipe[] }) {
  return (
    <Card className="border-indigo-200 bg-indigo-50/40 sticky top-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
          🗳️ Recipes under review
          <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
            {recipes.length}
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-indigo-500 mt-0.5">Cast your vote to help them go live</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {recipes.slice(0, 5).map(r => {
          const fallback = getCategoryFallback(r.category);
          return (
            <Link
              key={r.slug}
              to={`/recipes/${r.slug}`}
              className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-indigo-100/60 transition-colors group"
            >
              {/* Tiny image / emoji placeholder */}
              <div className="w-9 h-9 shrink-0 rounded-md overflow-hidden">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
                    <span className="text-base">{fallback.emoji}</span>
                  </div>
                )}
              </div>
              {/* Title + author */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-indigo-900 group-hover:underline">
                  {r.title}
                </p>
                <p className="text-[10px] text-indigo-400">@{r.author_username}</p>
              </div>
              <span className="text-[10px] text-indigo-400 shrink-0">→</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

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

  const showSidebar = token && inReviewRecipes.length > 0;

  return (
    <div className={showSidebar ? "flex gap-6 items-start" : ""}>
      {/* Main feed */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold mb-1">Stir the Pot</h1>
        <p className="text-sm text-muted-foreground mb-6">Perfected recipes from the community</p>
        <div className="space-y-3">
          {recipes.map((r: Recipe) => (
            <RecipeCard key={r.slug} recipe={r} />
          ))}
          {recipes.length === 0 && (
            <p className="text-muted-foreground">No recipes yet. Be the first!</p>
          )}
        </div>
      </div>

      {/* Sidebar — only shown when there are in_review recipes */}
      {showSidebar && (
        <div className="w-64 shrink-0 hidden sm:block">
          <UnderReviewCard recipes={inReviewRecipes} />
        </div>
      )}
    </div>
  );
}
