import { X, Search, UtensilsCrossed, Globe, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// ─── Chip definitions ────────────────────────────────────────────────────────

const CATEGORY_CHIPS = [
  { label: "🍔 Sandwich & Burger", value: "sandwich_burger" },
  { label: "🍕 Pizza", value: "pizza" },
  { label: "🍲 Soup", value: "soup" },
  { label: "🥗 Salad", value: "salad" },
  { label: "🍝 Pasta & Noodles", value: "pasta_noodles" },
  { label: "🥩 Meat & Seafood", value: "meat_seafood" },
  { label: "🥣 Bowl", value: "bowl" },
  { label: "🍞 Casserole & Bake", value: "casserole_bake" },
  { label: "🥦 Side Dish", value: "side_dish" },
  { label: "🫙 Sauce & Condiment", value: "sauce_condiment" },
  { label: "🍳 Breakfast & Bakery", value: "breakfast_bakery" },
  { label: "🍰 Dessert", value: "dessert" },
  { label: "🍹 Drink", value: "drink" },
  { label: "🍿 Snack & App", value: "snack_app" },
] as const;

const CUISINE_CHIPS = [
  { label: "🇺🇸 American", value: "american" },
  { label: "🇮🇹 Italian", value: "italian" },
  { label: "🇲🇽 Mexican", value: "mexican" },
  { label: "🌏 Asian", value: "asian" },
  { label: "🇪🇸 European & Iberian", value: "european-iberian" },
  { label: "🫒 Mediterranean & Middle Eastern", value: "mediterranean" },
  { label: "🌎 Latin American", value: "latin-american" },
] as const;

const LIFESTYLE_CHIPS = [
  { label: "⚡ Quick & Easy", value: "quick-easy" },
  { label: "🌱 Vegetarian & Vegan", value: "vegetarian-vegan" },
  { label: "💪 Health & Fitness", value: "health-fitness" },
  { label: "🌙 Weeknight Staples", value: "weeknight-staples" },
  { label: "🚫 Gluten-Free / Dairy-Free", value: "gluten-free-dairy-free" },
  { label: "🥩 High Protein / Keto", value: "high-protein-keto" },
  { label: "📦 Meal Prep / Freezer", value: "meal-prep-freezer" },
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

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterShelf({ filters, onChange, onSearch, onClear }: FilterShelfProps) {
  const active = hasActiveFilter(filters);
  const activeCount = [filters.category, filters.cuisine, filters.lifestyle].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 sm:p-5 space-y-5">
      {/* Category row */}
      <FilterRow
        icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
        label="Category"
        color="indigo"
        chips={CATEGORY_CHIPS}
        value={filters.category}
        onValueChange={(v) => onChange({ ...filters, category: v })}
      />

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Cuisine & Heritage row */}
      <FilterRow
        icon={<Globe className="h-3.5 w-3.5" />}
        label="Cuisine & Heritage"
        color="amber"
        chips={CUISINE_CHIPS}
        value={filters.cuisine}
        onValueChange={(v) => onChange({ ...filters, cuisine: v })}
      />

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Lifestyle row */}
      <FilterRow
        icon={<Leaf className="h-3.5 w-3.5" />}
        label="Lifestyle"
        color="green"
        chips={LIFESTYLE_CHIPS}
        value={filters.lifestyle}
        onValueChange={(v) => onChange({ ...filters, lifestyle: v })}
      />

      {/* Action bar */}
      {active && (
        <div className="flex items-center gap-3 pt-2 border-t border-border/40">
          <Button size="sm" onClick={onSearch} className="rounded-full px-5 gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] bg-white/20 text-white border-0">
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

const ROW_STYLES = {
  indigo: {
    label: "text-indigo-600",
    chip: "border-indigo-200/60 bg-indigo-50/40 hover:bg-indigo-100/60 hover:border-indigo-300/60 data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=on]:border-indigo-600 data-[state=on]:shadow-md data-[state=on]:shadow-indigo-200",
  },
  amber: {
    label: "text-amber-600",
    chip: "border-amber-200/60 bg-amber-50/40 hover:bg-amber-100/60 hover:border-amber-300/60 data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:border-amber-600 data-[state=on]:shadow-md data-[state=on]:shadow-amber-200",
  },
  green: {
    label: "text-green-600",
    chip: "border-green-200/60 bg-green-50/40 hover:bg-green-100/60 hover:border-green-300/60 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-600 data-[state=on]:shadow-md data-[state=on]:shadow-green-200",
  },
} as const;

function FilterRow({
  icon,
  label,
  color,
  chips,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  color: "indigo" | "amber" | "green";
  chips: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const styles = ROW_STYLES[color];

  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2.5 ${styles.label}`}>
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-widest">
          {label}
        </p>
      </div>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-2"
      >
        {chips.map((c) => (
          <ToggleGroupItem
            key={c.value}
            value={c.value}
            className={`rounded-full border text-xs h-8 px-3.5 transition-all duration-200 cursor-pointer ${styles.chip}`}
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
