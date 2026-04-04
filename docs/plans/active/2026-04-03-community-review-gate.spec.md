# Community Review & Moderation Gate — Design Doc

**Date:** 2026-04-03
**Status:** Approved, ready for implementation
**Feature:** Two-stage publish pipeline — invitee voting + moderator approval + in-app notifications
**Depends on:** Test Kitchen & Recipe Privacy (2026-03-08)

---

## Overview

Extends the Test Kitchen publish flow with a community review pipeline. Recipes must pass two gates before going public: (1) invitee voting with a minimum approval threshold, and (2) moderator review. This ensures only vetted, community-validated recipes reach the public feed.

Superusers can bypass the pipeline and force-publish (checklist still enforced).

---

## Recipe State Machine

Extends the existing `draft` / `published` states to a full pipeline:

```
draft → in_review → mod_queue → published
            ↑            |
            └── revision_requested
```

### Transitions

| From | To | Trigger |
|------|----|---------|
| `draft` | `in_review` | Author submits for review (4-point checklist must pass) |
| `in_review` | `mod_queue` | Automatic — 80%+ positive votes from 3+ invitees |
| `in_review` | `draft` | Author withdraws (discards current round votes) |
| `mod_queue` | `published` | Moderator approves |
| `mod_queue` | `revision_requested` | Moderator sends back with required feedback |
| `revision_requested` | `in_review` | Author resubmits after edits (new review round) |
| Any | `published` | Superuser force-publish (checklist still enforced) |

### Prerequisites

The existing 4-point checklist from the Test Kitchen spec is a prerequisite for entering `in_review`:

1. At least 2 ingredients (non-empty name)
2. Instructions present (minimum 20 characters)
3. Description present (non-empty)
4. Category set (non-empty, valid choice)

---

## Data Model

### Recipe — modified fields

```python
STATUS_CHOICES = [
    ("draft", "Draft"),
    ("in_review", "In Review"),
    ("mod_queue", "In Moderation"),
    ("revision_requested", "Revision Requested"),
    ("published", "Published"),
]

status = CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
published_at = DateTimeField(null=True, blank=True)
review_round = PositiveIntegerField(default=0)  # 0 = never submitted, 1+ = active/past rounds
```

`review_round` tracks the current submission cycle. A value of 0 means the recipe has never been submitted for review. The first submission sets it to 1, and each resubmission increments it. `RecipeReview.review_round` is matched against the recipe's current `review_round` to determine which votes count toward the active threshold. Old votes are preserved for history but don't count toward the new round.

### RecipeReview — new model

```python
class RecipeReview(models.Model):
    recipe = ForeignKey(Recipe, related_name="reviews", on_delete=CASCADE)
    reviewer = ForeignKey(User, on_delete=CASCADE)
    review_round = PositiveIntegerField()
    is_positive = BooleanField()
    comment = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("recipe", "reviewer", "review_round")]
```

One vote per reviewer per round. Reviewer must be a Test Kitchen invitee of the recipe author. Author cannot review their own recipe.

### ModerationAction — new model

```python
class ModerationAction(models.Model):
    ACTION_CHOICES = [
        ("approved", "Approved"),
        ("revision_requested", "Revision Requested"),
        ("force_published", "Force Published"),
    ]

    recipe = ForeignKey(Recipe, related_name="moderation_actions", on_delete=CASCADE)
    moderator = ForeignKey(User, on_delete=CASCADE)
    action = CharField(max_length=20, choices=ACTION_CHOICES)
    feedback = TextField(blank=True)
    review_round = PositiveIntegerField()
    created_at = DateTimeField(auto_now_add=True)
```

Audit log — every moderation decision is recorded. No deletes. Feedback is required when action is `revision_requested`.

### AuthorStrike — new model

