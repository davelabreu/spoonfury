/**
 * categoryFallback.ts
 *
 * Maps recipe categories to emoji + Tailwind gradient classes.
 * Used as a visual placeholder when a recipe has no image — both
 * in RecipeCard thumbnails and the RecipePage hero section.
 *
 * Categories match the Django model's CATEGORY_CHOICES exactly.
 * Unknown categories fall back to a neutral default.
 */

interface CategoryFallback {
  emoji: string;
  /** Tailwind gradient classes for the placeholder background */
  gradient: string;
}

/**
 * Each entry maps a lowercase category slug to its visual fallback.
 * Gradients are chosen to feel appetizing and category-appropriate.
 */
const CATEGORY_MAP: Record<string, CategoryFallback> = {
  sandwich_burger:  { emoji: "🍔", gradient: "from-amber-400 to-amber-600" },
  pizza:            { emoji: "🍕", gradient: "from-red-400 to-orange-500" },
  soup:             { emoji: "🍲", gradient: "from-amber-400 to-amber-600" },
  salad:            { emoji: "🥗", gradient: "from-green-400 to-green-600" },
  pasta_noodles:    { emoji: "🍝", gradient: "from-orange-400 to-orange-600" },
  meat_seafood:     { emoji: "🥩", gradient: "from-red-400 to-red-600" },
  bowl:             { emoji: "🥣", gradient: "from-teal-400 to-teal-600" },
  casserole_bake:   { emoji: "🍞", gradient: "from-amber-300 to-amber-500" },
  side_dish:        { emoji: "🥦", gradient: "from-lime-400 to-lime-600" },
  sauce_condiment:  { emoji: "🫙", gradient: "from-rose-400 to-rose-600" },
  breakfast_bakery: { emoji: "🍳", gradient: "from-yellow-300 to-yellow-500" },
  dessert:          { emoji: "🍰", gradient: "from-pink-300 to-pink-500" },
  drink:            { emoji: "🍹", gradient: "from-cyan-400 to-cyan-600" },
  snack_app:        { emoji: "🍿", gradient: "from-violet-400 to-violet-600" },
  other:            { emoji: "🍽️", gradient: "from-slate-400 to-slate-500" },
};

/** Neutral fallback for categories not in the map */
const DEFAULT_FALLBACK: CategoryFallback = {
  emoji: "🍽️",
  gradient: "from-slate-400 to-slate-500",
};

/**
 * Get the emoji + gradient for a recipe category.
 * Case-insensitive lookup with a safe default.
 */
export function getCategoryFallback(category: string): CategoryFallback {
  return CATEGORY_MAP[category.toLowerCase()] ?? DEFAULT_FALLBACK;
}
