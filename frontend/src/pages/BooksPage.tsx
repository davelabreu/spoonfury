import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function BooksPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    if (token) {
      api.get("/books/", token)
        .then(d => setBooks(d.results || d))
        .catch(() => setError("Failed to load books. Try refreshing."));
    }
  };

  useEffect(() => { load(); }, [token]);

  const createBook = async () => {
    if (!newTitle.trim() || !token) return;
    try {
      await api.post("/books/", { title: newTitle }, token);
      setNewTitle("");
      load();
    } catch {
      setError("Failed to create book.");
    }
  };

  if (!token) return <p>Please <a href="/login" className="underline">sign in</a> to manage your books.</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Recipe Books</h1>
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="New book title..."
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createBook()} />
        <Button onClick={createBook}>Create</Button>
      </div>
      <div className="grid gap-4">
        {books.map((book: any) => (
          <Link key={book.id} to={`/books/${book.id}`}>
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{book.title}</h2>
                  <p className="text-sm text-muted-foreground">{book.recipe_count} recipes · {book.is_public ? "Public" : "Private"}</p>
                </div>
                <span className="text-muted-foreground text-sm">→</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {books.length === 0 && <p className="text-muted-foreground">No books yet. Create your first one!</p>}
      </div>
    </div>
  );
}