```python
class AuthorStrike(models.Model):
    author = ForeignKey(User, related_name="strikes", on_delete=CASCADE)
    recipe = ForeignKey(Recipe, on_delete=CASCADE)
    moderation_action = OneToOneField(ModerationAction, on_delete=CASCADE)
    created_at = DateTimeField(auto_now_add=True)
```

Created automatically when a moderator sends a recipe back. One strike per send-back. No hard rejection — repeated send-backs accumulate strikes for moderator visibility.

### Notification — new model

```python
class Notification(models.Model):
    TYPE_CHOICES = [
        ("review_requested", "Review Requested"),
        ("review_received", "Review Received"),
        ("recipe_in_mod_queue", "Recipe In Moderation Queue"),
        ("recipe_approved", "Recipe Approved"),
        ("revision_requested", "Revision Requested"),
    ]

    recipient = ForeignKey(User, related_name="notifications", on_delete=CASCADE)
    notification_type = CharField(max_length=30, choices=TYPE_CHOICES)
    recipe = ForeignKey(Recipe, on_delete=CASCADE)
    actor = ForeignKey(User, null=True, on_delete=SET_NULL)  # who triggered it
    message = CharField(max_length=255)  # pre-rendered display text
    is_read = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
```

Notifications are created as side effects of state transitions. The `message` field is pre-rendered at creation time (e.g., "JaneDoe wants your feedback on Spicy Ramen") so the frontend doesn't need to assemble display text.

#### Notification triggers

| Event | Recipients | Message template |
|-------|-----------|-----------------|
| Recipe submitted for review | All kitchen invitees of the author | "{author} wants your feedback on {recipe}" |
| Invitee submits a vote | Recipe author | "You got a new review on {recipe}" |
| Recipe hits threshold → mod queue | All staff users | "New recipe awaiting moderation: {recipe} by {author}" |
| Moderator approves | Recipe author | "Your recipe {recipe} has been published!" |
| Moderator requests revision | Recipe author | "Feedback on {recipe} — revision needed" |

---

## API Endpoints

### Author actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recipes/{slug}/submit-for-review/` | POST | `draft`/`revision_requested` → `in_review`. Validates 4-point checklist. Increments `review_round`. |
| `/recipes/{slug}/withdraw-review/` | POST | `in_review` → `draft`. Discards current round votes from threshold calculation. |
| `/recipes/{slug}/force-publish/` | POST | Superuser only. Any state → `published` (checklist enforced). Logged as ModerationAction for audit. |

### Invitee actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recipes/{slug}/review/` | POST | Submit vote (`is_positive` bool + optional `comment`). Must be a kitchen invitee. One per round. |
| `/recipes/{slug}/reviews/` | GET | Returns reviews for current round. Before voting: count + threshold status only (blind). After voting: all reviews with comments revealed. |

### Moderator actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/moderation/queue/` | GET | List all recipes with `status=mod_queue`. Staff only (`is_staff`). |
| `/moderation/{slug}/approve/` | POST | `mod_queue` → `published`. Sets `published_at`. |
| `/moderation/{slug}/request-revision/` | POST | `mod_queue` → `revision_requested`. Requires `feedback`. Creates `AuthorStrike`. |

### Notification actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/` | GET | List current user's notifications, newest first. Supports `?unread=true` filter. |
| `/notifications/mark-read/` | POST | Mark specific notifications as read. Body: `{ "ids": [1, 2, 3] }`. |
| `/notifications/mark-all-read/` | POST | Mark all of the current user's notifications as read. |
| `/notifications/unread-count/` | GET | Returns `{ "count": N }`. Lightweight endpoint for badge polling. |

### Automatic transition

When a review is submitted via `/recipes/{slug}/review/`, the view checks the threshold: 80%+ positive from 3+ votes in the current round. If met, the recipe status automatically moves to `mod_queue`.

---

## Vote Threshold Rules

