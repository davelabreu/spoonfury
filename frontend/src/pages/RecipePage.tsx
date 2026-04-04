import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { ForkModal } from "@/components/ForkModal";
import { ShareModal } from "@/components/ShareModal";
import { PublishModal } from "@/components/PublishModal";
import { ChevronLeft, Camera } from "lucide-react";
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
  const { token, username } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [forking, setForking] = useState(false);
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
    if (!token || !recipe || recipe.status !== "in_review") return;
    api.get(`/recipes/${recipe.slug}/reviews/`, token)
      .then((data: ReviewsResponse) => setReviewData(data))
      .catch(() => {});
  }, [token, recipe?.slug, recipe?.status]);

  useEffect(() => {
    if (!token || !recipe) return;
    api.get(`/shopping-list/status/?recipe_slug=${recipe.slug}`, token)
      .then((data: any) => setInList(data.in_list))
      .catch(() => {});
  }, [token, recipe]);

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
      {/* Cook Now banner */}
      {cookNow.active && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-400 rounded-lg text-amber-900 font-semibold text-sm">
          <span>🍳 Screen will stay on while you cook</span>
          <Button size="sm" variant="ghost" onClick={cookNow.release} className="text-amber-900 hover:bg-amber-500">
            Done cooking
          </Button>
        </div>
      )}

      {/* Back navigation */}
      <div className="flex items-center -ml-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Status banners — full width */}
      {isOwner && (recipe.status === "draft" || recipe.status === "revision_requested") && (
        <DraftBanner status={recipe.status} gate={getPublishGate(recipe)} slug={slug!} />
      )}
      {!isOwner && recipe.status === "in_review" && token && reviewData && (
        <ReviewBanner reviewData={reviewData} hasVoted={reviewData.has_voted} />
      )}

      {/* Editorial header — full width above the split grid */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          spoonfury / {recipe.category.replace(/_/g, " ")}
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">{recipe.title}</h1>
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span>by @{recipe.author_username}</span>
          {recipe.serves && <span>· Serves {recipe.serves}</span>}
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
                          Resubmit for Review
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
                        <select
                          className="border border-indigo-100 rounded px-2 py-1 text-sm bg-white/50 text-indigo-900 focus:outline-none"
                          defaultValue=""
                          onChange={e => { if (e.target.value) addToBook(Number(e.target.value)); e.target.value = ""; }}
                        >
                          <option value="" disabled>Add to book…</option>
                          {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>
                        {saveMsg && <span className="text-sm font-medium text-indigo-600 animate-in fade-in slide-in-from-left-1">{saveMsg}</span>}
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" asChild className="text-indigo-400">
                        <Link to="/books" className="underline underline-offset-4">Create a book first</Link>
                      </Button>
                    )}

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
                      <Button variant="outline" size="sm" onClick={() => setForking(true)} className="border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50">
                        🍴 Make it mine
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

          {/* Community review panel — non-owners when recipe is in_review */}
          {!isOwner && recipe.status === "in_review" && token && (
            <div id="review-panel">
              <ReviewPanel
                recipeSlug={recipe.slug}
                token={token}
                reviewData={reviewData}
                onReviewData={setReviewData}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Context & metadata (sticky) ────────────────── */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8 space-y-6">

            {/* About this recipe */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{recipe.description}</p>

              {/* Quick-stat pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {recipe.serves && (
                  <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium">
                    <span>🍽️</span>
                    <span>Serves {recipe.serves}</span>
                  </div>
                )}
                {/* Cook time — placeholder for future field */}
                <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/50 italic">
                  <span>⏱️</span>
                  <span>Cook time TBD</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {recipe.notes && (
              <div className="rounded-xl bg-accent/40 border border-accent p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Notes</h2>
                <div className="prose prose-sm prose-stone max-w-none dark:prose-invert prose-p:leading-relaxed">
                  <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modals */}
      {publishModalOpen && recipe && (
        <PublishModal
          recipe={recipe}
          token={token!}
          onClose={() => setPublishModalOpen(false)}
          onPublished={(updated) => { setRecipe(updated); setPublishModalOpen(false); }}
        />
      )}
      {forking && (
        <ForkModal
          recipe={recipe}
          token={token!}
          onClose={() => setForking(false)}
          onSuccess={() => navigate("/kitchen")}
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
