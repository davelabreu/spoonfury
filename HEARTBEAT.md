# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-17  
**Focus:** 5-spoon rating system, Spoon Gate formula, recipe page polish  
**Branch:** `master`  
**Status:** Implementation complete, ready for human testing

### What was built
- **5-Spoon Rating System**: Replaced binary PASS/REVISE review gate with 1-5 spoon rating for both in_review and published recipes. Backend `rating` field on RecipeReview, unified `review_vote` endpoint.
- **Spoon Gate Formula**: >= 5 reviews with >= 4.0 avg to advance to mod_queue (was 3 votes / 80% binary).
- **Micro Center 3-Column Review Layout**: Rating Snapshot bar chart, Overall Rating with big number + spoon icons, interactive 5-spoon picker. Same layout for both in_review and published.
- **Review Banner Overhaul**: Ring shows avg rating instead of approval %, tier phrases based on avg (Chef's Kiss >= 4.8, Community Pick >= 4.0, etc.), 5 vote slot pills, spoon + reviews badges replace thumbs up/down.
- **Recipe Header**: Spoon rating + tier phrase replaces "Vouched for by N cooks" line. Description + serves/cook-time pills moved above hero image. About card removed.
- **API**: `updated_at` added to recipe serializer. Rating distribution + avg rating in review list response.

### Backend changes
- Modified: `models.py` (rating field), `views_review.py` (unified rating, Spoon Gate), `serializers.py` (updated_at), `test_review.py` (all tests updated)
- Migration: `0014_recipereview_rating.py`

### Frontend changes
- Modified: `ReviewBanner.tsx`, `ReviewPanel.tsx`, `RecipePage.tsx`, `index.css`, `types.ts`
- Visual mockups organized into `docs/visual-mockups/v0.9-review-banner/`

---

## Current State

**Branch:** `master`  
**Version:** v0.9.1 (5-Spoon Rating System)

### To test
1. Visit a published recipe — verify spoon rating + tier phrase shows in header, description appears above image.
2. Submit a 1-5 spoon review on a published recipe — verify the 3-column layout works (Rating Snapshot, Overall Rating, Rate this Recipe).
3. Submit a review on an in_review recipe — verify it uses the same 5-spoon picker (no more PASS/REVISE).
4. Check that the review banner shows avg rating in the ring, 5 vote slot pills, and correct tier phrases.
5. Verify rating snapshot bars fill proportionally (e.g., 2 votes on 5-spoon + 2 on 4-spoon = both at 50%).
6. Test on mobile — description + stat pills should appear above image, not buried at bottom.

---

## Up Next (priority order)

1. **Comment threads** — top-level comments + replies on published recipes.
2. **Drive-by negativity mitigation** — require comments on low ratings (<=2 spoons).
3. **Cook time field** — `prep_time` model field (currently frontend placeholder).
4. **"Kitchen Tested" badge** — named visual badge with reviewer avatars.
5. **User communication** — tagging and messaging between users.
6. **Social login** — Google/Apple OAuth via django-allauth.

See `docs/TODO.md` for full detail on each.
