import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function HomePage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/recipes/")
      .then(data => setRecipes(data.results || []))
      .catch(() => setError("Failed to load recipes. Try refreshing."));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Latest Recipes</h1>
      <div className="space-y-4">
        {recipes.map((r: any) => (
          <Link key={r.slug} to={`/recipes/${r.slug}`} className="block border rounded-lg p-4 hover:bg-accent transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-2">by @{r.author_username}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary">{r.category}</Badge>
                {r.fork_count > 0 && <span className="text-xs text-muted-foreground">🍴 {r.fork_count}</span>}
              </div>
            </div>
          </Link>
        ))}
        {recipes.length === 0 && <p className="text-muted-foreground">No recipes yet. Be the first!</p>}
      </div>
    </div>
  );
}
