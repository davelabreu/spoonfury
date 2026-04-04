# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-04  
**Feature:** v0.7 Community Review & Moderation Gate  
**Branch:** `master` (merged from `feature/community-review-gate`)  
**Status:** Shipped ✅

### What was built
- Recipe status expanded to 5 states: `draft → in_review → mod_queue → published` (or `revision_requested`)
- `review_round` field on Recipe — increments on each submit-for-review
- `RecipeReview` model — per-invitee votes with blind-until-threshold reveal
- `ModerationAction` model — tracks moderator approve/request-revision decisions
- `AuthorStrike` model — issued when moderator requests revision
- `notifications` Django app — Notification model, `notify()` helper, full CRUD API
- Submit-for-review + withdraw-review endpoints (gate-enforced, invitees notified)
- Vote endpoint — blind aggregate until user votes, auto-promotes to `mod_queue` at 80%/3+ threshold
- Moderation queue (`/api/moderation/queue/`), approve, request-revision endpoints
- Force-publish endpoint (superuser only)
- Edit-locking: recipes in `in_review` or `mod_queue` cannot be edited
- NotificationBell in NavBar — polls unread count, dropdown with mark-read
- ReviewPanel component — thumbs up/down + comment for invitees on RecipePage
- RecipePage status-aware action strip for all 5 states
- ModerationPage (`/moderation`) — staff queue with approve + revision request
- MyKitchenPage updated — In Review and In Moderation sections, StatusBadge on all cards
- 134 backend tests passing
- DraftBanner component — amber/green/orange above recipe, gate pills reactive to recipe state

---

## Current State

**Branch:** `master`  
**Version:** v0.7  
**Worktrees:** `.worktrees/community-review` kept for QA — run servers from there to test the full draft → review → approve → publish workflow

---

## Up Next

### QA: Test the full review pipeline
Use `.worktrees/community-review` dev servers (already migrated):
1. Create a draft recipe, check DraftBanner gate pills
2. Complete all criteria, submit for review
3. Log in as invitee, cast votes until threshold
4. Log in as staff, approve from `/moderation`
5. Verify recipe goes live + notifications fire

### Next Features (backlog)
- Filter bar UI on Stir the Pot page (backend filtering done, UI not yet)
- Cook Mode sticky ingredient sidebar
- Social login (Google/Apple)

---

## Active Plans

| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Community Review Gate | `docs/plans/completed/2026-04-03-community-review-gate.spec.md` | `docs/plans/completed/2026-04-03-community-review-gate.impl.md` | ✅ Shipped v0.7 |
| Test Kitchen & Privacy | `docs/plans/completed/2026-03-08-test-kitchen.spec.md` | `completed/` | ✅ Shipped v0.6 |

---

## Deferred / Backlog

See `docs/TODO.md` for full list. Highlights:

- Filter bar UI on Stir the Pot page (backend filtering done, UI not yet)
- Cook Mode sticky ingredient sidebar (desktop) / bottom sheet (mobile)
- Ingredient info personality scrub (`ingredientInfo.ts` is too encyclopedic)
- Social login (Google/Apple)
- User-contributed ingredient tips (social feature)
