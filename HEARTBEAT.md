# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-05-17
**Focus:** Revisiting Spoonfury for a quick PM agent session to prepare for next steps. And cleaning up.
**Branch:** `master`
**Status:** No code shipped — strategy + housekeeping only.

### What happened
- **FANG-style PM review for beta readiness.** Verdict: "alpha-plus, not beta-ready." Strong product DNA, uneven choreography. Fork mechanic feels like a button click instead of a moment. Cook Mode is the most under-celebrated feature in the app (wake lock + amber banner where there should be a full environment shift).
- **Critique persisted to `docs/TODO.md`** as a new top-level `🚦 Beta Readiness — Pre-Beta UI / Visual Overhaul` section. Covers: hero moments for Fork + Cook, visual rhythm consistency, onboarding + empty states, non-visual blockers (error handling / social login / analytics), mobile pass. Strategic recommendation: build celebration moments first, let the design system emerge from them — and **start with Cook Mode**.
- **Vercel deployment prep landed** (was uncommitted from prior work): `whitenoise` middleware + storage, `dj-database-url` for `DATABASE_URL`, `.vercel.app` in ALLOWED_HOSTS, CORS regex for Vercel subdomains, `.vercel` + `.env*.local` in `.gitignore`.
- **Plugins enabled**: `context7`, `code-review`, `playwright` added to `.claude/settings.json`.

---

## Current State

**Branch:** `master`
**Version:** v0.10 (Collections rebrand)
**Deployment posture:** Backend now Vercel-deploy-capable (settings + requirements), though no `vercel.ts` / project link is wired yet.

---

## Up Next (priority order)

1. **Cook Mode overhaul** — full environment shift (chrome dim, large-type instructions, step focus, sticky ingredients, nav indicator). Highest-leverage screen. See `docs/TODO.md` → Beta Readiness §1.
2. **Fork celebration** — confetti / lineage animation / "tell @author" nudge. Brand North Star verb deserves more than a toast.
3. **Error handling pass** — no more infinite "Loading..." on failed fetches.
4. **Analytics instrumentation** — fork, cook-mode-enter, add-to-list, share, signup. Must be in place before beta testers land.
5. **Social login** — Google/Apple OAuth via django-allauth.
6. **Onboarding flow + empty states** — teach the fork verb on first visit.
7. **Comment threads** — top-level comments + replies on published recipes.

See `docs/TODO.md` → 🚦 Beta Readiness section for the full PM critique and strategic tradeoff.
