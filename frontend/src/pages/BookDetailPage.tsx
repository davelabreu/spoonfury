import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BookDetailPage({ shared = false }: { shared?: boolean }) {
  const { id, token: shareToken } = useParams<{ id?: string; token?: string }>();
  const { token } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    if (shared && shareToken) {
      api.get(`/books/share/${shareToken}/`).then(setBook);
    } else if (id && token) {
      api.get(`/books/${id}/`, token).then(setBook);
    }
  }, [id, shareToken, token]);

  const togglePublic = async () => {
    if (!token || !id) return;
    const updated = await api.patch(`/books/${id}/`, { is_public: !book.is_public }, token);
    setBook((b: any) => ({ ...b, is_public: updated.is_public }));
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/books/share/${book.share_token}`;
    navigator.clipboard.writeText(url);
    setCopyMsg("Copied!");
    setTimeout(() => setCopyMsg(""), 2000);
  };

  if (!book) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-sm text-muted-foreground">by @{book.owner_username}</p>
        </div>
        {!shared && (
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
            className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors">
            <div>
              <p className="font-medium text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground">by @{r.author_username}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{r.category}</Badge>
          </Link>
        ))}
        {book.recipes?.length === 0 && (
          <p className="text-muted-foreground text-sm">No recipes in this book yet.</p>
        )}
      </div>
    </div>
  );
}
