# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-18  
**Focus:** v0.10 Books → Collections rebrand  
**Branch:** `master` (merged from `feat/books-to-collections`)  
**Status:** Shipped and merged

### What was built
- **Collections rebrand**: Recipe Books renamed to Collections throughout the app. BooksPage removed, absorbed into My Kitchen.
- **System collections**: Kitchen Sink (auto-assigned for original recipes) + Forked Recipes (auto-assigned on fork). Both protected from deletion.
- **Custom collections**: Create, rename, delete. Edit dialog with icon presets (Quick Meals, Meal Prep, Slow Cooking, Vegetarian, Clean Eating) and 42-char description.
- **Collection cards**: C2 accent stripe style with left color bar, emoji icons, type badges (Originals/Forked), inline expand preview.
- **Recipe management**: Vertical dots menu on card + compact views with Edit Recipe, Share, Move to Collection, Delete. Works in both Test Kitchen and Published sections.
- **Fork UX**: One-click fork (no modal), "Forked!" button persistence across navigation, toast notifications via Sonner.
- **Status badges**: "Original Draft" (orange), "Forked Draft" (indigo), distinct from Published (green).
- **Collection sorting**: Kitchen Sink always first, Forked second, custom alphabetical.

### Backend changes
- Modified: `books/models.py` (default_role, icon, description fields), `books/serializers.py`, `books/views.py`, `recipes/views.py` (perform_create auto-add to sink), `recipes/views_fork.py`, `recipes/filters.py` (forked_from filter), `users/signals.py` (create default collections on registration)
- Migrations: 0002–0007 (is_default → default_role, icon/description)

### Frontend changes
- Modified: `MyKitchenPage.tsx` (major — collections UI, recipe management, edit dialog), `RecipePage.tsx` (fork UX), `App.tsx` (Sonner toaster, route updates), `types.ts`, `NavBar.tsx`
- Removed: `BooksPage.tsx`, `ForkModal.tsx`
- Added: `ui/sonner.tsx`
- Renamed: `BookDetailPage.tsx` → `CollectionDetailPage.tsx`
- Visual mockups: `docs/visual-mockups/v0.10-collection-cards/`

---

## Current State

**Branch:** `master`  
**Version:** v0.10 (Collections rebrand)

---

## Up Next (priority order)

1. **Comment threads** — top-level comments + replies on published recipes.
2. **Drive-by negativity mitigation** — require comments on low ratings (<=2 spoons).
3. **Cook time field** — `prep_time` model field (currently frontend placeholder).
4. **"Kitchen Tested" badge** — named visual badge with reviewer avatars.
5. **User communication** — tagging and messaging between users.
6. **Social login** — Google/Apple OAuth via django-allauth.

See `docs/TODO.md` for full detail on each.
