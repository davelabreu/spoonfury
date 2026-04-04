import type { ReviewsResponse } from "@/types";

interface ReviewBannerProps {
  reviewData: ReviewsResponse;
  hasVoted: boolean;
}

export function ReviewBanner({ reviewData, hasVoted }: ReviewBannerProps) {
  const { total_votes, positive_votes, review_round, threshold_met } = reviewData;
  const negative_votes = total_votes - positive_votes;

  // Progress toward threshold: need 3+ votes and 80% positive
  const votesNeeded = Math.max(0, 3 - total_votes);
  const approvalPct = total_votes > 0 ? Math.round((positive_votes / total_votes) * 100) : 0;
  const progressToThreshold = Math.min(100, Math.round((total_votes / 3) * 100));

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 space-y-2.5">
      {/* Row 1: heading + round badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🗳️</span>
          <span className="text-sm font-bold text-indigo-900">
            {threshold_met ? "Threshold reached! Heading to moderation…" : "Under Community Review"}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Round {review_round}
          </span>
        </div>
        {!hasVoted && (
          <a
            href="#review-panel"
            className="text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
          >
            Cast your vote ↓
          </a>
        )}
        {hasVoted && (
          <span className="text-xs font-semibold text-indigo-500">✓ You voted</span>
        )}
      </div>

      {/* Row 2: vote tally + progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            👍 {positive_votes} approve
          </span>
          <span className="flex items-center gap-1 font-semibold text-red-500">
            👎 {negative_votes} need work
          </span>
          {total_votes > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {approvalPct}% positive
            </span>
          )}
        </div>

        {/* Progress bar toward 3-vote minimum */}
        <div className="relative h-2 bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progressToThreshold}%`,
              background: threshold_met
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : approvalPct >= 80
                ? "linear-gradient(90deg, #6366f1, #818cf8)"
                : "linear-gradient(90deg, #6366f1, #a5b4fc)",
            }}
          />
        </div>

        <p className="text-[11px] text-indigo-500">
          {threshold_met
            ? "80% approval reached — awaiting moderator review"
            : votesNeeded > 0
            ? `${votesNeeded} more vote${votesNeeded !== 1 ? "s" : ""} needed to reach minimum`
            : approvalPct >= 80
            ? "Threshold met! Waiting to auto-promote…"
            : `${total_votes} vote${total_votes !== 1 ? "s" : ""} in — needs 80% approval to advance`}
        </p>
      </div>
    </div>
  );
}
