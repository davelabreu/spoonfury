/**
 * MyKitchenPage — The user's personal recipe dashboard.
 *
 * Two sections:
 *   1. Test Kitchen 🧪 — draft recipes with publish readiness indicators
 *   2. Published ✅ — recipes visible to the public
 *
 * Also includes test kitchen sharing controls.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, MoreHorizontal, Trash2, FolderInput } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { WeeklyPlanner } from "@/components/planner/WeeklyPlanner";
import { toast } from "sonner";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe, Book, PublishGate, ReviewProgress } from "@/types";

/** Check which publish gate criteria a recipe meets. */
function getPublishGate(recipe: Recipe): PublishGate {
  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}

/** Visual checklist indicator for a single recipe's publish readiness. */
function GateChecklist({ gate }: { gate: PublishGate }) {
  const items = [
    { label: "2+ ingredients", met: gate.hasEnoughIngredients },
    { label: "Instructions (20+ chars)", met: gate.hasInstructions },
    { label: "Description", met: gate.hasDescription },
    { label: "Category", met: gate.hasCategory },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(item => (
        <span
          key={item.label}
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            item.met
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {item.met ? "✓" : "○"} {item.label}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status, isForked }: { status: string; isForked?: boolean }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: isForked ? "Forked Draft" : "Draft", className: isForked ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600" },
    in_review: { label: "In Review", className: "bg-blue-100 text-blue-700" },
    mod_queue: { label: "In Moderation", className: "bg-purple-100 text-purple-700" },
    revision_requested: { label: "Revision Needed", className: "bg-orange-100 text-orange-700" },
    published: { label: "Published", className: "bg-green-100 text-green-700" },
  };
  const c = config[status] || config.draft;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}

type SortMode = "newest" | "az" | "category" | "cuisine" | "lifestyle";

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "az", label: "A-Z" },
  { key: "category", label: "Category" },
  { key: "cuisine", label: "Cuisine" },
  { key: "lifestyle", label: "Lifestyle" },
];

