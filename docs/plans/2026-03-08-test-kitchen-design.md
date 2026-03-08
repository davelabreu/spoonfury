# Test Kitchen & Recipe Privacy — Design Doc

**Date:** 2026-03-08
**Status:** Approved, ready for implementation
**Feature:** Recipe privacy model, test kitchen UX, "Perfect It" publish flow, test kitchen sharing

---

## Overview

Recipes are private by default. Authors work on them in their personal "test kitchen" until they meet a quality checklist, at which point they can "perfect" and publish them to the public feed. Test kitchens can be selectively shared with trusted users. Forks always land in the test kitchen.

The goal is to ensure only vetted, complete recipes appear publicly, while giving authors a safe space to develop recipes without pressure.

---

## Data Model

### Recipe — new fields

```python
STATUS_CHOICES = [("draft", "Draft"), ("published", "Published")]

# Controls recipe visibility. Defaults to draft (private).
status = CharField(max_length=10, choices=STATUS_CHOICES, default="draft")

# Set when status transitions to "published". Null if still a draft.
published_at = DateTimeField(null=True, blank=True)
```

### TestKitchenInvite — new model

Allows an owner to grant another user access to view their entire test kitchen (all draft recipes). Access is all-or-nothing — no per-recipe granularity for now.

```python
class TestKitchenInvite(models.Model):
    """
    Grants a specific user (invitee) read access to another user's (owner)
    test kitchen — all draft recipes become visible to the invitee.
    """
    owner = ForeignKey(User, related_name="kitchen_invites_sent", on_delete=CASCADE)
    invitee = ForeignKey(User, related_name="kitchen_invites_received", on_delete=CASCADE)
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "invitee")]
```

---

## API Layer

### Recipe queryset filtering rules

| Viewer | Sees |
|--------|------|
| Unauthenticated | Published recipes only |
| Authenticated, not owner | Published recipes only |
| Owner | All their own recipes (draft + published) |
| Test kitchen invitee | Owner's draft recipes (full content) + all published |

### New endpoints

#### Publish a recipe
`POST /recipes/{slug}/publish/`
- Owner only
- Validates checklist gate server-side (returns 400 with unmet criteria if gate fails)
- Sets `status="published"`, `published_at=now()`

#### Unpublish a recipe
`POST /recipes/{slug}/unpublish/`
- Owner only
- Reverts `status="draft"`, clears `published_at`

#### View another user's test kitchen
`GET /users/{username}/kitchen/`
- Returns draft recipes for `{username}`
- Only accessible by the owner themselves or a user with a `TestKitchenInvite` from that owner
- Returns 403 for all others

#### Invite a user to your test kitchen
`POST /users/{username}/kitchen/invite/`
- Body: `{ "invitee_username": "..." }`
- Creates a `TestKitchenInvite` record

#### Revoke test kitchen access
`DELETE /users/{username}/kitchen/invite/{invitee_username}/`
- Deletes the `TestKitchenInvite` record

### Checklist gate (enforced server-side on publish)

A recipe must meet **all** of these before publishing:

1. At least 2 ingredients (non-empty name)
2. Instructions present (minimum 20 characters)
3. Description present (non-empty)
4. Category set (non-empty, valid choice)

---

## Frontend

### Navigation

A new "My Kitchen" link in the nav bar (authenticated users only) leads to the My Recipes page.

### My Recipes page

Two sections separated by a visual divider:

**Test Kitchen 🧪**
- Lists all draft recipes as cards
- Each card shows a checklist progress indicator: which of the 4 gate criteria are met (ticked green) and which are still unmet
- When all criteria are met, a "Perfect It 🎉" button activates on the card/recipe page
- "Share my kitchen" button → type a username → sends invite

**Published ✅**
- Lists published recipes with published date
- Option to unpublish (reverts to draft)

### Profile page (visiting another user)

- Published recipes shown as full interactive cards (same as today)
- Test kitchen section below:
  - Default (non-invitee): shows count + recipe titles only, greyed out with a lock icon — mysterious, not accessible
  - Invitee: titles are clickable, full recipe content visible

### "Perfect It" publish flow

1. On a draft recipe page, a checklist panel shows the 4 gate criteria — each ticks green as the recipe meets it
2. When all 4 are met, the "Perfect It 🎉" button becomes active
3. Clicking opens a **confirmation modal** that renders a full recipe preview (same layout as the public recipe page) — the author sees exactly what the world will see
4. A "Publish this recipe" confirm button at the bottom of the modal
5. On confirm: confetti burst animation, recipe status flips to published, modal closes, page updates to show the published state

### Fork behaviour

- Fork always creates a `status="draft"` recipe
- The fork lands in the forker's test kitchen
- Fork modal copy is updated: *"This will go to your test kitchen — you can perfect and publish it later"*
- Parent recipe reference (`parent_recipe`) is preserved as today

---

## Documentation standard (applies from this feature onward)

Per the project team's direction, all new code must include:

- **Backend**: docstrings on all models, serializers, views, and non-trivial methods
- **Frontend**: JSDoc/TSDoc comments on all components, hooks, and utility functions
- **Types**: shared TypeScript types defined in `src/types.ts` — no `any`

This applies to every file touched in this feature branch.

---

## Future work (out of scope for this feature)

- Community review threshold as publish gate (minimum N reviews before "Perfect It" unlocks) — see task #4
- Originality/plagiarism protection — see task #4
- Stars, votes, written reviews, recommendations — see task #4
- Per-recipe test kitchen sharing (currently all-or-nothing)
- Notifications for test kitchen invites
