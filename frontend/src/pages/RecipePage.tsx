import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { toast } from "sonner";
import { ShareModal } from "@/components/ShareModal";
import { PublishModal } from "@/components/PublishModal";
import { CookModeIngredients } from "@/components/CookModeIngredients";
import { ChevronLeft, Camera, Clock } from "lucide-react";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Ingredient, Recipe, Book, PublishGate } from "@/types";
import { BuyNowSheet } from "@/components/BuyNowSheet";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SHOPPING_LIST_UPDATED } from "@/contexts/ShoppingContext";
import { getIngredientEmoji } from "@/lib/ingredientEmoji";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ReviewBanner } from "@/components/ReviewBanner";
import { DraftBanner } from "@/components/DraftBanner";
import type { ReviewsResponse } from "@/types";

function getPublishGate(recipe: Recipe): PublishGate {
  const validIngredients = recipe.ingredients.filter((i) => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, username, isStaff } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [forkingInProgress, setForkingInProgress] = useState(false);
  const [forked, setForked] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const cookNow = useWakeLock();
  const [buyNowIngredients, setBuyNowIngredients] = useState<Ingredient[] | null>(null);
  const [listMsg, setListMsg] = useState("");
  const [inList, setInList] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewsResponse | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    setHeroImgError(false);
    api.get(`/recipes/${slug}/`, token ?? undefined).then((data: Recipe) => setRecipe(data)).catch(() => setError("Recipe not found."));
  }, [slug]);

  useEffect(() => {
    if (token) {
      api.get("/books/", token).then((data: any) => setBooks(data.results ?? data));
    }
  }, [token]);

  useEffect(() => {
    if (!recipe) return;
    // Published recipes: fetch reviews publicly (no token required) so anyone can see vouches.
    // In-review / mod_queue / revision_requested: requires token for the blind-gate flow.
    const needsToken = ["in_review", "revision_requested", "mod_queue"].includes(recipe.status);
    if (needsToken && !token) return;
    if (recipe.status !== "published" && !needsToken) return;
    api.get(`/recipes/${recipe.slug}/reviews/`, token || undefined)
      .then((data: ReviewsResponse) => setReviewData(data))
      .catch(() => {});
  }, [token, recipe?.slug, recipe?.status]);

  useEffect(() => {
    if (!token || !recipe) return;
    api.get(`/shopping-list/status/?recipe_slug=${recipe.slug}`, token)
      .then((data: any) => setInList(data.in_list))
      .catch(() => {});
  }, [token, recipe]);

  // Check if the current user has already forked this recipe
  useEffect(() => {
    if (!token || !recipe || !username) return;
    if (recipe.author_username === username) return;
    api.get(`/recipes/?forked_from=${recipe.slug}&page_size=5`, token)
      .then((data: { results?: Recipe[] }) => {
        const results = data.results ?? [];
        if (results.some(r => r.author_username === username)) setForked(true);
      })
      .catch(() => {});
  }, [token, recipe?.slug, username]);

  const isOwner = recipe && username && recipe.author_username === username;

  const addToBook = async (bookId: number) => {
    if (!token || !recipe) return;
    try {
      await api.post(`/books/${bookId}/add-recipe/`, { recipe_slug: recipe.slug }, token);
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Failed to save.");
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  const deleteRecipe = async () => {
    if (!token || !slug || !isOwner) return;
    if (!window.confirm("Are you sure you want to delete this recipe? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/recipes/${slug}/`, token);
      navigate("/");
    } catch {
      setError("Failed to delete recipe.");
      setDeleting(false);
    }
  };

  const handleFork = async () => {
    if (!token || !recipe) return;
    setForkingInProgress(true);
    try {
      await api.post(`/recipes/${recipe.slug}/fork/`, {
        title: `${recipe.title} (my version)`,
        description: recipe.description,
        serves: recipe.serves,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        notes: recipe.notes || "",
      }, token);
      setForked(true);
      toast("Forked! Saved to Forked Recipes", {
        description: "Head to My Kitchen to start tweaking it.",
        action: {
          label: "Change collection",
          onClick: () => navigate("/kitchen"),
        },
        duration: 6000,
      });
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      toast.error(e.data?.detail || "Failed to fork. Try again.");
    } finally {
      setForkingInProgress(false);
    }
  };

  const addToList = async (needed: Ingredient[]) => {
    if (!token || !recipe) return;
    try {
      const res = await api.post(
        "/shopping-list/add/",
        { recipe_slug: recipe.slug, recipe_title: recipe.title, ingredients: needed },
        token
      );
      setInList(res.already_in_list);
      const emojis = needed.map(i => i.emoji || getIngredientEmoji(i.name));
      const sourceRect = addBtnRef.current?.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent(SHOPPING_LIST_UPDATED, {
        detail: { emojis, sourceRect: sourceRect ?? null },
      }));
    } catch {
      setListMsg("Failed to add to list.");
      setTimeout(() => setListMsg(""), 2500);
    }
  };

  if (error) return (
    <div className="max-w-2xl mx-auto py-12">
      <p className="text-destructive font-medium">{error}</p>
      <Button variant="link" onClick={() => navigate("/")} className="mt-4 p-0">← Back to home</Button>
    </div>
  );
  if (!recipe) return <p className="text-muted-foreground">Loading…</p>;

  const heroFallback = getCategoryFallback(recipe.category);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Back navigation */}
      <div className="flex items-center justify-between -ml-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {/* Staff shortcut back to queue when viewing a recipe awaiting moderation */}
        {isStaff && recipe.status === "mod_queue" && (
          <Button variant="outline" size="sm" asChild className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <Link to="/moderation">⚖️ Back to Moderation Queue</Link>
          </Button>
        )}
      </div>

      {/* Status banners — full width */}
      {isOwner && (recipe.status === "draft" || recipe.status === "revision_requested") && (
        <DraftBanner
          status={recipe.status}
          gate={getPublishGate(recipe)}
          slug={slug!}
          moderationFeedback={reviewData?.moderation_feedback}
        />
      )}
      {/* Review/moderation status banner — shown to non-owners for in_review and mod_queue */}
      {!isOwner && (recipe.status === "in_review" || recipe.status === "mod_queue") && token && reviewData && (
        <ReviewBanner reviewData={reviewData} hasVoted={reviewData.has_voted} />
      )}
      {/* Same banner for the owner — shows gate progress on their own recipe */}
      {isOwner && (recipe.status === "in_review" || recipe.status === "mod_queue") && reviewData && (
        <ReviewBanner reviewData={reviewData} hasVoted={false} isOwner status={recipe.status} />
      )}

      {/* Editorial header — full width above the split grid */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          spoonfury / {recipe.category.replace(/_/g, " ")}
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">{recipe.title}</h1>
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span>by @{recipe.author_username}</span>
          {recipe.updated_at && (
            <span>· Updated on {new Date(recipe.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          )}
          {recipe.parent_recipe_slug && (
            <span>
              · Forked from{" "}
              <Link to={`/recipes/${recipe.parent_recipe_slug}`} className="underline underline-offset-2 hover:text-foreground">
                @{recipe.parent_recipe_author}'s {recipe.parent_recipe_title}
              </Link>
            </span>
          )}
          {recipe.fork_count > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
              🍴 {recipe.fork_count} FORK{recipe.fork_count !== 1 ? "S" : ""}
            </Badge>
          )}
        </div>
        {recipe.status === "published" && reviewData && reviewData.average_rating != null && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => {
                const avg = reviewData.average_rating!;
                const fill = i + 1 <= avg ? 1 : i + 0.5 <= avg ? 0.5 : 0;
                return (
                  <svg key={i} className="shrink-0" width={21} height={21} viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id={`hero-spoon-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                        <stop offset={`${fill * 100}%`} stopColor="#e2e8f0" />
                      </linearGradient>
                    </defs>
                    <path d="M15.5 2C13 2 12 4.5 12 7c0 3 2 5 3.5 5S19 10 19 7c0-2.5-1-5-3.5-5z" fill={`url(#hero-spoon-${i})`} stroke="#94a3b8" strokeWidth="0.5" />
                    <path d="M15.5 12L12 22" stroke={fill > 0 ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                );
              })}
            </div>
            <span className="text-sm font-bold text-amber-600">{reviewData.average_rating}</span>
            <span className="text-sm font-medium text-muted-foreground">·</span>
            <span className="text-sm font-semibold italic text-amber-600">
              {reviewData.average_rating >= 4.8 ? "Chef's Kiss" : reviewData.average_rating >= 4.0 ? "Community Pick" : reviewData.average_rating >= 3.5 ? "Warming Up" : reviewData.average_rating >= 2.0 ? "Acquired Taste" : "Potluck Surprise"}
            </span>
          </div>
        )}
        {recipe.description && (
          <p className="text-sm text-muted-foreground mt-2">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {recipe.serves && (
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium">
              <span>🍽️</span>
              <span>Serves {recipe.serves}</span>
            </div>
          )}
          {recipe.prep_time && (
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{recipe.prep_time} min</span>
            </div>
          )}
          {!recipe.prep_time && (
            <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/50 italic">
              <Clock className="w-3.5 h-3.5" />
              <span>Cook time TBD</span>
            </div>
          )}
        </div>
      </div>

      {/* Split grid — starts here so right column aligns with the image top */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">

        {/* ── LEFT COLUMN: Image + recipe content ──────────────────────── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Hero image fused with action strip (B1 layout) */}
          <div className="shadow-md rounded-2xl overflow-hidden">
            <div className="aspect-video w-full relative">
              {recipe.image_url && !heroImgError ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  onError={() => setHeroImgError(true)}
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${heroFallback.gradient} flex items-center justify-center`}>
                  <span className="text-6xl sm:text-7xl drop-shadow-md">{heroFallback.emoji}</span>
                </div>
              )}
              {isOwner && (!recipe.image_url || heroImgError) && (
                <Link
                  to={`/recipes/${slug}/edit`}
                  className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium hover:bg-black/50 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Add a photo to your recipe
                </Link>
              )}
            </div>

            {/* Action strip */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-indigo-50 border-t border-indigo-100/50">
              {isOwner ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[10px] uppercase font-bold text-indigo-400/80 tracking-wider">Owner Actions</span>
                  <div className="flex items-center gap-2 w-full flex-wrap">
                    <Button variant="outline" size="sm" asChild className="bg-white/50 border-indigo-100">
                      <Link to={`/recipes/${slug}/edit`}>Edit recipe</Link>
                    </Button>

                    {recipe.status === "draft" && (
                      <>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                          🧪 Draft
                        </Badge>
                        <Button
                          variant="outline" size="sm"
                          onClick={async () => {
                            try { const u = await api.post(`/recipes/${slug}/submit-for-review/`, {}, token!); setRecipe(u as Recipe); } catch { /* ignore */ }
                          }}
                          disabled={!Object.values(getPublishGate(recipe)).every(Boolean)}
                          className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1.5"
                        >
                          Submit for Review
                        </Button>
                      </>
                    )}
                    {recipe.status === "in_review" && (
                      <>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                          🔍 In Review
                        </Badge>
                        <Button
                          variant="outline" size="sm"
                          onClick={async () => {
                            try { const u = await api.post(`/recipes/${slug}/withdraw-review/`, {}, token!); setRecipe(u as Recipe); } catch { /* ignore */ }
                          }}
                          className="bg-white/50 border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          Withdraw
                        </Button>
                      </>
                    )}
                    {recipe.status === "mod_queue" && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                        ⏳ Awaiting Moderation
                      </Badge>
                    )}
                    {recipe.status === "revision_requested" && (
                      <>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                          📝 Revision Requested
                        </Badge>
                        <Button
                          variant="outline" size="sm"
                          onClick={async () => {
                            try { const u = await api.post(`/recipes/${slug}/submit-for-review/`, {}, token!); setRecipe(u as Recipe); } catch { /* ignore */ }
                          }}
                          disabled={!Object.values(getPublishGate(recipe)).every(Boolean)}
                          className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1.5"
                        >
                          Send to Moderation
                        </Button>
                      </>
                    )}
                    {recipe.status === "published" && (
                      <Button
                        variant="outline" size="sm"
                        onClick={async () => {
                          try { const u = await api.post(`/recipes/${slug}/unpublish/`, {}, token!); setRecipe(u as Recipe); } catch { /* ignore */ }
                        }}
                        className="bg-white/50 border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Unpublish
                      </Button>
                    )}

                    <div className="h-4 w-px bg-indigo-200/50 mx-1" />

                    {books.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(value) => { if (value) addToBook(Number(value)); }}>
                          <SelectTrigger className="w-[140px] h-9 bg-white/50 border-indigo-100 text-indigo-900 focus:ring-indigo-100">
                            <SelectValue placeholder="Add to collection…" />
                          </SelectTrigger>
                          <SelectContent>
                            {books.map(b => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                {b.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {saveMsg && <span className="text-sm font-medium text-indigo-600 animate-in fade-in slide-in-from-left-1">{saveMsg}</span>}
                      </div>
                    ) : null}

                    <div className="flex-1" />

                    <Button type="button" variant="outline" size="sm" onClick={() => setSharing(true)} className="bg-white/50 border-indigo-100 gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Share
                    </Button>
                    <Button
                      type="button" variant={cookNow.active ? "default" : "outline"} size="sm"
                      onClick={cookNow.active ? cookNow.release : cookNow.acquire}
                      className={cookNow.active ? "bg-amber-400 text-amber-900 hover:bg-amber-500 border-0" : "bg-white/50 border-indigo-100"}
                    >
                      🍳 {cookNow.active ? "Stop" : "Cook Now"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deleteRecipe} disabled={deleting} className="bg-white/50 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600">
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-indigo-400/80 tracking-wider">Actions</span>
                  <div className="flex items-center gap-2">
                    {token && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={forked ? () => navigate("/kitchen") : handleFork}
                        disabled={forkingInProgress}
                        className={forked
                          ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          : "border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50"
                        }
                      >
                        {forkingInProgress ? "Forking..." : forked ? "✓ Forked!" : "🍴 Make it mine"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => setSharing(true)} className="border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50 gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Share
                    </Button>
                    <Button
                      type="button" variant={cookNow.active ? "default" : "outline"} size="sm"
                      onClick={cookNow.active ? cookNow.release : cookNow.acquire}
                      className={cookNow.active ? "bg-amber-400 text-amber-900 hover:bg-amber-500 border-0" : "border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50"}
                    >
                      🍳 {cookNow.active ? "Stop" : "Cook Now"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cook Now banner — between action strip and ingredients */}
          {cookNow.active && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-400 rounded-lg text-amber-900 font-semibold text-sm">
              <span>🍳 Screen will stay on while you cook</span>
              <Button size="sm" variant="ghost" onClick={cookNow.release} className="text-amber-900 hover:bg-amber-500">
                Done cooking
              </Button>
            </div>
          )}

          {/* Ingredients — below the image, in natural reading flow */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Ingredients</h2>
            <IngredientChecklist
              ingredients={recipe.ingredients}
              inList={inList}
              onAddToList={token ? addToList : undefined}
              onBuyNow={setBuyNowIngredients}
              addBtnRef={addBtnRef}
            />
            {listMsg && (
              <p className="text-sm font-medium text-indigo-600 mt-2 animate-in fade-in slide-in-from-bottom-1">{listMsg}</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Instructions</h2>
            <div className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed">
              <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
            </div>
          </div>

          {/* Community review panel — non-owners vote during review, everyone votes on published */}
          {!isOwner && recipe.status === "in_review" && token && (
            <div id="review-panel">
              <ReviewPanel
                recipeSlug={recipe.slug}
                token={token}
                recipeStatus={recipe.status}
                reviewData={reviewData}
                onReviewData={setReviewData}
              />
            </div>
          )}
          {recipe.status === "published" && reviewData && (
            <div id="review-panel">
              <ReviewPanel
                recipeSlug={recipe.slug}
                token={token ?? ""}
                recipeStatus={recipe.status}
                reviewData={reviewData}
                onReviewData={setReviewData}
              />
            </div>
          )}

          {/* Owner review history — read-only, all rounds */}
          {(isOwner || (isStaff && recipe.status === "mod_queue")) && recipe.status !== "published" && reviewData && (reviewData.all_rounds?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Community Votes</h2>
                <span className="text-xs text-muted-foreground">
                  · {reviewData.total_votes} this round · {reviewData.all_rounds?.length} total
                </span>
              </div>

              {/* Group by round */}
              {(() => {
                const byRound: Record<number, typeof reviewData.all_rounds> = {};
                reviewData.all_rounds?.forEach(r => {
                  if (!byRound[r.round]) byRound[r.round] = [];
                  byRound[r.round]!.push(r);
                });
                return Object.entries(byRound).sort(([a], [b]) => Number(b) - Number(a)).map(([round, votes]) => {
                  const pos = votes!.filter(v => v.is_positive).length;
                  return (
                    <div key={round} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Round {round} — {pos}/{votes!.length} approved
                      </p>
                      {votes!.map((v, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span>{v.is_positive ? "👍" : "👎"}</span>
                          <div>
                            <span className="font-medium">@{v.reviewer}</span>
                            {v.comment && <p className="text-muted-foreground text-xs mt-0.5">{v.comment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Context & metadata (sticky) ────────────────── */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8 space-y-6">

            {/* Cook Mode Sticky Ingredients (Desktop only) */}
            <AnimatePresence>
              {cookNow.active && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="rounded-xl border-2 border-amber-200 bg-amber-50/30 p-5 shadow-sm overflow-hidden"
                >
                  <IngredientChecklist
                    ingredients={recipe.ingredients}
                    inList={inList}
                    onAddToList={token ? addToList : undefined}
                    onBuyNow={setBuyNowIngredients}
                    addBtnRef={addBtnRef}
                  />
                </motion.div>
              )}
            </AnimatePresence>


            {/* Notes */}
            {recipe.notes && (
              <div className={`rounded-xl bg-accent/40 border border-accent p-5 transition-opacity duration-300 ${cookNow.active ? "opacity-40" : ""}`}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Notes</h2>
                <div className="prose prose-sm prose-stone max-w-none dark:prose-invert prose-p:leading-relaxed">
                  <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Sticky Ingredients (FAB + Bottom Sheet) */}
      <CookModeIngredients
        ingredients={recipe.ingredients}
        inList={inList}
        onAddToList={token ? addToList : undefined}
        onBuyNow={setBuyNowIngredients}
        addBtnRef={addBtnRef}
        active={cookNow.active}
      />

      {/* Modals */}
      {publishModalOpen && recipe && (
        <PublishModal
          recipe={recipe}
          token={token!}
          onClose={() => setPublishModalOpen(false)}
          onPublished={(updated) => { setRecipe(updated); setPublishModalOpen(false); }}
        />
      )}
      {sharing && (
        <ShareModal
          url={window.location.href}
          title={recipe.title}
          onClose={() => setSharing(false)}
        />
      )}
      {buyNowIngredients && (
        <BuyNowSheet
          ingredients={buyNowIngredients}
          onClose={() => setBuyNowIngredients(null)}
        />
      )}
    </div>
  );
}
