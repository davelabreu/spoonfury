# Spoonfury — Heartbeat

Quick orientation file. Update at the end of each session.

---

## Last Session

**Date:** 2026-04-05  
**Focus:** Cook Mode enhancements, User Profiles, and Shadcn UI consistency  
**Branch:** `master`  
**Status:** Implementation complete, ready for human testing

### What was built
- **Cook Mode Sticky Ingredients**: 
    - Desktop: Ingredients move to a sticky right-column container when Cook Mode is active.
    - Mobile: Floating Action Button (FAB) triggers a Framer Motion bottom sheet drawer with the ingredient checklist.
    - Transitions: Smooth fade and slide animations for layout shifts.
- **User Profiles & Account Hub**:
    - Backend: New `UserViewSet` and `ProfileSerializer` for public profiles and private "me" updates.
    - Frontend: New `ProfilePage` (`/@username`) with avatar upload, bio editing, and user's published recipes grid.
    - Navigation: "My Profile" link added to the NavBar account dropdown.
- **Shadcn UI Consistency Pass**:
    - `RecipePage`: Replaced raw `<select>` for "Add to book" with Shadcn Select.
    - `EditRecipePage`: Full overhaul of raw inputs, textareas, and selects with Shadcn UI components.
- **Infrastructure**: Registered `api/users/` routes in backend.

### Backend changes
- New files: `users/views.py`, `users/urls.py`
- Updated: `users/serializers.py`, `config/urls.py`

### Frontend changes
- New files: `components/CookModeIngredients.tsx`, `pages/ProfilePage.tsx`
- Updated: `App.tsx`, `pages/RecipePage.tsx`, `pages/EditRecipePage.tsx`, `components/NavBar.tsx`

---

## Current State

**Branch:** `master`  
**Version:** v0.8 (Cook Mode & Profiles)

### To test
1. Open a recipe and click "Cook Now" — verify ingredients stick on desktop and FAB appears on mobile.
2. Visit your profile via the account menu — test editing bio and uploading an avatar.
3. Visit a public profile by clicking a username — verify it shows their published recipes.
4. Edit a recipe — verify the new Shadcn-powered form fields work correctly.

---

## Up Next (priority order)

1. **Recipe ratings & comments** — spoon ratings + comment threads on published recipes.
2. **User communication** — tagging and messaging between users.
3. **Social login** — Google/Apple OAuth via django-allauth.
4. **Real Ingredient Pricing** — replace mock pricing with API-backed grocery data.

See `docs/TODO.md` for full detail on each.
