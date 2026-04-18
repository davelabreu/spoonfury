import { CheckCircle2 } from "lucide-react";
import type { ReviewsResponse, RecipeStatus } from "@/types";

interface ReviewBannerProps {
  reviewData: ReviewsResponse;
  hasVoted: boolean;
  /** When true, render owner-facing copy. */
  isOwner?: boolean;
  /** Recipe status — distinguishes in_review from mod_queue for owner copy. */
  status?: RecipeStatus;
}

// Steam-inspired tier phrases based on average spoon rating
function getTierPhrase(avg: number): string {
  if (avg >= 4.8) return "Chef's Kiss";
  if (avg >= 4.0) return "Community Pick";
  if (avg >= 3.5) return "Warming Up";
  if (avg >= 2.0) return "Acquired Taste";
  return "Potluck Surprise";
}

// SVG ring circumference for r=15.5
const CIRCUMFERENCE = 2 * Math.PI * 15.5; // ~97.4

export function ReviewBanner({ reviewData, hasVoted, isOwner = false, status }: ReviewBannerProps) {
  const { total_votes, review_round, threshold_met, average_rating } = reviewData;
  const inModQueue = status === "mod_queue";

  const votesNeeded = Math.max(0, 5 - total_votes);
  const avgRating = average_rating ?? 0;
  // Ring shows progress toward 4.0 threshold (capped at 100%)
  const ringPct = total_votes > 0 ? Math.min(100, Math.round((avgRating / 4.0) * 100)) : 0;
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * ringPct) / 100;

  // Color scheme by tier (based on avg spoon rating)
  const tier =
    inModQueue ? "violet" :
    threshold_met ? "emerald" :
    avgRating >= 4.8 ? "emerald" :
    avgRating >= 4.0 ? "indigo" :
    avgRating >= 3.5 ? "amber" :
    avgRating >= 2.0 ? "orange" :
    total_votes === 0 ? "indigo" :
    "red";

  const scheme = {
    violet: {
      border: "border-violet-200/30",
      stripe: "from-violet-500 via-purple-400 to-fuchsia-400",
      ringTrack: "#ede9fe",
      ringGrad: ["#8b5cf6", "#a855f7"],
      ringText: "text-violet-600",
      pill: "bg-violet-100/60 text-violet-700",
      phrase: "text-violet-600",
      hint: "text-muted-foreground",
      cta: "text-violet-600",
      ctaBtn: "border-violet-500/30 bg-violet-50/50 hover:bg-violet-500 hover:text-white",
      ctaPing: "bg-violet-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]",
      beam: ["#8b5cf6", "#a855f7"],
      glow: "0 0 24px rgba(139,92,246,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(139,92,246,0.4))",
      ctaFill: "#8b5cf6",
    },
    emerald: {
      border: "border-emerald-200/30",
      stripe: "from-emerald-500 via-emerald-400 to-teal-400",
      ringTrack: "#d1fae5",
      ringGrad: ["#10b981", "#14b8a6"],
      ringText: "text-emerald-600",
      pill: "bg-emerald-100/60 text-emerald-700",
      phrase: "text-emerald-600",
      hint: "text-muted-foreground",
      cta: "text-emerald-600",
      ctaBtn: "border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-500 hover:text-white",
      ctaPing: "bg-emerald-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
      beam: ["#10b981", "#14b8a6"],
      glow: "0 0 24px rgba(16,185,129,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(16,185,129,0.4))",
      ctaFill: "#10b981",
    },
    indigo: {
      border: "border-indigo-200/30",
      stripe: "from-indigo-500 via-violet-400 to-purple-400",
      ringTrack: "#e0e7ff",
      ringGrad: ["#6366f1", "#a78bfa"],
      ringText: "text-indigo-600",
      pill: "bg-indigo-100/60 text-indigo-700",
      phrase: "text-indigo-600",
      hint: "text-muted-foreground",
      cta: "text-indigo-600",
      ctaBtn: "border-indigo-500/30 bg-indigo-50/50 hover:bg-indigo-500 hover:text-white",
      ctaPing: "bg-indigo-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]",
      beam: ["#6366f1", "#a78bfa"],
      glow: "0 0 24px rgba(99,102,241,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(99,102,241,0.4))",
      ctaFill: "#6366f1",
    },
    amber: {
      border: "border-amber-200/30",
      stripe: "from-amber-400 via-yellow-400 to-amber-300",
      ringTrack: "#fef3c7",
      ringGrad: ["#f59e0b", "#fbbf24"],
      ringText: "text-amber-600",
      pill: "bg-amber-100/60 text-amber-700",
      phrase: "text-amber-600",
      hint: "text-muted-foreground",
      cta: "text-amber-600",
      ctaBtn: "border-amber-500/30 bg-amber-50/50 hover:bg-amber-500 hover:text-white",
      ctaPing: "bg-amber-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]",
      beam: ["#f59e0b", "#fbbf24"],
      glow: "0 0 24px rgba(245,158,11,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(245,158,11,0.4))",
      ctaFill: "#f59e0b",
    },
    orange: {
      border: "border-orange-200/30",
      stripe: "from-orange-400 via-amber-400 to-orange-300",
      ringTrack: "#ffedd5",
      ringGrad: ["#f97316", "#fb923c"],
      ringText: "text-orange-500",
      pill: "bg-orange-100/60 text-orange-700",
      phrase: "text-orange-500",
      hint: "text-muted-foreground",
      cta: "text-orange-600",
      ctaBtn: "border-orange-500/30 bg-orange-50/50 hover:bg-orange-500 hover:text-white",
      ctaPing: "bg-orange-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]",
      beam: ["#f97316", "#fb923c"],
      glow: "0 0 24px rgba(249,115,22,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(249,115,22,0.4))",
      ctaFill: "#f97316",
    },
    red: {
      border: "border-red-200/30",
      stripe: "from-red-400 via-rose-400 to-red-300",
      ringTrack: "#fee2e2",
      ringGrad: ["#ef4444", "#f87171"],
      ringText: "text-red-500",
      pill: "bg-red-100/60 text-red-700",
      phrase: "text-red-500",
      hint: "text-muted-foreground",
      cta: "text-red-600",
      ctaBtn: "border-red-500/30 bg-red-50/50 hover:bg-red-500 hover:text-white",
      ctaPing: "bg-red-400",
      ctaHover: "hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]",
      beam: ["#ef4444", "#f87171"],
      glow: "0 0 24px rgba(239,68,68,0.12)",
      glass: "bg-white/60",
      ringGlow: "drop-shadow(0 0 6px rgba(239,68,68,0.4))",
      ctaFill: "#ef4444",
    },
  }[tier];

  const gradId = `ring-grad-${tier}`;

  // Heading
  const heading = isOwner
    ? inModQueue
      ? "Your recipe is in the moderator queue"
      : threshold_met
      ? "Threshold reached"
      : "Your recipe is under community review"
    : threshold_met
    ? "Threshold reached"
    : "Community Review";

  // Status pill
  const pillLabel = inModQueue
    ? "Mod queue"
    : threshold_met
    ? "Passed"
    : `Round ${review_round}`;

  // Footer hint — mono readout chip for numbers
  const chip = "font-mono font-bold text-slate-800 bg-foreground/5 rounded px-1 py-px";
  const hint = inModQueue ? (
    <>Passed community review — a moderator will take a look soon</>
  ) : threshold_met ? (
    <>≥<span className={chip}>4.0</span> avg reached — awaiting moderator review</>
  ) : votesNeeded > 0 ? (
    <>Needs <span className={chip}>{votesNeeded}</span> more review{votesNeeded !== 1 ? "s" : ""} (min <span className={chip}>5</span>) and ≥<span className={chip}>4.0</span> avg to advance</>
  ) : avgRating >= 4.0 ? (
    <>Threshold met — waiting to auto-promote</>
  ) : (
    <><span className={chip}>{total_votes}</span> review{total_votes !== 1 ? "s" : ""} in — needs ≥<span className={chip}>4.0</span> avg to advance</>
  );

  // Ring interior
  const ringInterior = inModQueue ? (
    <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ) : threshold_met ? (
    <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : total_votes > 0 ? (
    <div className="flex flex-col items-center justify-center">
      <span className={`text-sm font-black leading-none ${scheme.ringText}`}>
        {avgRating.toFixed(1)}
      </span>
      <span className={`text-[7px] font-bold uppercase tracking-widest mt-0.5 ${scheme.ringText} opacity-50`}>
        avg
      </span>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <span className={`text-xs font-black leading-none ${scheme.ringText}`}>0/5</span>
      <span className={`text-[7px] font-bold uppercase tracking-widest mt-0.5 ${scheme.ringText} opacity-50`}>
        reviews
      </span>
    </div>
  );

  const tierPhrase = total_votes > 0 && !inModQueue ? getTierPhrase(avgRating) : null;

  const ctaText = "Cast Your Vote";

  const beamStyle = {
    "--beam-color": scheme.beam[0],
    "--beam-color2": scheme.beam[1],
    boxShadow: `${scheme.glow}, 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)`,
  } as React.CSSProperties;

  return (
    <div className="relative rounded-xl" style={beamStyle}>
      {/* Border beam overlay */}
      <div className="review-beam" />

      <div className={`rounded-xl ${scheme.glass} backdrop-blur-xl border ${scheme.border} overflow-hidden relative`}>
        {/* Top gradient stripe */}
        <div className={`h-1 bg-gradient-to-r ${scheme.stripe}`} />

        <div className="px-8 py-1.5 flex items-center gap-6">
          {/* GAUGE COLUMN — ring + vote badges */}
          <div className="flex flex-col items-center gap-2 shrink-0 min-w-[90px]">
            {/* Progress ring — ambient glow */}
            <div className="relative h-14 w-14" style={{ filter: scheme.ringGlow }}>
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={scheme.ringTrack} strokeWidth="2" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={scheme.ringGrad[0]} />
                    <stop offset="100%" stopColor={scheme.ringGrad[1]} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {ringInterior}
              </div>
            </div>

            {/* Vote badges — inset LCD style */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-amber-500 bg-amber-50/50 border border-amber-200/60 rounded px-2 py-0.5">
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 2C13 2 12 4.5 12 7c0 3 2 5 3.5 5S19 10 19 7c0-2.5-1-5-3.5-5z" /><path d="M15.5 12L12 22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                <span className="text-[10px] font-bold font-mono">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400 bg-slate-100/50 border border-slate-200/60 rounded px-2 py-0.5">
                <span className="text-[10px] font-bold font-mono">{total_votes}</span>
                <span className="text-[9px] font-mono text-slate-400">review{total_votes !== 1 ? "s" : ""}</span>
              </span>
            </div>
          </div>

          {/* INFO COLUMN — text content */}
          <div className="flex-1 flex flex-col justify-center gap-1">
            {/* Row 1: heading + pill */}
            <div className="flex items-center gap-2">
              <span className="text-base font-bold leading-none text-foreground">{heading}</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${scheme.pill}`}>
                {pillLabel}
              </span>
              {!isOwner && hasVoted && (
                <span className={`text-xs font-semibold ${scheme.cta}`}>
                  <CheckCircle2 className="inline h-3 w-3 mr-0.5 -mt-px" /> You voted
                </span>
              )}
            </div>

            {/* Row 2: tier phrase — subtle pulse while live */}
            {tierPhrase && (
              <p className={`text-base font-bold italic tracking-tight animate-pulse ${scheme.phrase}`}
                 style={{ animationDuration: "3s" }}>
                {tierPhrase}
              </p>
            )}

            {/* Row 3: vote slots or text hint */}
            {votesNeeded > 0 && !inModQueue && !threshold_met ? (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const filled = i < total_votes;
                  const nextEmpty = i === total_votes;
                  return (
                    <div
                      key={i}
                      className={`w-4 h-2 rounded-full ${
                        filled
                          ? "shadow-[0_0_8px_currentColor]"
                          : nextEmpty
                          ? "bg-slate-200 animate-pulse"
                          : "bg-slate-200"
                      }`}
                      style={filled ? { background: scheme.ctaFill, color: scheme.ctaFill } : undefined}
                    />
                  );
                })}
                <span className="ml-1.5 text-xs font-mono font-bold text-slate-400">
                  {votesNeeded} more review{votesNeeded !== 1 ? "s" : ""} needed to publish recipe!
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">{hint}</p>
            )}
          </div>

          {/* CTA — vertically centered against the whole banner */}
          {!isOwner && !hasVoted && (
            <a href="#review-panel" className="cta-group flex items-center gap-2.5 no-underline shrink-0" style={{ "--cta-color": scheme.ctaFill } as React.CSSProperties}>
              <div className="spoon-area relative flex items-center justify-center w-10 h-10 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}>
                <svg className="spoon-icon w-[27px] h-[27px] transition-all duration-300" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }}>
                  <defs>
                    <linearGradient id="spoon-satin" x1="20%" y1="0%" x2="80%" y2="100%">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="50%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                  </defs>
                  <path d="M15.5 2C13 2 12 4.5 12 7c0 3 2 5 3.5 5S19 10 19 7c0-2.5-1-5-3.5-5z" fill="url(#spoon-satin)" stroke="#94a3b8" strokeWidth="0.4" />
                  <path d="M15.5 12L12 22" stroke="#b0b8c4" strokeWidth="2" strokeLinecap="round" />
                  <ellipse cx="14.8" cy="5.8" rx="1.2" ry="2.5" fill="white" opacity="0.3" transform="rotate(-15 14.8 5.8)" />
                </svg>
                <div className="ember-bed absolute pointer-events-none" style={{ top: "4px", left: "12px" }}>
                  <span style={{ left: 0, width: 4, height: 4, background: "#f59e0b", animation: "ember-rise-drift 1s infinite 0s" }} />
                  <span style={{ left: 8, width: 4, height: 4, background: "#f97316", animation: "ember-rise-drift 1s infinite 0.25s" }} />
                  <span style={{ left: 4, width: 3.5, height: 3.5, background: "#ef4444", animation: "ember-rise-drift 1s infinite 0.5s" }} />
                  <span style={{ left: -3, width: 3, height: 3, background: "#fbbf24", animation: "ember-rise-drift 1s infinite 0.75s" }} />
                  <span style={{ left: 10, width: 3, height: 3, background: "#fb923c", animation: "ember-rise-drift 1s infinite 0.1s" }} />
                </div>
              </div>
              <span
                className={`cta-vote-btn relative overflow-visible text-xs font-bold uppercase tracking-wider ${scheme.cta} border ${scheme.ctaBtn} px-4 py-1.5 rounded-md backdrop-blur-sm transition-all duration-300 ${scheme.ctaHover}`}
                style={{ animation: "breathe-glow 3s ease-in-out infinite" }}
              >
                {ctaText}
                {/* Sparks */}
                <span className="absolute w-[3px] h-[3px] rounded-full pointer-events-none" style={{ background: scheme.ctaFill, top: -2, right: 8, "--sx": "6px", "--sy": "-10px", animation: "spark-float 1.5s ease-out infinite 0s" } as React.CSSProperties} />
                <span className="absolute w-[3px] h-[3px] rounded-full pointer-events-none" style={{ background: scheme.ctaFill, top: 4, right: -2, "--sx": "10px", "--sy": "-4px", animation: "spark-float 1.5s ease-out infinite 0.5s" } as React.CSSProperties} />
                <span className="absolute w-[3px] h-[3px] rounded-full pointer-events-none" style={{ background: scheme.ctaFill, bottom: -1, right: 14, "--sx": "4px", "--sy": "8px", animation: "spark-float 1.5s ease-out infinite 1s" } as React.CSSProperties} />
                <span className="absolute w-[3px] h-[3px] rounded-full pointer-events-none" style={{ background: scheme.ctaFill, top: 8, left: -1, "--sx": "-8px", "--sy": "-6px", animation: "spark-float 1.5s ease-out infinite 0.3s" } as React.CSSProperties} />
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
