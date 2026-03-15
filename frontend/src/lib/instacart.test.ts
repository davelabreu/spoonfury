import { describe, it, expect } from "vitest";
import { buildInstacartUrl } from "./instacart";
import type { Ingredient } from "@/types";

describe("buildInstacartUrl", () => {
  it("returns base URL for empty ingredients", () => {
    expect(buildInstacartUrl([])).toBe("https://www.instacart.com");
  });

  it("builds a search URL with encoded ingredients", () => {
    const ingredients: Ingredient[] = [
      { quantity: "2", unit: "lb", name: "chicken breast", note: "organic" },
      { quantity: "1", unit: "bag", name: "spinach", note: "" },
    ];
    const url = buildInstacartUrl(ingredients);
    
    // Expect terms joined by newline: "2 lb chicken breast\n1 bag spinach"
    const expectedTerms = "2 lb chicken breast\n1 bag spinach";
    expect(url).toContain(encodeURIComponent(expectedTerms));
    expect(url).toBe(`https://www.instacart.com/store/search_v3/term?term=${encodeURIComponent(expectedTerms)}`);
  });

  it("trims extra whitespace from terms", () => {
    const ingredients: Ingredient[] = [
      { quantity: "  1 ", unit: " ", name: " apple  ", note: "" },
    ];
    const url = buildInstacartUrl(ingredients);
    expect(url).toContain(encodeURIComponent("1 apple"));
  });
});
