interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

/**
 * Builds an Instacart search URL for a list of ingredients.
 * Uses Instacart's search page as a simple entry point.
 * Real affiliate API integration comes post-prototype.
 */
export function buildInstacartUrl(ingredients: Ingredient[]): string {
  if (ingredients.length === 0) return "https://www.instacart.com";

  const query = ingredients
    .map(i => `${i.quantity} ${i.unit} ${i.name}`.trim().replace(/\s+/g, " "))
    .join(", ");

  return `https://www.instacart.com/store/search_v3/term?term=${encodeURIComponent(query)}`;
}
