import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getCategoryFallback } from "@/lib/categoryFallback";
import type { Recipe } from "@/types";

function HotCard({ recipe }: { recipe: Recipe }) {
  const [imgErr, setImgErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);
  const showImage = recipe.image_url && !imgErr;

  return (
    <Link to={`/recipes/${recipe.slug}`} className="group">
      <Card className="relative overflow-hidden rounded-2xl border-0 shadow-sm py-0 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
        {/* Full-bleed image */}
        <div className="absolute inset-0">
          {showImage ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}>
              <span className="text-6xl drop-shadow-lg">{fallback.emoji}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        <CardContent className="relative flex min-h-[220px] flex-col justify-between p-5 sm:p-6">
          {/* Top: badges + quick action */}
          <div className="flex justify-between items-start">
            <Badge className="backdrop-blur-md bg-white/20 text-white hover:bg-white/30 border-0 text-[10px]">
              {recipe.category.replace(/_/g, " ")}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-white/15 text-white backdrop-blur-md opacity-0 translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hover:bg-white/30 h-8 w-8"
              tabIndex={-1}
            >
              <ChefHat className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom: text content */}
          <div className="text-white">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight mb-2">
              {recipe.title}
            </h3>
            <p className="text-sm text-white/60 line-clamp-2 mb-3">
              {recipe.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-white/70 opacity-0 translate-y-2 transition-all duration-300 delay-75 group-hover:opacity-100 group-hover:translate-y-0">
              <span>@{recipe.author_username}</span>
              {recipe.fork_count > 0 && (
                <>
                  <span className="text-white/40">·</span>
                  <span>🍴 {recipe.fork_count}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HotCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-0 py-0">
      <div className="min-h-[220px] p-5 sm:p-6 flex flex-col justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </Card>
  );
}

export function HotStrip() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/recipes/hot/")
      .then((data) => {
        setRecipes(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && recipes.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <h2 className="text-base font-bold tracking-tight">Hot this month</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <>
            <HotCardSkeleton />
            <HotCardSkeleton />
          </>
        ) : (
          recipes.map((r) => <HotCard key={r.slug} recipe={r} />)
        )}
      </div>
    </section>
  );
}
