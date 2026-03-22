// frontend/src/lib/pricing.ts

/**
 * Deterministic mock pricing for ingredients.
 * Uses simple string hashing so the same ingredient always gets the same price.
 * Range: $0.49 – $12.99
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getEstimatedPrice(ingredientName: string): number {
  const hash = hashString(ingredientName.toLowerCase().trim());
  const price = 0.49 + (hash % 1250) / 100; // $0.49 – $12.99
  return Math.round(price * 100) / 100;
}

/**
 * Deterministic mock rating for a recipe.
 * Returns 3.5 – 5.0 based on slug hashing.
 */
export function getMockedRating(recipeSlug: string): number {
  const hash = hashString(recipeSlug);
  const rating = 3.5 + (hash % 16) / 10; // 3.5 – 5.0
  return Math.round(rating * 10) / 10;
}

/** Renders N filled spoons + remainder empty. Max 5. */
export function renderSpoonRating(rating: number): string {
  const full = Math.floor(rating);
  const spoons = "🥄".repeat(full);
  return `${spoons} ${rating.toFixed(1)}`;
}

// ── Fee schedule ──
export const FEES = {
  pickup: 1.99,
  delivery: 5.99,
  taxRate: 0.085,
} as const;

export type Fulfillment = "pickup" | "delivery";

export function calculateSummary(
  recipeSubtotals: { slug: string; title: string; multiplier: number; subtotal: number }[],
  fulfillment: Fulfillment
) {
  const subtotal = recipeSubtotals.reduce((sum, r) => sum + r.subtotal, 0);
  const tax = Math.round(subtotal * FEES.taxRate * 100) / 100;
  const fee = FEES[fulfillment];
  const total = Math.round((subtotal + tax + fee) * 100) / 100;
  return { subtotal, tax, fee, total, fulfillment };
}
