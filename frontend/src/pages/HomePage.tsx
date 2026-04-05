import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { SearchBanner } from "@/components/SearchBanner";
import { FilterShelf, type FilterState } from "@/components/FilterShelf";
import { HotStrip } from "@/components/HotStrip";
import type { Recipe } from "@/types";

// ─── Grid card (kept from original) ─────────────────────────────────────────

function GridCard({ recipe }: { recipe: Recipe }) {
  const [err, setErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border hover:border-foreground/20 hover:shadow-md hover:scale-[1.01] transition-all duration-200 bg-card"
    >
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden">
        {recipe.image_url && !err ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setErr(true)}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}
          >
            <span className="text-5xl drop-shadow">{fallback.emoji}</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 flex-1">{recipe.title}</h3>
          <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
            {recipe.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{recipe.description}</p>
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

// ─── Community Kitchen sidebar (kept from original) ──────────────────────────

function CommunityKitchenSidebar({
  recipes,
  isLoggedIn,
}: {
  recipes: Recipe[];
  isLoggedIn: boolean;
}) {
  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-4 rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50 to-white overflow-hidden shadow-sm">
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
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}
                    >
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
      </div>
    </aside>
  );
}

// ─── Query string builder ────────────────────────────────────────────────────

function buildQueryString(filters: FilterState, search: string, orFallback = false): string {
  const params = new URLSearchParams();

  // Category — skip if OR fallback (relax category constraint)
  if (filters.category && !orFallback) {
    params.append("category", filters.category);
  }

  // Tags (cuisine + lifestyle are both tag slugs)
  const tags: string[] = [];
  if (filters.cuisine) tags.push(filters.cuisine);
  if (filters.lifestyle) tags.push(filters.lifestyle);
  tags.forEach((t) => params.append("tags", t));

  if (search) params.append("search", search);

  const qs = params.toString();
  return qs ? `/recipes/?${qs}` : "/recipes/";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL state
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

  // Fetch recipes — supports AND filtering with OR fallback
  const fetchRecipes = useCallback(
    async (f: FilterState, search: string) => {
      setLoading(true);
      setError("");
      try {
        const path = buildQueryString(f, search);
        const data = await api.get(path);
        let results = data.results || [];

        // OR fallback: if AND returned nothing and we had a category, retry without it
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

  // Initial load + URL-driven fetch
  useEffect(() => {
    fetchRecipes(
      { category: urlCategory, cuisine: urlCuisine, lifestyle: urlLifestyle },
      urlSearch
    );
  }, [urlSearch, urlCategory, urlCuisine, urlLifestyle, fetchRecipes]);

  // In-review sidebar
  useEffect(() => {
    if (!token) return;
    api
      .get("/recipes/?status=in_review", token)
      .then((data) => setInReviewRecipes(data.results || []))
      .catch(() => {});
  }, [token]);

  // Push filter state to URL
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
    <div className="space-y-6">
      {/* Hero search banner */}
      <SearchBanner onSearch={handleSearch} initial={urlSearch} />

      {/* Filter shelf */}
      <FilterShelf
        filters={filters}
        onChange={setFilters}
        onSearch={handleFilterSearch}
        onClear={handleClearFilters}
      />

      {/* Hot this month — only show when not filtering */}
      {!isFiltered && <HotStrip />}

      {/* Main content area */}
      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {isFiltered ? "Results" : "All Recipes"}
            </h2>
            {isFiltered && (
              <p className="text-xs text-muted-foreground">
                {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading recipes...</p>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recipes.map((r) => (
                <GridCard key={r.slug} recipe={r} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {isFiltered
                  ? "No recipes match your filters. Try broadening your search."
                  : "No recipes yet. Be the first!"}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <CommunityKitchenSidebar recipes={inReviewRecipes} isLoggedIn={!!token} />
        )}
      </div>
    </div>
  );
}
