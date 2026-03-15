import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recipe, Book } from "@/types";

interface ForkModalProps {
  recipe: Recipe;
  token: string;
  onClose: () => void;
  onSuccess: (bookId: number) => void;
}

export function ForkModal({ recipe, token, onClose, onSuccess }: ForkModalProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/books/", token).then((data: any) => {
      const results: Book[] = data.results ?? data;
      setBooks(results);
      if (results.length > 0) setBookId(results[0].id);
    });
  }, [token]);

  const submit = async () => {
    if (!bookId) return;
    setLoading(true);
    setError("");
    try {
      const forked = await api.post(
        `/recipes/${recipe.slug}/fork/`,
        {
          title: `${recipe.title} (my version)`,
          description: recipe.description,
          serves: recipe.serves,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          notes: recipe.notes || "",
        },
        token,
      );
      await api.post(`/books/${bookId}/add-recipe/`, { recipe_slug: forked.slug }, token);
      onSuccess(bookId);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to fork. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl bg-white animate-in zoom-in-95 duration-200 border-none">
        <CardHeader>
          <CardTitle className="text-black">Fork "{recipe.title}"</CardTitle>
          <p className="text-sm text-muted-foreground">
            A copy will be saved to your book. Edit it from there.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {books.length === 0 ? (
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-4">
                You don't have a book yet. Create one to start building your collection.
              </p>
              <Button asChild className="w-full">
                <a href="/books" onClick={onClose}>Create my first book</a>
              </Button>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1 text-black">Save to book</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-white text-black"
                value={bookId ?? ""}
                onChange={e => setBookId(Number(e.target.value))}
              >
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={submit}
              disabled={books.length === 0 || loading}
              className="flex-1"
            >
              {loading ? "Forking…" : "Fork it 🍴"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-black border-slate-200 hover:bg-slate-50">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
