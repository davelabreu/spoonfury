import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { useState } from "react";

/**
 * RecipeCard — compact horizontal card for recipe listings.
 *
 * Layout: thumbnail on the left (~140px, shrinks to ~100px on mobile),
 * text content on the right (title, description, author, fork count).
 *
 * When the recipe has no image (or the image fails to load), we show
 * a category-themed emoji + gradient placeholder instead.
 */

interface RecipeCardProps {
  recipe: {
    slug: string;
    title: string;
    description: string;
    image_url: string;
    category: string;
    author_username: string;
    fork_count: number;
  };
}

/**
 * Format the fork count into a human-readable string.
 * "Forked once", "Forked 5 times", etc.
 */
function formatForkCount(count: number): string {
  if (count === 1) return "Forked once";
  return `Forked ${count} times`;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { slug, title, description, image_url, category, author_username, fork_count } = recipe;
  const fallback = getCategoryFallback(category);

  // Track whether the image failed to load — if so, show the placeholder
  const [imgError, setImgError] = useState(false);
  const showImage = image_url && !imgError;

  return (
    <Link
      to={`/recipes/${slug}`}
      className="flex rounded-xl overflow-hidden border hover:border-foreground/20 hover:shadow-sm transition-all"
    >
      {/* Left: thumbnail or category placeholder */}
      <div className="w-[100px] sm:w-[140px] shrink-0 relative">
        {showImage ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          // Placeholder: category emoji on a matching gradient background
          <div
            className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-sm">{fallback.emoji}</span>
          </div>
        )}
      </div>

      {/* Right: text content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
        {/* Title + category badge */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>
          <Badge variant="secondary" className="shrink-0 text-xs">{category}</Badge>
        </div>

        {/* Description — 2 line clamp so cards stay uniform height */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
          {description}
        </p>

        {/* Author + fork count */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>by @{author_username}</span>
          {fork_count > 0 && (
            <span className="text-amber-600 font-medium">
              🍴 {formatForkCount(fork_count)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
