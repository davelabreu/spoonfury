interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

/**
 * Builds an Instacart search URL for a list of ingredients.
 * One search term per ingredient (newline-separated) for better product matching.
 * fulfillment param reserved for Instacart Shoppable Recipe API (post-v0.4).
 */
export function buildInstacartUrl(
  ingredients: Ingredient[],
  _fulfillment: "pickup" | "delivery" = "delivery"
): string {
  if (ingredients.length === 0) return "https://www.instacart.com";

  const terms = ingredients
    .map(i => `${i.quantity} ${i.unit} ${i.name}`.trim().replace(/\s+/g, " "))
    .join("\n");

  return `https://www.instacart.com/store/search_v3/term?term=${encodeURIComponent(terms)}`;
}
