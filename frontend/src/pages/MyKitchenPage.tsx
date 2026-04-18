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
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, List, MoreVertical, Trash2, FolderInput, Pencil, Share2, Settings2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
    draft: { label: isForked ? "Forked Draft" : "Original Draft", className: isForked ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700" },
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
  const navigate = useNavigate();

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
          <button
            onClick={() => navigate(`/recipes/${recipe.slug}/edit`)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit recipe"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/recipes/${recipe.slug}`;
              navigator.clipboard.writeText(url);
              toast("Link copied!");
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
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
  const navigate = useNavigate();
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
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => navigate(`/recipes/${recipe.slug}/edit`)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Edit Recipe</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const url = `${window.location.origin}/recipes/${recipe.slug}`;
                navigator.clipboard.writeText(url);
                toast("Link copied!");
              }}>
                <Share2 className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Share</span>
              </DropdownMenuItem>
              {onMove && collections && collections.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="h-3.5 w-3.5 mr-2" />
                      <span className="text-xs">Move to Collection</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-[160px]">
                      {collections.map(c => (
                        <DropdownMenuItem key={c.id} onClick={() => onMove(recipe.slug, c.id)}>
                          <span className="text-xs">{c.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(recipe.slug)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Delete Recipe</span>
                  </DropdownMenuItem>
                </>
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

  const refreshCollections = async () => {
    if (!token) return;
    const data = await api.get("/books/", token);
    const results: Book[] = data.results ?? data;
    setCollections(results);
    // Refresh expanded collection if one is open
    if (expandedId) {
      try {
        const detail = await api.get(`/books/${expandedId}/`, token);
        setExpandedRecipes(detail.recipes ?? []);
      } catch {
        setExpandedRecipes([]);
      }
    }
  };

  const handleMoveToCollection = async (recipeSlug: string, bookId: number) => {
    if (!token) return;
    try {
      // Remove from all current collections first
      for (const col of collections) {
        if (col.id !== bookId) {
          try {
            await api.post(`/books/${col.id}/remove-recipe/`, { recipe_slug: recipeSlug }, token);
          } catch {
            // Recipe may not be in this collection — ignore
          }
        }
      }
      // Add to the target collection
      await api.post(`/books/${bookId}/add-recipe/`, { recipe_slug: recipeSlug }, token);
      const col = collections.find(c => c.id === bookId);
      toast(`Moved to ${col?.title ?? "collection"}`);
      await refreshCollections();
    } catch {
      toast.error("Failed to move to collection.");
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
      await refreshCollections();
    } catch {
      toast.error("Failed to delete recipe.");
    }
  };

  const handleRenameCollection = async (collectionId: number) => {
    if (!token) return;
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const newName = prompt("Rename collection:", col.title);
    if (!newName || !newName.trim() || newName.trim() === col.title) return;
    try {
      await api.patch(`/books/${collectionId}/`, { title: newName.trim() }, token);
      toast(`Renamed to "${newName.trim()}"`);
      await refreshCollections();
    } catch {
      toast.error("Failed to rename collection.");
    }
  };

  // ── Edit Collection dialog state ──
  const COLLECTION_PRESETS = [
    { label: "Quick Meals", icon: "\u26A1" },
    { label: "Meal Prep", icon: "\u{1F371}" },
    { label: "Slow Cooking", icon: "\u{1F372}" },
    { label: "Vegetarian", icon: "\u{1F331}" },
    { label: "Clean Eating", icon: "\u{1F96C}" },
    { label: "Custom", icon: "\u{1F4C1}" },
  ];
  const [editingCollection, setEditingCollection] = useState<Book | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const openEditCollection = (collectionId: number) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    setEditingCollection(col);
    setEditIcon(col.icon || "\u{1F4C1}");
    setEditDescription(col.description || "");
  };

  const saveEditCollection = async () => {
    if (!token || !editingCollection) return;
    try {
      await api.patch(`/books/${editingCollection.id}/`, {
        icon: editIcon,
        description: editDescription.trim(),
      }, token);
      toast("Collection updated!");
      setEditingCollection(null);
      await refreshCollections();
    } catch {
      toast.error("Failed to update collection.");
    }
  };

  const handleDeleteCollection = async (collectionId: number) => {
    if (!token) return;
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    if (!confirm(`Delete collection "${col.title}"? Recipes inside won't be deleted.`)) return;
    try {
      await api.delete(`/books/${collectionId}/`, token);
      toast(`Deleted "${col.title}"`);
      if (expandedId === collectionId) {
        setExpandedId(null);
        setExpandedRecipes([]);
      }
      await refreshCollections();
    } catch {
      toast.error("Failed to delete collection.");
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...collections].sort((a, b) => {
                const roleOrder = (r: string) => r === "kitchen_sink" ? 0 : r === "forked" ? 1 : 2;
                const oa = roleOrder(a.default_role ?? "");
                const ob = roleOrder(b.default_role ?? "");
                if (oa !== ob) return oa - ob;
                return a.title.localeCompare(b.title);
              }).map(c => {
                const role = c.default_role ?? "";
                const isExpanded = expandedId === c.id;
                const stripeColor = role === "kitchen_sink" ? "bg-primary" : role === "forked" ? "bg-indigo-500" : "bg-slate-300";
                const icon = role === "kitchen_sink" ? "\u{1F9D1}\u200D\u{1F373}" : role === "forked" ? "\u{1F374}" : (c.icon || "\u{1F4C1}");
                return (
                  <div
                    key={c.id}
                    className={`relative flex items-center gap-3 bg-white rounded-xl px-4 py-3 text-left shadow-sm transition-all ${
                      isExpanded ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
                    } border-l-[3px] ${stripeColor}`}
                  >
                    <button
                      onClick={() => toggleCollection(c.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <span className="text-xl w-9 h-9 flex items-center justify-center rounded-lg bg-muted shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] truncate">{c.title}</div>
                        {c.description && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {role === "kitchen_sink" && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Originals</span>
                          )}
                          {role === "forked" && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">Forked</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-zinc-200 shrink-0">{c.recipe_count ?? 0}</span>
                    </button>
                    {!role && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem onClick={() => openEditCollection(c.id)}>
                            <Settings2 className="h-3.5 w-3.5 mr-2" />
                            <span className="text-xs">Edit Collection</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRenameCollection(c.id)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            <span className="text-xs">Rename Collection</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteCollection(c.id)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            <span className="text-xs">Delete Collection</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
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
                  <RecipeCard key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                {sortedPublished.map(r => (
                  <CompactRow key={r.slug} recipe={r} collections={collections} onMove={handleMoveToCollection} onDelete={handleDeleteRecipe} />
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

      {/* Edit Collection Dialog */}
      <Dialog open={!!editingCollection} onOpenChange={open => { if (!open) setEditingCollection(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>Choose an icon and add a description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setEditIcon(p.icon)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      editIcon === p.icon
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="What's this collection about?"
                className="text-sm resize-none h-10"
                maxLength={42}
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">{editDescription.length}/42</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingCollection(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEditCollection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
