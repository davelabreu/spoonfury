import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe } from "@/types";

function HotCard({ recipe }: { recipe: Recipe }) {
  const [imgErr, setImgErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);
  const showImage = recipe.image_url && !imgErr;

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex rounded-xl overflow-hidden border border-border hover:border-foreground/20 hover:shadow-md transition-all bg-card"
    >
      {/* Thumbnail */}
      <div className="w-24 sm:w-32 shrink-0">
        {showImage ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}
          >
            <span className="text-3xl drop-shadow-sm">{fallback.emoji}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm sm:text-base truncate group-hover:text-orange-600 transition-colors">
            {recipe.title}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {recipe.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
          {recipe.description}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>@{recipe.author_username}</span>
          {recipe.fork_count > 0 && (
            <span className="text-amber-600 font-semibold">🍴 {recipe.fork_count}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function HotStrip() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    api.get("/recipes/hot/")
      .then((data) => setRecipes(data || []))
      .catch(() => {});
  }, []);

  if (recipes.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Hot this month
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recipes.map((r) => (
          <HotCard key={r.slug} recipe={r} />
        ))}
      </div>
    </section>
  );
}
