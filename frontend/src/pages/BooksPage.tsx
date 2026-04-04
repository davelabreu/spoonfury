import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Curated cover palette — CSS gradient strings, used as inline styles
// (avoids Tailwind's static scan missing dynamically-chosen class names)
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)",
  "linear-gradient(135deg, #f87171, #f43f5e, #ec4899)",
  "linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c)",
  "linear-gradient(135deg, #2dd4bf, #14b8a6, #059669)",
  "linear-gradient(135deg, #64748b, #475569, #334155)",
  "linear-gradient(135deg, #38bdf8, #0ea5e9, #2563eb)",
  "linear-gradient(135deg, #a3e635, #84cc16, #16a34a)",
  "linear-gradient(135deg, #e879f9, #d946ef, #a855f7)",
];

function coverGradient(id: number) {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
}

// Derive a decorative initial / monogram from the book title
function coverInitial(title: string) {
  return title.trim().slice(0, 1).toUpperCase() || "B";
}

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
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header + create bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Your collection</p>
          <h1 className="text-3xl font-bold tracking-tight">My Recipe Books</h1>
        </div>
        <div className="flex gap-2 max-w-xs w-full">
          <input
            className="flex-1 border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="New book title…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createBook()}
          />
          <Button onClick={createBook}>Create</Button>
        </div>
      </div>

      {/* Library grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {books.map((book: any) => (
          <Link key={book.id} to={`/books/${book.id}`} className="group block">
            <Card className="overflow-hidden border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1.5">

              {/* Book cover — gradient with monogram */}
              <div
                className="aspect-[3/4] w-full flex flex-col items-center justify-center relative"
                style={{ background: coverGradient(book.id) }}
              >
                {/* Spine accent — left edge strip */}
                <div className="absolute inset-y-0 left-0 w-2.5 bg-black/20 rounded-l" />

                {/* Monogram */}
                <span className="text-5xl font-black text-white/20 select-none leading-none">
                  {coverInitial(book.title)}
                </span>

                {/* Public / private badge — bottom-right */}
                <div className="absolute bottom-3 right-3">
                  <Badge
                    variant={book.is_public ? "default" : "secondary"}
                    className={`text-[10px] font-bold ${book.is_public ? "bg-white/20 text-white border-white/30 backdrop-blur-sm" : "bg-black/25 text-white/70 border-white/10"}`}
                  >
                    {book.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>

              {/* Spine info */}
              <CardContent className="px-3 py-3 space-y-0.5">
                <h2 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {book.title}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {book.recipe_count ?? 0} {book.recipe_count === 1 ? "recipe" : "recipes"}
                </p>
              </CardContent>

            </Card>
          </Link>
        ))}

        {/* Empty state */}
        {books.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-medium">Your shelf is empty.</p>
            <p className="text-sm mt-1">Create your first collection above.</p>
          </div>
        )}
      </div>

    </div>
  );
}
