import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { ForkModal } from "@/components/ForkModal";
import { ShareModal } from "@/components/ShareModal";
import { ChevronLeft } from "lucide-react";
import type { Ingredient } from "@/types";
import { BuyNowSheet } from "@/components/BuyNowSheet";
import { useWakeLock } from "@/hooks/useWakeLock";

interface Book {
  id: number;
  title: string;
}

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, username } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<any>(null);
  const [error, setError] = useState("");
  const [forking, setForking] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cookNow = useWakeLock();
  const [buyNowIngredients, setBuyNowIngredients] = useState<Ingredient[] | null>(null);
  const [listMsg, setListMsg] = useState("");
  const [inList, setInList] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/recipes/${slug}/`).then(setRecipe).catch(() => setError("Recipe not found."));
  }, [slug]);

  useEffect(() => {
    if (token) {
      api.get("/books/", token).then((data: any) => setBooks(data.results ?? data));
    }
  }, [token]);

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
    } catch {
      setListMsg("Failed to add to list.");
      setTimeout(() => setListMsg(""), 2500);
    }
  };

  if (error) return <div className="max-w-2xl mx-auto py-12"><p className="text-destructive font-medium">{error}</p><Button variant="link" onClick={() => navigate("/")} className="mt-4 p-0">← Back to home</Button></div>;
  if (!recipe) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      {/* Cook Now banner */}
      {cookNow.active && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-400 rounded-lg text-amber-900 font-semibold text-sm">
          <span>🍳 Screen will stay on while you cook</span>
          <Button size="sm" variant="ghost" onClick={cookNow.release} className="text-amber-900 hover:bg-amber-500">
            Done cooking
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center -ml-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>
          <Badge variant="secondary" className="shrink-0 mt-1">{recipe.category}</Badge>
        </div>
        {recipe.parent_recipe_slug && (
          <p className="text-sm text-muted-foreground mt-1">
            Forked from{" "}
            <Link to={`/recipes/${recipe.parent_recipe_slug}`} className="underline">
              @{recipe.parent_recipe_author}'s {recipe.parent_recipe_title}
            </Link>
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          by @{recipe.author_username}
        </p>
        
        {recipe.fork_count > 0 && (
          <div className="mt-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
              🍴 {recipe.fork_count} FORK{recipe.fork_count !== 1 ? "S" : ""}
            </Badge>
          </div>
        )}

        {/* Action bar — visible to all, contents depend on role/auth */}
        <div className="flex flex-wrap items-center gap-3 mt-4 px-4 py-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
          {isOwner ? (
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[10px] uppercase font-bold text-indigo-400/80 tracking-wider">Owner Actions</span>
              <div className="flex items-center gap-2 w-full">
                <Button variant="outline" size="sm" asChild className="bg-white/50 border-indigo-100">
                  <Link to={`/recipes/${slug}/edit`}>Edit recipe</Link>
                </Button>
                
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

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSharing(true)}
                  className="bg-white/50 border-indigo-100 gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Share
                </Button>

                {cookNow.supported && (
                  <Button
                    type="button"
                    variant={cookNow.active ? "default" : "outline"}
                    size="sm"
                    onClick={cookNow.active ? cookNow.release : cookNow.acquire}
                    className={cookNow.active ? "bg-amber-400 text-amber-900 hover:bg-amber-500 border-0" : "bg-white/50 border-indigo-100"}
                  >
                    🍳 {cookNow.active ? "Stop" : "Cook Now"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteRecipe}
                  disabled={deleting}
                  className="bg-white/50 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-indigo-400/80 tracking-wider">Actions</span>
              <div className="flex items-center gap-2">
                {token && (
                  <Button variant="outline" size="sm" onClick={() => setForking(true)} className="w-full sm:w-auto border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50">
                    🍴 Make it mine
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSharing(true)}
                  className="border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50 gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Share
                </Button>

                {cookNow.supported && (
                  <Button
                    type="button"
                    variant={cookNow.active ? "default" : "outline"}
                    size="sm"
                    onClick={cookNow.active ? cookNow.release : cookNow.acquire}
                    className={cookNow.active ? "bg-amber-400 text-amber-900 hover:bg-amber-500 border-0" : "border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50"}
                  >
                    🍳 {cookNow.active ? "Stop" : "Cook Now"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-base leading-relaxed">{recipe.description}</p>
      <p className="text-sm text-muted-foreground">Serves: {recipe.serves}</p>

      <Separator />
      <IngredientChecklist
        ingredients={recipe.ingredients}
        inList={inList}
        onAddToList={token ? addToList : undefined}
        onBuyNow={setBuyNowIngredients}
      />
      {listMsg && (
        <p className="text-sm font-medium text-indigo-600 animate-in fade-in slide-in-from-bottom-1">{listMsg}</p>
      )}
      <Separator />

      <div>
        <h2 className="font-semibold text-lg mb-3">Instructions</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
        </div>
      </div>

      {recipe.notes && (
        <>
          <Separator />
          <div>
            <h2 className="font-semibold text-lg mb-3">Notes</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{recipe.notes}</ReactMarkdown>
            </div>
          </div>
        </>
      )}

      {forking && (
        <ForkModal
          recipe={recipe}
          token={token!}
          onClose={() => setForking(false)}
          onSuccess={(bookId: number) => navigate(`/books/${bookId}`)}
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
    </article>
  );
}
