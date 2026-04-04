import { Link } from "react-router-dom";
import type { PublishGate, ModerationFeedbackItem } from "@/types";

interface DraftBannerProps {
  status: string;
  gate: PublishGate;
  slug: string;
  /** Most recent moderator feedback, if status is revision_requested */
  moderationFeedback?: ModerationFeedbackItem[];
}

const GATE_ITEMS: { label: string; key: keyof PublishGate }[] = [
  { label: "2+ ingredients", key: "hasEnoughIngredients" },
  { label: "Description", key: "hasDescription" },
  { label: "Instructions (20+ chars)", key: "hasInstructions" },
  { label: "Category", key: "hasCategory" },
];

export function DraftBanner({ status, gate, slug, moderationFeedback }: DraftBannerProps) {
  const metCount = Object.values(gate).filter(Boolean).length;
  const total = GATE_ITEMS.length;
  const isReady = metCount === total;
  const isRevision = status === "revision_requested";

  const latestFeedback = moderationFeedback?.[0];

  // Color scheme: amber = incomplete draft, green = ready to submit, orange = revision requested
  const scheme = isRevision
    ? {
        border: "border-l-4 border-l-orange-400 border border-orange-200",
        bg: "bg-orange-50",
        titleColor: "text-orange-900",
        pillStatus: "bg-orange-200 text-orange-900",
        score: "text-orange-700",
        editColor: "text-orange-700",
      }
    : isReady
    ? {
        border: "border-l-4 border-l-emerald-500 border border-emerald-200",
        bg: "bg-emerald-50",
        titleColor: "text-emerald-900",
        pillStatus: "bg-emerald-200 text-emerald-900",
        score: "text-emerald-700",
        editColor: "text-emerald-700",
      }
    : {
        border: "border-l-4 border-l-amber-400 border border-amber-200",
        bg: "bg-amber-50",
        titleColor: "text-amber-900",
        pillStatus: "bg-amber-200 text-amber-900",
        score: "text-amber-700",
        editColor: "text-amber-700",
      };

  const statusLabel = isRevision
    ? "Revision requested"
    : isReady
    ? "Ready to submit!"
    : "Only you can see this";

  return (
    <div className={`rounded-xl px-4 py-3 space-y-3 ${scheme.bg} ${scheme.border}`}>
      {/* Row 1: title + status pill + edit link */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-bold ${scheme.titleColor}`}>
          <span>🧪</span>
          <span>Test Kitchen Draft</span>
          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${scheme.pillStatus}`}>
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

      {/* Moderator feedback block — shown when revision was requested */}
      {isRevision && latestFeedback && (
        <div className="rounded-lg border border-orange-200 bg-white/60 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
            Moderator feedback · Round {latestFeedback.round}
          </p>
          <p className="text-sm text-orange-900 leading-relaxed">{latestFeedback.feedback}</p>
          <p className="text-[10px] text-orange-400">
            — @{latestFeedback.moderator} · {new Date(latestFeedback.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Gate pills + score */}
      <div className="flex flex-wrap items-center gap-1.5">
        {GATE_ITEMS.map(({ label, key }) => {
          const met = gate[key];
          return (
            <span
              key={key}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                met ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
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
