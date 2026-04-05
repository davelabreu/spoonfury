import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// ─── Chip definitions ────────────────────────────────────────────────────────

const CATEGORY_CHIPS = [
  { label: "Sandwich & Burger", value: "sandwich_burger" },
  { label: "Pizza", value: "pizza" },
  { label: "Soup", value: "soup" },
  { label: "Salad", value: "salad" },
  { label: "Pasta & Noodles", value: "pasta_noodles" },
  { label: "Meat & Seafood", value: "meat_seafood" },
  { label: "Bowl", value: "bowl" },
  { label: "Casserole & Bake", value: "casserole_bake" },
  { label: "Side Dish", value: "side_dish" },
  { label: "Sauce & Condiment", value: "sauce_condiment" },
  { label: "Breakfast & Bakery", value: "breakfast_bakery" },
  { label: "Dessert", value: "dessert" },
  { label: "Drink", value: "drink" },
  { label: "Snack & App", value: "snack_app" },
] as const;

const CUISINE_CHIPS = [
  { label: "American", value: "american" },
  { label: "Italian", value: "italian" },
  { label: "Mexican", value: "mexican" },
  { label: "Asian", value: "asian" },
  { label: "European & Iberian", value: "european-iberian" },
  { label: "Mediterranean & Middle Eastern", value: "mediterranean" },
  { label: "Latin American", value: "latin-american" },
] as const;

const LIFESTYLE_CHIPS = [
  { label: "Quick & Easy", value: "quick-easy" },
  { label: "Vegetarian & Vegan", value: "vegetarian-vegan" },
  { label: "Health & Fitness", value: "health-fitness" },
  { label: "Weeknight Staples", value: "weeknight-staples" },
  { label: "Gluten-Free / Dairy-Free", value: "gluten-free-dairy-free" },
  { label: "High Protein / Keto", value: "high-protein-keto" },
  { label: "Meal Prep / Freezer", value: "meal-prep-freezer" },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterState {
  category: string;
  cuisine: string;
  lifestyle: string;
}

interface FilterShelfProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onSearch: () => void;
  onClear: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasActiveFilter(f: FilterState) {
  return f.category || f.cuisine || f.lifestyle;
}

function chipClass(color: "indigo" | "amber" | "green") {
  const map = {
    indigo:
      "data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-800 data-[state=on]:border-indigo-300",
    amber:
      "data-[state=on]:bg-amber-100 data-[state=on]:text-amber-800 data-[state=on]:border-amber-300",
    green:
      "data-[state=on]:bg-green-100 data-[state=on]:text-green-800 data-[state=on]:border-green-300",
  };
  return `rounded-full border border-border text-xs h-8 px-3 hover:bg-muted/60 transition-colors ${map[color]}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterShelf({ filters, onChange, onSearch, onClear }: FilterShelfProps) {
  const active = hasActiveFilter(filters);
  const activeCount = [filters.category, filters.cuisine, filters.lifestyle].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Category row */}
      <FilterRow
        label="Category"
        color="indigo"
        chips={CATEGORY_CHIPS}
        value={filters.category}
        onValueChange={(v) => onChange({ ...filters, category: v })}
      />

      {/* Cuisine & Heritage row */}
      <FilterRow
        label="Cuisine & Heritage"
        color="amber"
        chips={CUISINE_CHIPS}
        value={filters.cuisine}
        onValueChange={(v) => onChange({ ...filters, cuisine: v })}
      />

      {/* Lifestyle row */}
      <FilterRow
        label="Lifestyle"
        color="green"
        chips={LIFESTYLE_CHIPS}
        value={filters.lifestyle}
        onValueChange={(v) => onChange({ ...filters, lifestyle: v })}
      />

      {/* Action bar */}
      {active && (
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" onClick={onSearch} className="rounded-full px-5">
            Search
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          </Button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Row sub-component ───────────────────────────────────────────────────────

function FilterRow({
  label,
  color,
  chips,
  value,
  onValueChange,
}: {
  label: string;
  color: "indigo" | "amber" | "green";
  chips: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-1.5"
      >
        {chips.map((c) => (
          <ToggleGroupItem key={c.value} value={c.value} className={chipClass(color)}>
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