- Minimum 3 votes required
- Formula: `required_positive = ceil(0.8 * total_votes)`. Recipe passes when `positive_votes >= required_positive`.
- Practical effect with small pools: near-unanimous early, loosens as more invitees vote
- Examples: 3/3, 4/4, 4/5, 5/6, 6/7, 7/8... all pass

---

## Frontend

### My Recipes page — updated flow

The Test Kitchen section shows recipe status badges with clear next actions:

- **Draft** (checklist incomplete): Checklist progress indicator, no submit option
- **Draft** (checklist complete): "Submit for Review" button
- **In Review**: Vote progress indicator (e.g., "2/3 votes, 100% positive") — aggregate only, no individual reviews visible to author
- **Revision Requested**: Moderator feedback displayed inline, "Resubmit" button after edits

### Recipe page — reviewer experience

When a kitchen invitee views a recipe with status `in_review`:

1. Review panel appears below the recipe
2. Thumbs up / thumbs down toggle + optional comment textarea
3. "Submit Review" button
4. After submitting: vote locks, all reviews + comments for current round revealed (blind → open transition)

### Moderator queue page

New page at `/moderation` (staff only, nav link for `is_staff` users):

- List of recipes awaiting review, ordered by time entered queue
- Each card shows: recipe title, author, vote summary (X positive / Y total), link to full recipe
- Two actions: "Approve" (confirm modal) or "Request Revision" (feedback textarea, required)
- If author has 2+ strikes, a warning badge appears on their cards in the queue

### Notification bell

- Bell icon in the navbar (next to existing CartCapsule)
- Unread count badge (red dot with number, hidden when 0)
- Polls `/notifications/unread-count/` on page load and every 60 seconds (no websockets for v1)
- Click opens a dropdown listing recent notifications
- Each notification links to the relevant recipe page
- "Mark all as read" action at the top of the dropdown
- Clicking a notification marks it as read and navigates to the recipe

### Author strike visibility

Authors can see their own strike count on My Recipes. Moderators see strike counts in the mod queue. No other public visibility.

---

## Edge Cases & Rules

### Editing during review

- **`in_review`**: Recipe locked for editing. Author must withdraw first (resets to `draft`, discards current round).
- **`mod_queue`**: Locked. Author waits for moderator decision.
- **`revision_requested`**: Fully editable.

### Revoked invitees

- If a kitchen invite is revoked while voting is active, existing votes from that user still count toward the current round. Votes are historical facts — revoking access doesn't rewrite them.

### Resubmission

- `review_round` increments on each resubmission
- Old votes preserved in database for history but don't count toward new round
- No limit on resubmissions — each moderator send-back adds a strike

### Author strike visibility

- Authors can see their own strike count on their My Recipes page (simple count, no details about which moderator or specific feedback — they already see that per-recipe)
- Moderators see strike counts on recipe cards in the mod queue

### Who can review

- Only users with a `TestKitchenInvite` where `owner = recipe.author` (i.e., the recipe author has invited them to their kitchen)
- Author cannot vote on their own recipe
- No anonymous or public voting

### Superuser force-publish

- Bypasses vote and mod queue
- 4-point content checklist still enforced
- Logged as `ModerationAction` with `action="force_published"` for distinct audit trail (separate from normal moderator approval)

---

## Documentation standard

Per the Test Kitchen spec, all new code includes:

- **Backend**: Docstrings on all models, serializers, views, and non-trivial methods
- **Frontend**: JSDoc/TSDoc on all components, hooks, and utility functions
- **Types**: Shared TypeScript types in `src/types.ts` — no `any`

---

## Future work (out of scope)

- User Preference Profile (dietary needs, dislikes, household size)
- Pantry Intelligence (visual scan → ingredient database)
- Weekly Meal Planner (preference + pantry aware)
- Smart Shopping (delta cart — plan needs minus pantry)
- Configurable vote thresholds per community size
- Real-time notifications via websockets (v1 uses polling)
- Per-recipe invitations (vs all-or-nothing kitchen access)
