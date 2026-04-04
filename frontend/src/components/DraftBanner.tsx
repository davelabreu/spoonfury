import { Link } from "react-router-dom";
import type { Recipe, PublishGate } from "@/types";

interface DraftBannerProps {
  recipe: Recipe;
  gate: PublishGate;
  slug: string;
}

const GATE_ITEMS: { label: string; key: keyof PublishGate }[] = [
  { label: "2+ ingredients", key: "hasEnoughIngredients" },
  { label: "Description", key: "hasDescription" },
  { label: "Instructions (20+ chars)", key: "hasInstructions" },
  { label: "Category", key: "hasCategory" },
];

export function DraftBanner({ recipe, gate, slug }: DraftBannerProps) {
  const metCount = Object.values(gate).filter(Boolean).length;
  const total = GATE_ITEMS.length;
  const isReady = metCount === total;

  const isRevision = recipe.status === "revision_requested";

  // Color scheme: amber = incomplete draft, green = ready to submit, orange = revision requested
  const scheme = isRevision
    ? {
        border: "border-l-4 border-l-orange-400 border-b border-b-orange-200",
        bg: "bg-orange-50",
        titleColor: "text-orange-900",
        pillStatus: "bg-orange-200 text-orange-900",
        score: "text-orange-700",
        editColor: "text-orange-700",
      }
    : isReady
    ? {
        border: "border-l-4 border-l-emerald-500 border-b border-b-emerald-200",
        bg: "bg-emerald-50",
        titleColor: "text-emerald-900",
        pillStatus: "bg-emerald-200 text-emerald-900",
        score: "text-emerald-700",
        editColor: "text-emerald-700",
      }
    : {
        border: "border-l-4 border-l-amber-400 border-b border-b-amber-200",
        bg: "bg-amber-50",
        titleColor: "text-amber-900",
        pillStatus: "bg-amber-200 text-amber-900",
        score: "text-amber-700",
        editColor: "text-amber-700",
      };

  const statusLabel = isRevision
    ? "Revision requested"
    : isReady
    ? "Ready to submit for review!"
    : "Only you can see this";

  return (
    <div className={`px-4 py-2.5 ${scheme.bg} ${scheme.border}`}>
      {/* Row 1: title + status pill + edit link */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 text-sm font-bold ${scheme.titleColor}`}>
          <span>🧪</span>
          <span>Test Kitchen Draft</span>
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${scheme.pillStatus}`}
          >
            {statusLabel}
          </span>
        </div>
        <Link
          to={`/recipes/${slug}/edit`}
          className={`text-xs font-semibold underline underline-offset-2 ${scheme.editColor}`}
        >
          Edit recipe →
        </Link>
      </div>

      {/* Row 2: gate pills + score */}
      <div className="flex flex-wrap items-center gap-1.5">
        {GATE_ITEMS.map(({ label, key }) => {
          const met = gate[key];
          return (
            <span
              key={key}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                met
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {met ? "✓" : "○"} {label}
            </span>
          );
        })}
        <span className={`text-[10px] font-extrabold ml-auto ${scheme.score}`}>
          {metCount}/{total}
        </span>
      </div>
    </div>
  );
}
