import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChefHat, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { SearchBanner } from "@/components/SearchBanner";
import { FilterShelf, type FilterState } from "@/components/FilterShelf";
import { HotStrip } from "@/components/HotStrip";
import type { Recipe } from "@/types";

// ─── Modern recipe card (full-bleed image, overlay text, hover reveal) ───────

function RecipeCard({ recipe, featured = false }: { recipe: Recipe; featured?: boolean }) {
  const [err, setErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link to={`/recipes/${recipe.slug}`} className="group">
      <Card className={`relative overflow-hidden rounded-3xl border-0 shadow-sm py-0 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${featured ? "col-span-2 row-span-2" : ""}`}>
        {/* Full-bleed image */}
        <div className="absolute inset-0">
          {recipe.image_url && !err ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={() => setErr(true)}
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
              <span className={`${featured ? "text-8xl" : "text-5xl"} drop-shadow-lg`}>{fallback.emoji}</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
        </div>

        <CardContent className={`relative flex flex-col justify-between p-5 sm:p-6 ${featured ? "min-h-[400px]" : "min-h-[280px]"}`}>
          {/* Top: badges + quick action */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge className="backdrop-blur-md bg-white/20 text-white hover:bg-white/30 border-0 text-[10px]">
                {recipe.category.replace(/_/g, " ")}
              </Badge>
              {recipe.fork_count > 0 && (
                <Badge className="backdrop-blur-md bg-white/15 text-white/90 border-0 text-[10px]">
                  🍴 {recipe.fork_count}
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-white/15 text-white backdrop-blur-md opacity-0 translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hover:bg-white/30 h-8 w-8"
              tabIndex={-1}
            >
              <ChefHat className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom: content */}
          <div className="text-white">
            <h3 className={`font-bold tracking-tight leading-tight mb-2 ${featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>
              {recipe.title}
            </h3>
            <p className={`text-white/60 line-clamp-2 mb-3 ${featured ? "text-sm" : "text-xs"}`}>
              {recipe.description}
            </p>

            {/* Tags — slide up on hover */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.slug}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Author + meta — slide up on hover */}
            <div className="flex items-center gap-3 text-sm text-white/70 opacity-0 translate-y-2 transition-all duration-300 delay-75 group-hover:opacity-100 group-hover:translate-y-0">
              <span>@{recipe.author_username}</span>
              {recipe.parent_recipe_slug && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/50 text-xs">forked</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Skeleton cards ──────────────────────────────────────────────────────────

function RecipeCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <Card className={`overflow-hidden rounded-3xl border-0 py-0 ${featured ? "col-span-2 row-span-2" : ""}`}>
      <Skeleton className={`w-full ${featured ? "min-h-[400px]" : "min-h-[280px]"}`} />
    </Card>
  );
}

// ─── Community Kitchen sidebar ───────────────────────────────────────────────

function CommunityKitchenSidebar({
  recipes,
  isLoggedIn,
}: {
  recipes: Recipe[];
  isLoggedIn: boolean;
}) {
  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <Card className="sticky top-4 rounded-2xl overflow-hidden border-indigo-200/60 bg-gradient-to-b from-indigo-50 to-white py-0 shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <span className="text-sm font-bold text-indigo-950">Rising Stars</span>
            <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
              {recipes.length} in review
            </Badge>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1">Community voting in progress</p>
        </div>
        <div className="divide-y divide-indigo-50">
          {recipes.slice(0, 5).map((r, idx) => {
            const fallback = getCategoryFallback(r.category);
            return (
              <Link
                key={r.slug}
                to={`/recipes/${r.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/80 transition-colors group"
              >
                <span className="text-[11px] font-bold text-indigo-300 w-3 shrink-0">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
                      <span className="text-lg">{fallback.emoji}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-slate-400">by @{r.author_username}</p>
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
                              background:
                                pct >= 100 && approvalPct >= 80
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
        <div className="px-4 py-3 border-t border-indigo-100 text-center">
          <p className="text-[11px] text-indigo-400">
            {isLoggedIn ? "Click a recipe to cast your vote" : "Log in to cast your vote"}
          </p>
        </div>
      </Card>
    </aside>
  );
}

// ─── Query string builder ────────────────────────────────────────────────────

function buildQueryString(filters: FilterState, search: string, orFallback = false): string {
  const params = new URLSearchParams();

  if (filters.category && !orFallback) {
    params.append("category", filters.category);
  }

  const tags: string[] = [];
  if (filters.cuisine) tags.push(filters.cuisine);
  if (filters.lifestyle) tags.push(filters.lifestyle);
  tags.forEach((t) => params.append("tags", t));

  if (search) params.append("search", search);

  const qs = params.toString();
  return qs ? `/recipes/?${qs}` : "/recipes/";
}

// ─── Bento grid layout ──────────────────────────────────────────────────────

function BentoGrid({ recipes }: { recipes: Recipe[] }) {
  if (recipes.length === 0) return null;

  // First recipe is featured (large), rest are standard
  const [featured, ...rest] = recipes;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
      {/* Featured card spans 2 cols on lg */}
      <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
        <RecipeCard recipe={featured} featured />
      </div>
      {rest.map((r) => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  );
}

function BentoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
      <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
        <RecipeCardSkeleton featured />
      </div>
      <RecipeCardSkeleton />
      <RecipeCardSkeleton />
      <RecipeCardSkeleton />
      <RecipeCardSkeleton />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlCuisine = searchParams.get("cuisine") || "";
  const urlLifestyle = searchParams.get("lifestyle") || "";

  const [filters, setFilters] = useState<FilterState>({
    category: urlCategory,
    cuisine: urlCuisine,
    lifestyle: urlLifestyle,
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inReviewRecipes, setInReviewRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);

  const fetchRecipes = useCallback(
    async (f: FilterState, search: string) => {
      setLoading(true);
      setError("");
      try {
        const path = buildQueryString(f, search);
        const data = await api.get(path);
        let results = data.results || [];

        if (results.length === 0 && f.category && (f.cuisine || f.lifestyle)) {
          const fallbackPath = buildQueryString(f, search, true);
          const fallbackData = await api.get(fallbackPath);
          results = fallbackData.results || [];
        }

        setRecipes(results);
        setIsFiltered(!!(f.category || f.cuisine || f.lifestyle || search));
      } catch {
        setError("Failed to load recipes. Try refreshing.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRecipes(
      { category: urlCategory, cuisine: urlCuisine, lifestyle: urlLifestyle },
      urlSearch
    );
  }, [urlSearch, urlCategory, urlCuisine, urlLifestyle, fetchRecipes]);

  useEffect(() => {
    if (!token) return;
    api
      .get("/recipes/?status=in_review", token)
      .then((data) => setInReviewRecipes(data.results || []))
      .catch(() => {});
  }, [token]);

  function applyFilters(f: FilterState, search: string) {
    const params: Record<string, string> = {};
    if (f.category) params.category = f.category;
    if (f.cuisine) params.cuisine = f.cuisine;
    if (f.lifestyle) params.lifestyle = f.lifestyle;
    if (search) params.search = search;
    setSearchParams(params, { replace: true });
  }

  function handleSearch(query: string) {
    applyFilters(filters, query);
  }

  function handleFilterSearch() {
    applyFilters(filters, urlSearch);
  }

  function handleClearFilters() {
    const cleared: FilterState = { category: "", cuisine: "", lifestyle: "" };
    setFilters(cleared);
    applyFilters(cleared, urlSearch);
  }

  const showSidebar = inReviewRecipes.length > 0;

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-8">
      {/* Liquid glass hero */}
      <SearchBanner onSearch={handleSearch} initial={urlSearch} />

      {/* Filter shelf */}
      <FilterShelf
        filters={filters}
        onChange={setFilters}
        onSearch={handleFilterSearch}
        onClear={handleClearFilters}
      />

      {/* Hot this month — hide when filtering */}
      {!isFiltered && <HotStrip />}

      {/* Main content */}
      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">
              {isFiltered ? "Results" : "All Recipes"}
            </h2>
            {isFiltered && (
              <p className="text-xs text-muted-foreground">
                {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {loading ? (
            <BentoGridSkeleton />
          ) : recipes.length > 0 ? (
            <BentoGrid recipes={recipes} />
          ) : (
            <Card className="rounded-3xl border-dashed py-16 text-center">
              <CardContent>
                <p className="text-muted-foreground text-lg mb-1">
                  {isFiltered ? "No recipes match your filters" : "No recipes yet"}
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  {isFiltered ? "Try broadening your search." : "Be the first to share a recipe!"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {showSidebar && (
          <CommunityKitchenSidebar recipes={inReviewRecipes} isLoggedIn={!!token} />
        )}
      </div>
    </div>
  );
}