function sortRecipes(recipes: Recipe[], mode: SortMode): Recipe[] {
  const sorted = [...recipes];
  switch (mode) {
    case "newest":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "category":
      return sorted.sort((a, b) => {
        const cmp = a.category.localeCompare(b.category);
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    case "cuisine": {
      const getTag = (r: Recipe) =>
        r.tags?.find(t => t.kind === "cuisine")?.name ?? "\uffff";
      return sorted.sort((a, b) => {
        const cmp = getTag(a).localeCompare(getTag(b));
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    }
    case "lifestyle": {
      const getTag = (r: Recipe) =>
        r.tags?.find(t => t.kind === "dietary")?.name ?? "\uffff";
      return sorted.sort((a, b) => {
        const cmp = getTag(a).localeCompare(getTag(b));
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    }
    default:
      return sorted;
  }
}

function SortTabs({ active, onChange }: { active: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div className="flex gap-3 border-b border-muted overflow-x-auto">
      {SORT_TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`text-[10px] pb-1 whitespace-nowrap transition-colors ${
            active === tab.key
              ? "font-semibold text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type ViewMode = "card" | "compact";

function ViewToggle({ active, onChange }: { active: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
      <button
        onClick={() => onChange("card")}
        className={`p-1 rounded transition-all ${
          active === "card"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange("compact")}
        className={`p-1 rounded transition-all ${
          active === "compact"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Compact view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ReviewProgressLine({ progress }: { progress: ReviewProgress }) {
  const { positive, total, needed_for_threshold, threshold_met } = progress;

  if (threshold_met) {
    return (
      <span className="text-[10px] font-semibold text-violet-600">
        ✨ Passed community review — in moderator queue
      </span>
    );
  }

  if (total === 0) {
    return (
      <span className="text-[10px] text-violet-600">
        ✨ 0 votes · {needed_for_threshold} more needed to publish
      </span>
    );
  }

  return (
    <span className="text-[10px] text-violet-600">
      ✨ {positive}/{total} votes · {needed_for_threshold} more yes to publish
    </span>
  );
}

function CompactRow({ recipe, collections, onMove, onDelete }: {
  recipe: Recipe;
  collections?: Book[];
  onMove?: (slug: string, bookId: number) => void;
  onDelete?: (slug: string) => void;
}) {
  const fallback = getCategoryFallback(recipe.category);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-background hover:bg-accent transition-colors">
      <Link to={`/recipes/${recipe.slug}`} className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="text-sm w-5 text-center shrink-0">{fallback.emoji}</span>
        <span className="text-xs font-semibold flex-1 truncate">{recipe.title}</span>
        {recipe.fork_count > 0 && (
          <span className="text-[9px] text-amber-600 shrink-0">🍴 {recipe.fork_count}</span>
        )}
        {recipe.vouch_count > 0 && (
          <span className="text-[9px] text-violet-600 shrink-0">✨ {recipe.vouch_count}</span>
        )}
        <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground shrink-0 hidden sm:inline">
          {recipe.category.replace(/_/g, " ").split(" ")[0]}
        </span>
        <StatusBadge status={recipe.status} isForked={!!recipe.parent_recipe_slug} />
      </Link>
      {(onMove || onDelete) && (
        <div className="flex items-center gap-1 shrink-0">
          {onMove && collections && collections.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Move to collection">
                  <FolderInput className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {collections.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => onMove(recipe.slug, c.id)}>
                    <span className="text-xs">{c.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(recipe.slug)}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
              title="Delete recipe"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Card for a single recipe in the kitchen or published section. */
function RecipeCard({ recipe, showGate, collections, onMove, onDelete }: {
  recipe: Recipe;
  showGate?: boolean;
  collections?: Book[];
  onMove?: (slug: string, bookId: number) => void;
  onDelete?: (slug: string) => void;
}) {
  const gate = showGate ? getPublishGate(recipe) : null;
  const fallback = getCategoryFallback(recipe.category);
  const [imgError, setImgError] = useState(false);
  const showImage = recipe.image_url && !imgError;

  return (
    <div className="flex rounded-xl overflow-hidden border hover:border-foreground/20 hover:shadow-sm transition-all relative">
      <Link to={`/recipes/${recipe.slug}`} className="flex flex-1 min-w-0">
        {/* Left: small thumbnail or category fallback */}
        <div className="w-[72px] sm:w-[88px] shrink-0 relative">
          {showImage ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
              <span className="text-2xl drop-shadow-sm">{fallback.emoji}</span>
            </div>
          )}
        </div>

        {/* Right: text content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{recipe.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {recipe.description || "No description yet…"}
              </p>
              {recipe.published_at && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Published {new Date(recipe.published_at).toLocaleDateString()}
                </p>
              )}
              {recipe.status === "revision_requested" && (
                <p className="text-[10px] text-orange-600 mt-1">
                  Moderator requested changes — view recipe for details
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* Spacer to clear the hamburger menu */}
              {(onMove || onDelete) && <div className="h-7" />}
              <StatusBadge status={recipe.status} isForked={!!recipe.parent_recipe_slug} />
              <Badge variant="secondary" className="text-[10px]">{recipe.category}</Badge>
              {recipe.status === "in_review" && recipe.review_progress && (
                <ReviewProgressLine progress={recipe.review_progress} />
              )}
              {recipe.vouch_count > 0 && (
                <span className="text-[10px] text-violet-600">✨ {recipe.vouch_count}</span>
              )}
              {recipe.fork_count > 0 && (
                <span className="text-[10px] text-muted-foreground">🍴 {recipe.fork_count}</span>
              )}
            </div>
          </div>
          {gate && <GateChecklist gate={gate} />}
        </div>
      </Link>
      {(onMove || onDelete) && (
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {onMove && collections && collections.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Move to collection</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-[160px]">
                    {collections.map(c => (
                      <DropdownMenuItem key={c.id} onClick={() => onMove(recipe.slug, c.id)}>
                        <span className="text-xs">{c.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {onMove && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(recipe.slug)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span className="text-xs">Delete recipe</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function MyKitchenPage() {
  const { token, username } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"recipes" | "planner">("recipes");
  const [draftSort, setDraftSort] = useState<SortMode>("newest");
  const [publishedSort, setPublishedSort] = useState<SortMode>("newest");
  const [draftView, setDraftView] = useState<ViewMode>("card");
  const [publishedView, setPublishedView] = useState<ViewMode>("card");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [collections, setCollections] = useState<Book[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<Recipe[]>([]);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");

  useEffect(() => {
    if (!token) return;
    // page_size=200 ensures all user recipes are returned in one request —
    // the kitchen page must show every draft/published recipe the user owns.
    api.get("/recipes/?page_size=200", token)
      .then((data: { results?: Recipe[] }) => setRecipes(data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.get("/books/", token).then((data: any) => {
      const results: Book[] = data.results ?? data;
      setCollections(results);
    });
  }, [token]);

  if (!token) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Please <Link to="/login" className="underline font-semibold">sign in</Link> to view your kitchen.
      </p>
    );
  }

  const myRecipes = recipes.filter(r => r.author_username === username);
  const drafts = myRecipes.filter(r => r.status === "draft" || r.status === "revision_requested");
  const inReview = myRecipes.filter(r => r.status === "in_review");
  const inModeration = myRecipes.filter(r => r.status === "mod_queue");
  const published = myRecipes.filter(r => r.status === "published");

  const sortedDrafts = sortRecipes(drafts, draftSort);
  const sortedInReview = sortRecipes(inReview, draftSort);
  const sortedInModeration = sortRecipes(inModeration, draftSort);
  const sortedPublished = sortRecipes(published, publishedSort);

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !username) return;
    try {
      await api.post(
        `/users/${username}/kitchen/invite/`,
        { invitee_username: inviteUsername.trim() },
        token
      );
      setInviteMsg(`Invited @${inviteUsername.trim()}!`);
      setInviteUsername("");
      setTimeout(() => setInviteMsg(""), 3000);
    } catch {
      setInviteMsg("Failed to invite. Check the username.");
      setTimeout(() => setInviteMsg(""), 3000);
    }
  };

  const toggleCollection = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedRecipes([]);
      return;
    }
    setExpandedId(id);
    try {
      const data = await api.get(`/books/${id}/`, token!);
      setExpandedRecipes(data.recipes ?? []);
    } catch {
      setExpandedRecipes([]);
    }
  };

  const createCollection = async () => {
    const title = newCollectionTitle.trim();
    if (!title || !token) return;
    try {
      const created = await api.post("/books/", { title }, token);
      setCollections(prev => [...prev, created]);
      setNewCollectionTitle("");
    } catch {}
  };

  const handleMoveToCollection = async (recipeSlug: string, bookId: number) => {
    if (!token) return;
    try {
      await api.post(`/books/${bookId}/add-recipe/`, { recipe_slug: recipeSlug }, token);
      const col = collections.find(c => c.id === bookId);
      toast(`Added to ${col?.title ?? "collection"}`);
    } catch {
      toast.error("Failed to add to collection.");
    }
  };

  const handleDeleteRecipe = async (recipeSlug: string) => {
    if (!token) return;
    const recipe = myRecipes.find(r => r.slug === recipeSlug);
    if (!confirm(`Delete "${recipe?.title ?? recipeSlug}" permanently?`)) return;
    try {
      await api.delete(`/recipes/${recipeSlug}/`, token);
      setRecipes(prev => prev.filter(r => r.slug !== recipeSlug));
      toast("Recipe deleted.");
    } catch {
      toast.error("Failed to delete recipe.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground animate-pulse">Loading kitchen…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-8 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Kitchen</h1>
        <p className="text-muted-foreground">Manage your recipes and plan your weekly meals.</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex gap-6 border-b border-muted">
        <button
          onClick={() => setActiveTab("recipes")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "recipes" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Recipes
          {activeTab === "recipes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("planner")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "planner" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Weekly Planner
          {activeTab === "planner" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {activeTab === "recipes" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-500">
          {/* ── Collections ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">My Collections</h2>
              <div className="flex items-center gap-2">
                <Input
                  className="h-7 w-40 text-xs"
                  placeholder="New collection…"
                  value={newCollectionTitle}
                  onChange={e => setNewCollectionTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createCollection(); }}
                />
                <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={createCollection} disabled={!newCollectionTitle.trim()}>
                  + New
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {collections.map((c, i) => {
                const gradients = [
                  "from-amber-500 to-orange-600",
                  "from-teal-400 to-emerald-600",
                  "from-indigo-500 to-purple-600",
                  "from-pink-400 to-rose-600",
                  "from-sky-400 to-blue-600",
                  "from-lime-400 to-green-600",
                  "from-fuchsia-400 to-purple-600",
                  "from-orange-400 to-red-600",
                ];
                const gradient = gradients[i % gradients.length];
                const isExpanded = expandedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCollection(c.id)}
                    className={`bg-gradient-to-br ${gradient} rounded-lg p-3 text-white text-left transition-all ${
                      isExpanded ? "ring-2 ring-offset-2 ring-amber-500" : "hover:scale-[1.02]"
                    }`}
                  >
                    <div className="font-bold text-sm truncate">{c.title}</div>
                    <div className="text-xs opacity-80">{c.recipe_count ?? 0} recipe{(c.recipe_count ?? 0) !== 1 ? "s" : ""}</div>
                  </button>
                );
              })}
            </div>

            {/* Inline preview */}
            {expandedId && (
              <div className="mt-3 bg-white border border-border rounded-xl p-4 border-l-4 border-l-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">
                    {collections.find(c => c.id === expandedId)?.title}
                  </span>
                  <Link
                    to={`/collections/${expandedId}`}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    View all {expandedRecipes.length} →
                  </Link>
                </div>
                {expandedRecipes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recipes in this collection yet.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {expandedRecipes.slice(0, 6).map(r => {
                      const fb = getCategoryFallback(r.category ?? "other");
                      return (
                        <Link key={r.slug} to={`/recipes/${r.slug}`} className="shrink-0 w-28 group">
                          <div className="w-28 h-20 rounded-lg overflow-hidden mb-1">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${fb.gradient} flex items-center justify-center text-2xl`}>
                                {fb.emoji}
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-semibold truncate">{r.title}</div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Kitchen Section */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">🧪 Test Kitchen</h2>
              <Badge variant="outline" className="font-mono">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setInviteOpen(o => !o)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                    inviteOpen
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <span>💌</span>
                  <span className="hidden sm:inline">Invite a friend</span>
                </button>
                <ViewToggle active={draftView} onChange={setDraftView} />
              </div>
            </div>
            {inviteOpen && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300 p-3 bg-purple-50/50 border border-purple-100 rounded-lg mb-3">
                <p className="text-[11px] text-purple-700 mb-2">
                  Invite someone to peek behind the curtain — they'll see your experiments before anyone else.
                </p>
                <div className="flex gap-2">
                  <Input
                    className="flex-1 border-purple-200 focus-visible:ring-purple-200"
                    placeholder="Enter their username..."
                    value={inviteUsername}
                    onChange={e => setInviteUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleInvite()}
                  />
                  <Button
                    size="sm"
                    onClick={handleInvite}
                    disabled={!inviteUsername.trim()}
                    className="rounded-lg bg-purple-600 hover:bg-purple-700"
                  >
                    Send
                  </Button>
                </div>
                {inviteMsg && (
                  <p className="text-[10px] font-medium text-purple-600 mt-1.5 animate-in fade-in">
                    {inviteMsg}
                  </p>
                )}
              </div>
            )}
            <div className="mb-3">
              <SortTabs active={draftSort} onChange={setDraftSort} />
            </div>

            {drafts.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No recipes in the test kitchen.{" "}
                  <Link to="/recipes/new" className="text-primary hover:underline font-medium">Create one</Link> to get started.
                </p>
              </div>
            ) : draftView === "card" ? (
              <div className="space-y-3">
                {sortedDrafts.map(r => (
                  <RecipeCard key={r.slug} recipe={r} showGate collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                {sortedDrafts.map(r => (
                  <CompactRow key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                ))}
              </div>
            )}

          </section>

          {/* In Review Section */}
          {inReview.length > 0 && (
            <section className="animate-in fade-in duration-700">
              <Separator className="mb-8" />
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold">🔍 In Review</h2>
                <Badge variant="outline" className="font-mono">{inReview.length}</Badge>
              </div>
              {draftView === "card" ? (
                <div className="space-y-3">
                  {sortedInReview.map(r => (
                    <RecipeCard key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                  {sortedInReview.map(r => (
                    <CompactRow key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* In Moderation Section */}
          {inModeration.length > 0 && (
            <section className="animate-in fade-in duration-700">
              <Separator className="mb-8" />
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold">⏳ In Moderation</h2>
                <Badge variant="outline" className="font-mono">{inModeration.length}</Badge>
              </div>
              {draftView === "card" ? (
                <div className="space-y-3">
                  {sortedInModeration.map(r => (
                    <RecipeCard key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                  {sortedInModeration.map(r => (
                    <CompactRow key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                  ))}
                </div>
              )}
            </section>
          )}

          <Separator className="my-8" />

          {/* Published Section */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">✅ Published</h2>
              <Badge variant="outline" className="font-mono">{published.length} recipe{published.length !== 1 ? "s" : ""}</Badge>
              <div className="ml-auto">
                <ViewToggle active={publishedView} onChange={setPublishedView} />
              </div>
            </div>
            <div className="mb-3">
              <SortTabs active={publishedSort} onChange={setPublishedSort} />
            </div>

            {published.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No published recipes yet. Perfect a recipe in your test kitchen to publish it!
                </p>
              </div>
            ) : publishedView === "card" ? (
              <div className="space-y-3">
                {sortedPublished.map(r => (
                  <RecipeCard key={r.slug} recipe={r} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                {sortedPublished.map(r => (
                  <CompactRow key={r.slug} recipe={r} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
          <WeeklyPlanner />
        </div>
      )}
    </div>
  );
}
