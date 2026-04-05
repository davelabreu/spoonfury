# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-05  
**Focus:** Filter bar + modern UI overhaul on Stir the Pot  
**Branch:** `filter-bar` (worktree at `.worktrees/filter-bar`)  
**Status:** Ready for browser testing, then merge to master

### What was built
- **Search banner**: Liquid glass Card over gradient with shimmer animation, full-width search input
- **3-tier filter shelf**: Category (15 chips w/ food emoji), Cuisine & Heritage (7 chips w/ flag emoji), Lifestyle (7 chips w/ lifestyle emoji). Color-coded rows (indigo/amber/green), solid-fill selected state with shadow. AND logic with OR fallback (drops category when zero results)
- **Hot this month**: Top 2 published recipes from last 30 days scored by `(fork_count × 0.4) + (positive_vote_rate × 10 × 0.6)`. Full-bleed image cards with hover reveal
- **Bento grid recipe cards**: Full-bleed images with gradient overlay, glass badges (category + fork count), hover micro-interactions (ChefHat button slides in, tags/author slide up). First recipe featured (2-col span)
- **Skeleton loading**: Shimmer placeholders for grid and hot strip while data loads
- **Warm "Hearth" palette**: Saffron primary, warm off-white background, 1rem radius
- **Backend**: Migration 0011 seeds 9 filter tags (cuisine + dietary + vibe). `GET /api/recipes/hot/` endpoint with hotness scoring
- **URL-synced filters**: useSearchParams for shareable filter URLs

### Backend changes
- New migration: `0011_seed_filter_tags.py` — seeds 9 tags for filter chips
- New endpoint: `GET /api/recipes/hot/` — top 2 hot published recipes (public, no auth)
- New test file: `test_hot_recipes.py` — 4 tests (all passing)

---

## Current State

**Branch:** `filter-bar` (not yet merged)  
**Version:** v0.7 on master, filter-bar branch ready for testing

### To test & merge
1. Run both servers from inside the worktree
2. Browse the homepage — verify search, filters, hot strip, bento grid
3. Test filter combinations and URL sharing
4. Say "merge" when satisfied

---

## Up Next (priority order)

1. ~~**Filter bar on Stir the Pot**~~ — **DONE** (on `filter-bar` branch, pending merge)
2. **Cook Mode sticky ingredients** — when Cook Now active, ingredients pin to right column on desktop, FAB bottom sheet on mobile.
3. **Shadcn UI consistency pass** — EditRecipePage, LoginPage, RegisterPage still use raw inputs.
4. **User profile / account hub** — public `/@username` pages, edit profile, avatar.
5. **Recipe ratings & comments** — spoon ratings + comment threads on published recipes.
6. **Social login** — Google/Apple OAuth via django-allauth.

See `docs/TODO.md` for full detail on each.
