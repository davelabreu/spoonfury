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
import { LayoutGrid, List } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WeeklyPlanner } from "@/components/planner/WeeklyPlanner";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe, PublishGate } from "@/types";

/** Check which publish gate criteria a recipe meets. */
// ... (rest of helper functions remain unchanged)
function getPublishGate(recipe: Recipe): PublishGate {
  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}

/** Whether all gate criteria are met. */
function isPublishReady(gate: PublishGate): boolean {
  return Object.values(gate).every(Boolean);
}

/** Visual checklist indicator for a single recipe's publish readiness. */
function GateChecklist({ gate }: { gate: PublishGate }) {
  const items = [
    { label: "2+ ingredients", met: gate.hasEnoughIngredients },
    { label: "Instructions (20+ chars)", met: gate.hasInstructions },
    { label: "Description", met: gate.hasDescription },
    { label: "Category", met: gate.hasCategory },
  ];

  const metCount = items.filter(i => i.met).length;

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
      <span className="text-[10px] font-bold text-muted-foreground ml-auto">
        {metCount}/4
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
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

function CompactRow({ recipe, showGate }: { recipe: Recipe; showGate?: boolean }) {
  const gate = showGate ? getPublishGate(recipe) : null;
  const gateCount = gate ? Object.values(gate).filter(Boolean).length : null;
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="flex items-center gap-2.5 px-3 py-2 bg-background hover:bg-accent transition-colors"
    >
      <span className="text-sm w-5 text-center shrink-0">{fallback.emoji}</span>
      <span className="text-xs font-semibold flex-1 truncate">{recipe.title}</span>
      {recipe.fork_count > 0 && (
        <span className="text-[9px] text-amber-600 shrink-0">🍴 {recipe.fork_count}</span>
      )}
      <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground shrink-0 hidden sm:inline">
        {recipe.category.replace(/_/g, " ").split(" ")[0]}
      </span>
      <StatusBadge status={recipe.status} />
      {gateCount !== null && (
        <span className="text-[9px] text-muted-foreground shrink-0">{gateCount}/4</span>
      )}
    </Link>
  );
}

/** Card for a single recipe in the kitchen or published section. */
function RecipeCard({ recipe, showGate }: { recipe: Recipe; showGate?: boolean }) {
  const gate = getPublishGate(recipe);
  const fallback = getCategoryFallback(recipe.category);
  const [imgError, setImgError] = useState(false);
  const showImage = recipe.image_url && !imgError;

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="flex rounded-xl overflow-hidden border hover:border-foreground/20 hover:shadow-sm transition-all"
    >
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
            <StatusBadge status={recipe.status} />
            <Badge variant="secondary" className="text-[10px]">{recipe.category}</Badge>
            {recipe.status === "in_review" && recipe.total_votes != null && (
              <span className="text-[10px] font-semibold text-blue-600">
                👍 {recipe.positive_votes}/{recipe.total_votes} votes
              </span>
            )}
            {recipe.fork_count > 0 && (
              <span className="text-[10px] text-muted-foreground">🍴 {recipe.fork_count}</span>
            )}
          </div>
        </div>
        {showGate && <GateChecklist gate={gate} />}
      </div>
    </Link>
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

  useEffect(() => {
    if (!token) return;
    // page_size=200 ensures all user recipes are returned in one request —
    // the kitchen page must show every draft/published recipe the user owns.
    api.get("/recipes/?page_size=200", token)
      .then((data: { results?: Recipe[] }) => setRecipes(data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground animate-pulse">Loading kitchen…</p>
      </div>
    );
  }

  return (
    <div className={`mx-auto space-y-8 ${activeTab === 'planner' ? 'max-w-6xl' : 'max-w-2xl'}`}>
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
          {/* Test Kitchen Section */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">🧪 Test Kitchen</h2>
              <Badge variant="outline" className="font-mono">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <ViewToggle active={draftView} onChange={setDraftView} />
              </div>
            </div>
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
                  <RecipeCard key={r.slug} recipe={r} showGate />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                {sortedDrafts.map(r => (
                  <CompactRow key={r.slug} recipe={r} showGate />
                ))}
              </div>
            )}

            {/* Kitchen sharing */}
            <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-muted/50">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Share your test kitchen
              </p>
              <div className="flex gap-2">
                <input
                  className="bg-background border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Enter a username..."
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
                <Button onClick={handleInvite} disabled={!inviteUsername.trim()} className="rounded-lg">
                  Invite
                </Button>
              </div>
              {inviteMsg && (
                <p className="text-xs font-medium text-primary mt-2 animate-in fade-in">
                  {inviteMsg}
                </p>
              )}
            </div>
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
                    <RecipeCard key={r.slug} recipe={r} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                  {sortedInReview.map(r => (
                    <CompactRow key={r.slug} recipe={r} />
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
                    <RecipeCard key={r.slug} recipe={r} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
                  {sortedInModeration.map(r => (
                    <CompactRow key={r.slug} recipe={r} />
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
