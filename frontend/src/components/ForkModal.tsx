import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fork "{recipe.title}"</DialogTitle>
          <DialogDescription>
            This will go to your test kitchen — you can perfect and publish it later.
          </DialogDescription>
        </DialogHeader>

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
            <label className="text-sm font-medium block mb-1">Save to book</label>
            <Select value={String(bookId ?? "")} onValueChange={v => setBookId(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                {books.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={books.length === 0 || loading}
          >
            {loading ? "Forking..." : "Fork it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
