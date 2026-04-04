import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe } from "@/types";

// ─── Shared image helper ──────────────────────────────────────────────────────

function RecipeImage({
  recipe,
  className,
  emojiSize = "text-5xl",
}: {
  recipe: Recipe;
  className?: string;
  emojiSize?: string;
}) {
  const [err, setErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);
  return recipe.image_url && !err ? (
    <img
      src={recipe.image_url}
      alt={recipe.title}
      className={`w-full h-full object-cover ${className ?? ""}`}
      onError={() => setErr(true)}
    />
  ) : (
    <div
      className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center ${className ?? ""}`}
    >
      <span className={`${emojiSize} drop-shadow`}>{fallback.emoji}</span>
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group relative block w-full rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
    >
      <div className="aspect-[16/7] w-full">
        <RecipeImage recipe={recipe} emojiSize="text-7xl" />
      </div>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">
              Recipe of the Day
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight group-hover:underline underline-offset-2">
              {recipe.title}
            </h2>
            <p className="text-sm text-white/70 mt-1">
              by @{recipe.author_username}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px]">
              {recipe.category.replace(/_/g, " ")}
            </Badge>
            {recipe.fork_count > 0 && (
              <span className="text-xs text-white/80 font-semibold">
                🍴 {recipe.fork_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border hover:border-foreground/20 hover:shadow-md hover:scale-[1.01] transition-all duration-200 bg-card"
    >
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden">
        <RecipeImage recipe={recipe} emojiSize="text-5xl" className="group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 flex-1">
            {recipe.title}
          </h3>
          <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
            {recipe.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-1">
          <span>@{recipe.author_username}</span>
          {recipe.fork_count > 0 && (
            <span className="text-amber-600 font-semibold">🍴 {recipe.fork_count}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Community Kitchen sidebar ────────────────────────────────────────────────

function CommunityKitchenSidebar({ recipes, isLoggedIn }: { recipes: Recipe[]; isLoggedIn: boolean }) {
  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-4 rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50 to-white overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <span className="text-sm font-bold text-indigo-950">Rising Stars</span>
            <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
              {recipes.length} in review
            </Badge>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1">
            Community voting in progress
          </p>
        </div>

        {/* Recipe list */}
        <div className="divide-y divide-indigo-50">
          {recipes.slice(0, 5).map((r, idx) => {
            const fallback = getCategoryFallback(r.category);
            return (
              <Link
                key={r.slug}
                to={`/recipes/${r.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/80 transition-colors group"
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-indigo-300 w-3 shrink-0">
                  {idx + 1}
                </span>
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
                      <span className="text-lg">{fallback.emoji}</span>
                    </div>
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-slate-400">by @{r.author_username}</p>
                  {/* Voting progress bar — fills toward 3-vote minimum */}
                  {(() => {
                    const total = r.total_votes ?? 0;
                    const positive = r.positive_votes ?? 0;
                    const pct = Math.min(100, Math.round((total / 3) * 100));
                    const approvalPct = total > 0 ? Math.round((positive / total) * 100) : 0;
                    return (
                      <>
                        <div className="mt-1.5 h-1 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 && approvalPct >= 80
                                ? "linear-gradient(90deg, #10b981, #34d399)"
                                : "linear-gradient(90deg, #6366f1, #818cf8)",
                            }}
                          />
                        </div>
                        <p className="text-[9px] text-indigo-400 mt-0.5">
                          {total === 0
                            ? "Needs votes"
                            : `${total}/3 vote${total !== 1 ? "s" : ""} · ${approvalPct}% positive`}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-3 border-t border-indigo-100 text-center">
          <p className="text-[11px] text-indigo-400">
            {isLoggedIn ? "Click a recipe to cast your vote" : "Log in to cast your vote"}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const hero = recipes[0];
  const grid = recipes.slice(1);
  const showSidebar = inReviewRecipes.length > 0;

  return (
    <div className="flex gap-8 items-start">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stir the Pot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The best recipes from our community kitchen
          </p>
        </div>

        {/* Hero */}
        {hero && <HeroCard recipe={hero} />}

        {/* Grid */}
        {grid.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              All Recipes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grid.map(r => <GridCard key={r.slug} recipe={r} />)}
            </div>
          </div>
        )}

        {recipes.length === 0 && (
          <p className="text-muted-foreground">No recipes yet. Be the first!</p>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && <CommunityKitchenSidebar recipes={inReviewRecipes} isLoggedIn={!!token} />}
    </div>
  );
}
