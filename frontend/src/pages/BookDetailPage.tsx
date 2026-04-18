import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function BookDetailPage({ shared = false }: { shared?: boolean }) {
  const { id, token: shareToken } = useParams<{ id?: string; token?: string }>();
  const { token, username } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const loadBook = () => {
    if (shared && shareToken) {
      api.get(`/books/share/${shareToken}/`)
        .then(setBook)
        .catch(() => setError("Failed to load book."));
    } else if (id && token) {
      api.get(`/books/${id}/`, token)
        .then(setBook)
        .catch(() => setError("Failed to load book."));
    }
  };

  useEffect(() => {
    loadBook();
  }, [id, shareToken, token, shared]);

  const togglePublic = async () => {
    if (!token || !id) return;
    try {
      const updated = await api.patch(`/books/${id}/`, { is_public: !book.is_public }, token);
      setBook((b: any) => ({ ...b, is_public: updated.is_public }));
    } catch {
      setError("Failed to update visibility.");
    }
  };

  const removeFromBook = async (e: React.MouseEvent, recipeSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !id) return;
    
    if (!window.confirm("Remove this recipe from the book?")) return;

    try {
      await api.post(`/books/${id}/remove-recipe/`, { recipe_slug: recipeSlug }, token);
      setBook((b: any) => ({
        ...b,
        recipes: b.recipes.filter((r: any) => r.slug !== recipeSlug)
      }));
    } catch {
      alert("Failed to remove recipe from book.");
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/books/share/${book.share_token}`;
    navigator.clipboard.writeText(url);
    setCopyMsg("Copied!");
    setTimeout(() => setCopyMsg(""), 2000);
  };

  const isOwner = book && username && book.owner_username === username;

  if (!book && !error) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-sm text-muted-foreground">by @{book.owner_username}</p>
        </div>
        {!shared && isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={togglePublic}>
              {book.is_public ? "Make private" : "Make public"}
            </Button>
            {book.is_public && (
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                {copyMsg || "Copy share link"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {(book.recipes || []).map((r: any) => (
          <Link key={r.slug} to={`/recipes/${r.slug}`}
            className="group flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{r.title}</p>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{r.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">by @{r.author_username}</p>
              </div>
            </div>

            {isOwner && !shared && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => removeFromBook(e, r.slug)}
                className="gap-1.5 p-1.5 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Remove recipe from book</span>
              </Button>
            )}
          </Link>
        ))}
        {book.recipes?.length === 0 && (
          <p className="text-muted-foreground text-sm">No recipes in this book yet.</p>
        )}
      </div>
    </div>
  );
}
