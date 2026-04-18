import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import type { ReviewsResponse, RecipeStatus } from "@/types";

interface ReviewPanelProps {
  recipeSlug: string;
  token: string;
  recipeStatus: RecipeStatus;
  reviewData?: ReviewsResponse | null;
  onReviewData?: (data: ReviewsResponse) => void;
  readOnly?: boolean;
}

function SpoonIcon({ fill, prefix, index, size = 16 }: { fill: number; prefix: string; index: number; size?: number }) {
  return (
    <svg className="shrink-0" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${prefix}-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path d="M15.5 2C13 2 12 4.5 12 7c0 3 2 5 3.5 5S19 10 19 7c0-2.5-1-5-3.5-5z" fill={`url(#${prefix}-${index})`} stroke="#94a3b8" strokeWidth="0.5" />
      <path d="M15.5 12L12 22" stroke={fill > 0 ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ReviewPanel({ recipeSlug, token, recipeStatus, reviewData: externalData, onReviewData, readOnly = false }: ReviewPanelProps) {
  const [localData, setLocalData] = useState<ReviewsResponse | null>(null);
  const reviewData = externalData !== undefined ? externalData : localData;
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isPublished = recipeStatus === "published";

  const updateReviewData = (data: ReviewsResponse) => {
    setLocalData(data);
    onReviewData?.(data);
  };

  useEffect(() => {
    if (externalData !== undefined) return;
    api.get(`/recipes/${recipeSlug}/reviews/`, token)
      .then((data: ReviewsResponse) => setLocalData(data))
      .catch(() => {});
  }, [recipeSlug, token]);

  const handleSubmit = async () => {
    if (selectedRating === null) return;
    setSubmitting(true);
    setError("");
    try {
      const body = { rating: selectedRating, comment };
      await api.post(`/recipes/${recipeSlug}/review/`, body, token);
      const updated = await api.get(`/recipes/${recipeSlug}/reviews/`, token) as ReviewsResponse;
      updateReviewData(updated);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to submit review.");
    }
    setSubmitting(false);
  };

  if (!reviewData) return null;

  const displayRating = reviewData.average_rating != null
    ? reviewData.average_rating
    : 0;

  const canVote = !readOnly && !!token && !reviewData.has_voted;
  const submitDisabled = selectedRating === null || submitting;

  const dist = reviewData.rating_distribution ?? {};
  const ratedCount = reviewData.rated_count ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/30 bg-white/60 backdrop-blur-xl p-6 shadow-[0_0_24px_rgba(249,115,22,0.08),0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">
      {/* Top accent beam */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />

      <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">Community Review</h3>

      {/* ── PUBLISHED: 3-column Micro Center layout ── */}
      {isPublished ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            {/* COL 1: Rating Snapshot */}
            <div>
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">Rating Snapshot</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = dist[String(stars)] ?? 0;
                  const pct = ratedCount > 0 ? (count / ratedCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 w-[52px] shrink-0">{stars} spoon{stars !== 1 ? "s" : ""}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COL 2: Overall Rating */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">Overall Rating</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-foreground leading-none">
                  {reviewData.average_rating != null ? reviewData.average_rating : "—"}
                </span>
              </div>
              <div className="flex gap-0.5 mt-1.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const fill = i + 1 <= displayRating ? 1 : i + 0.5 <= displayRating ? 0.5 : 0;
                  return <SpoonIcon key={i} fill={fill} prefix="spoon-overall" index={i} size={18} />;
                })}
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1.5">
                {ratedCount} review{ratedCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* COL 3: Rate this Recipe (or voted confirmation) */}
            <div>
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {canVote ? "Rate this Recipe" : reviewData.has_voted && token ? "Your Review" : ""}
              </p>
              {canVote ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => {
                      const spoonValue = i + 1;
                      const active = (hoverRating ?? selectedRating ?? 0) >= spoonValue;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedRating(spoonValue)}
                          onMouseEnter={() => setHoverRating(spoonValue)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="cursor-pointer transition-transform duration-150 hover:scale-110 p-0.5"
                        >
                          <SpoonIcon fill={active ? 1 : 0} prefix="spoon-input" index={i} size={32} />
                        </button>
                      );
                    })}
                  </div>
                  {selectedRating && (
                    <span className="text-xs font-bold text-amber-600">{selectedRating} / 5 spoons</span>
                  )}
                </div>
              ) : reviewData.has_voted && token ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> You've submitted your review
                </span>
              ) : !token ? (
                <p className="text-[11px] text-muted-foreground">Log in to rate this recipe</p>
              ) : null}
            </div>
          </div>

          {/* Comment + Submit — below the 3-column grid when voting */}
          {canVote && (
            <div className="mt-4 space-y-3">
              <textarea
                placeholder="Optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-[11px] font-mono tracking-wide outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled}
                className="w-full py-3 bg-amber-500 text-white font-black uppercase tracking-wide rounded-xl shadow-[0_4px_14px_rgba(245,158,11,0.2)] hover:bg-amber-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </>
      ) : (
        /* ── IN-REVIEW: existing gate layout ── */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            {/* COL 1: Rating Snapshot */}
            <div>
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">Rating Snapshot</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = dist[String(stars)] ?? 0;
                  const pct = ratedCount > 0 ? (count / ratedCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 w-[52px] shrink-0">{stars} spoon{stars !== 1 ? "s" : ""}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COL 2: Overall Rating + Gate Progress */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">Overall Rating</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-foreground leading-none">
                  {reviewData.average_rating != null ? reviewData.average_rating : "—"}
                </span>
              </div>
              <div className="flex gap-0.5 mt-1.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const fill = i + 1 <= displayRating ? 1 : i + 0.5 <= displayRating ? 0.5 : 0;
                  return <SpoonIcon key={i} fill={fill} prefix="spoon-gate" index={i} size={18} />;
                })}
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1.5">
                {ratedCount} review{ratedCount !== 1 ? "s" : ""}
              </p>
              {/* Gate status — only while still accumulating votes */}
              {recipeStatus === "in_review" && !reviewData.threshold_met && (
                <p className="text-[10px] font-mono text-amber-600 mt-2">
                  Needs {Math.max(0, 5 - ratedCount)} more review{Math.max(0, 5 - ratedCount) !== 1 ? "s" : ""} &amp; ≥4.0 avg
                </p>
              )}
            </div>

            {/* COL 3: Rate this Recipe (or voted confirmation) */}
            <div>
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {canVote ? "Rate this Recipe" : reviewData.has_voted && token ? "Your Review" : ""}
              </p>
              {canVote ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => {
                      const spoonValue = i + 1;
                      const active = (hoverRating ?? selectedRating ?? 0) >= spoonValue;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedRating(spoonValue)}
                          onMouseEnter={() => setHoverRating(spoonValue)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="cursor-pointer transition-transform duration-150 hover:scale-110 p-0.5"
                        >
                          <SpoonIcon fill={active ? 1 : 0} prefix="spoon-gate-input" index={i} size={32} />
                        </button>
                      );
                    })}
                  </div>
                  {selectedRating && (
                    <span className="text-xs font-bold text-amber-600">{selectedRating} / 5 spoons</span>
                  )}
                </div>
              ) : reviewData.has_voted && token ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> You've submitted your review
                </span>
              ) : !token ? (
                <p className="text-[11px] text-muted-foreground">Log in to rate this recipe</p>
              ) : null}
            </div>
          </div>

          {/* Comment + Submit — below the 3-column grid when voting */}
          {canVote && (
            <div className="mt-4 space-y-3">
              <textarea
                placeholder="Optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-[11px] font-mono tracking-wide outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled}
                className="w-full py-3 bg-amber-500 text-white font-black uppercase tracking-wide rounded-xl shadow-[0_4px_14px_rgba(245,158,11,0.2)] hover:bg-amber-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </>
      )}

      {/* Revealed reviews */}
      {reviewData.reviews && reviewData.reviews.length > 0 && (
        <div className={`space-y-2.5 mt-4 pt-3 border-t border-slate-200/60`}>
          <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">All Reviews</p>
          {reviewData.reviews.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {r.rating != null ? (
                <div className="flex gap-px shrink-0 mt-0.5">
                  {Array.from({ length: 5 }, (_, j) => (
                    <SpoonIcon key={j} fill={j + 1 <= r.rating! ? 1 : 0} prefix={`rev-${i}`} index={j} size={12} />
                  ))}
                </div>
              ) : (
                <span>{r.is_positive ? "👍" : "👎"}</span>
              )}
              <div>
                <span className="font-medium">@{r.reviewer}</span>
                {r.comment && (
                  <p className="text-muted-foreground mt-0.5 text-[12px]">{r.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
