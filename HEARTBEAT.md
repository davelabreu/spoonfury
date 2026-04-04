# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-04  
**Focus:** UI polish + review pipeline fixes  
**Branch:** `master`  
**Status:** Shipped ✅

### What was built
- Magazine-style homepage: hero card, 2-col recipe grid, Rising Stars sidebar with live vote bars
- RecipePage editorial split layout: story left (image → ingredients → instructions), context right (about + notes, sticky)
- BooksPage library grid: portrait book cards, deterministic gradient covers, monogram letters
- Cook Now banner repositioned to between action strip and ingredients
- `is_staff` exposed via `/api/auth/user/` endpoint; AuthContext stores `isStaff`; Moderation Queue nav link shown to staff
- Staff visibility fix: `mod_queue` recipes visible to staff in queryset
- Notification routing: `recipe_in_mod_queue` notifications navigate to `/moderation`
- Review pipeline hardening:
  - Moderator feedback stored and displayed in DraftBanner on `revision_requested`
  - `all_rounds` vote history preserved across rounds, visible to owner and staff
  - `revision_requested` resubmit skips community vote → goes straight to `mod_queue`
  - `total_votes` / `positive_votes` added to RecipeSerializer for `in_review` recipes
  - Vote tally shown on MyKitchenPage in-review cards
  - Staff see full vote history, ReviewBanner, and back-to-queue link on `mod_queue` recipe page

---

## Current State

**Branch:** `master`  
**Version:** v0.7 (polish pass complete)

---

## Up Next (priority order)

1. **Filter bar on Stir the Pot** — category chips + search input. Backend ready, just needs UI.
2. **Cook Mode sticky ingredients** — when Cook Now active, ingredients pin to right column on desktop, FAB bottom sheet on mobile.
3. **Shadcn UI consistency pass** — EditRecipePage, LoginPage, RegisterPage still use raw inputs.
4. **User profile / account hub** — public `/@username` pages, edit profile, avatar.
5. **Recipe ratings & comments** — spoon ratings + comment threads on published recipes.
6. **Search & discovery brainstorm** — tags, cultural filters, vibe/effort, similar recipes.
7. **Social login** — Google/Apple OAuth via django-allauth.

See `docs/TODO.md` for full detail on each.
