import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Curated cover palette — each book gets a deterministic gradient by id
const COVER_GRADIENTS = [
  "from-indigo-500 via-indigo-600 to-violet-700",
  "from-rose-400 via-rose-500 to-pink-600",
  "from-amber-400 via-amber-500 to-orange-600",
  "from-teal-400 via-teal-500 to-emerald-600",
  "from-slate-500 via-slate-600 to-slate-700",
  "from-sky-400 via-sky-500 to-blue-600",
  "from-lime-400 via-lime-500 to-green-600",
  "from-fuchsia-400 via-fuchsia-500 to-purple-600",
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
              <div className={`aspect-[3/4] w-full bg-gradient-to-br ${coverGradient(book.id)} flex flex-col items-center justify-center relative`}>
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
