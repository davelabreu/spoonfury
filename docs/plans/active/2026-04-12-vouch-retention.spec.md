# v0.9 Vouch Retention (Part A)

**Goal:** Make community vouches durable. A recipe's positive reviews (currently hidden once the recipe exits `in_review`) become first-class social proof that survives the publish gate and stays visible to everyone.

**Scope:** Backend + frontend. Changes the `RecipeReview` uniqueness model, relaxes the gate math to be lifetime-cumulative, exposes `vouch_count` and `review_progress` on the recipe serializer, and renders a vouch pill on every recipe card plus an attribution line on published recipe detail pages.

**Not in scope (tracked as TODO for Part B):** post-publish voting, 5-spoon star rating system, drive-by negativity mitigation, reviewer avatar / "Kitchen Tested" trust mark.

---

## Motivation

Today, once a recipe passes the community review gate and transitions through `mod_queue → published`, its `RecipeReview` rows persist in the database but stop being surfaced anywhere in the UI. The author loses visibility into who vouched for them, other users never see the social proof, and the "I worked for this" moment evaporates the instant the badge turns green.

The data is already there. This feature surfaces it.

---

## 1. One Vote Per Reviewer Per Recipe

**Current constraint:** `RecipeReview` enforces `unique_together = [("recipe", "reviewer", "review_round")]` — a reviewer can re-vote on a recipe each time a new review round begins.

**New constraint:** `UniqueConstraint(fields=["recipe", "reviewer"], name="one_vote_per_reviewer_per_recipe")` — a reviewer gets exactly one vote per recipe, forever. `review_round` remains as a historical timestamp (records which submission cycle the vote was cast in) but no longer partitions uniqueness.

**Rationale:**
- Aligns with how the existing `revision_requested → mod_queue` shortcut already treats community votes as durable (see `views_review.py::submit_for_review`).
- Simplifies the gate math to a single lifetime calculation.
- Makes `vouch_count` unambiguous: the count of distinct positive reviewers is exactly the number of `is_positive=True` rows.

### Data migration (`0013_onevote_per_recipe.py`)

Two-step migration:

1. **Dedup existing duplicates.** `RunPython` forward op: for any `(recipe, reviewer)` pair with more than one row, keep the most recent (by `created_at`) and delete the rest. Reversible op is a no-op (deleted data cannot be reconstructed, and this is a one-way fix).
2. **Swap the constraint.** Remove `unique_together = [("recipe", "reviewer", "review_round")]`, add `UniqueConstraint(fields=["recipe", "reviewer"], name="one_vote_per_reviewer_per_recipe")`.

The dedup step runs before the constraint is added so Django doesn't error on existing duplicate rows.

---

## 2. Cumulative Gate Math

**Current behavior:** `_check_threshold` in `views_review.py` filters `RecipeReview` by `review_round=recipe.review_round` — the gate is calculated per-round and resets on each new submission cycle.

**New behavior:** `_check_threshold` filters `RecipeReview` by recipe only — 80% positive / ≥3 votes calculated across the recipe's entire vote history.

**Effects:**
- On moderator kickback (`revision_requested → mod_queue` via `submit_for_review`), the existing shortcut stays as-is — votes are already preserved, and now the math behind "did it pass the gate" naturally continues to say "yes."
- On author self-withdrawal (`in_review → draft → in_review`), prior votes still count. This is consistent with "one vote per reviewer forever" — if your vote is locked, it needs to stay part of the math.
- `review_round` no longer affects gate math, only serves as a timestamp for historical display.

**`review_vote` endpoint:** the uniqueness check changes from `filter(recipe, reviewer, review_round)` to `filter(recipe, reviewer)`. Error copy updates to "You already voted on this recipe."

---

## 3. Public Review Visibility on Published Recipes

**Current behavior:** `review_list` in `views_review.py` gates the `reviews` field behind `has_voted` (blind-until-voted mechanic). `all_rounds` is owner/staff-only.

**New behavior:**
- When `recipe.status == "published"`, skip the blind check entirely and always return the full `reviews` list plus `all_rounds`. The data is now public social proof — any visitor (authenticated or anonymous) can read the vouches and comments that helped this recipe earn its publish.
- When `recipe.status == "in_review"`, the existing blind-until-voted mechanic stays unchanged. It still serves a purpose — it's part of the gating process.
- `AllowAny` permission on `review_list` for published recipes (already is `IsAuthenticated`; relax for this read path).

---

## 4. Serializer Surfacing

### `RecipeSerializer` — new read-only fields

**`vouch_count: int`** — always present, always visible.
- Implementation: `SerializerMethodField` returning the count of `is_positive=True` reviews on the recipe. With the new unique constraint, this is exactly the count of distinct positive reviewers.
- For list views, add a queryset annotation to avoid N+1:
  ```python
  .annotate(vouch_count=Count("reviews", filter=Q(reviews__is_positive=True)))
  ```
  The serializer field reads `obj.vouch_count` if it's annotated, falls back to `.reviews.filter(is_positive=True).count()` otherwise.

**`review_progress: dict | None`** — only present for the recipe's author or staff viewers.
- Shape:
  ```json
  {
    "positive": 2,
    "total": 3,
    "needed_for_threshold": 1,
    "threshold_met": false
  }
  ```
- `needed_for_threshold`: the minimum additional positive votes required to hit the 80% / ≥3 gate. Computed as:
  - If `total < 3`: `max(0, 3 - total)` (still need to reach the minimum vote count).
  - If `total >= 3`: `max(0, ceil(0.8 * total) - positive)` (need enough positives to reach 80%).
- Returns `None` for non-author / non-staff viewers (keeps the data owner-scoped).
- Only meaningful when the recipe is `in_review` — but we compute it for all statuses so the frontend can decide when to render.

### Queryset annotations

To avoid N+1 when listing recipes, the recipe viewset's `get_queryset` should annotate `vouch_count` via `Count`. `review_progress` is small enough to compute per-recipe without annotation (single row fetch; lists rarely need it).

---

## 5. Frontend: Vouch Pill on Cards

**Type update** — `frontend/src/types.ts`:
- Add `vouch_count: number` to the `Recipe` interface.
- Add optional `review_progress?: ReviewProgress | null` where `ReviewProgress` is the shape defined in §4.

**Pill component** — inline element rendered alongside the existing `🍴 N` fork pill:
- `✨ {vouch_count}` — rendered only when `vouch_count > 0`.
- Style matches the fork pill's shape (`text-[11px] px-2 py-0.5 rounded-full font-semibold`) but uses a violet palette (`bg-violet-50 text-violet-700`) to distinguish from the amber fork pill.
- Sits inline to the right of the fork pill with the same `gap-2` spacing.

**Where it renders:**
- `frontend/src/components/RecipeCard.tsx` — the main card used in feeds, book views, and MyKitchenPage's card-view sections.
- `frontend/src/pages/MyKitchenPage.tsx::CompactRow` — the v0.85 compact row also gets the `✨ N` pill inline after the fork count.
- Any other place the fork pill currently renders (audit during implementation).

---

## 6. Frontend: Attribution Line on Published Detail Page

**File:** `frontend/src/pages/RecipePage.tsx`.

**When:** rendered only when `recipe.status === "published"` AND `recipe.vouch_count > 0`.

**Placement:** just under the title/author row, above the description.

**Copy:**
- Singular: `✨ Vouched for by 1 cook in the test kitchen`
- Plural: `✨ Vouched for by {N} cooks in the test kitchen`

**Style:** `text-sm text-violet-700 flex items-center gap-1.5`, no border, no card — just a small inline line.

**Not interactive:** no tooltip, no link-out, no popover showing reviewers. Read-only attribution.

---

## 7. Frontend: Test Kitchen Progression Indicator

**File:** `frontend/src/pages/MyKitchenPage.tsx`.

**When:** rendered only in the Test Kitchen section, only for recipes whose `status === "in_review"`, only when the viewer is the owner (implicitly true for MyKitchenPage but worth asserting via the `review_progress` field being non-null).

**Data source:** `recipe.review_progress` from the serializer (only returned for author/staff).

**Placement:** a small line below the card title in the card view; inline after the existing status badge in the compact view.

**Copy (deterministic based on `review_progress`):**

| Condition | Copy |
|-----------|------|
| `total === 0` | `✨ 0 votes · 3 more needed to publish` |
| `total > 0 && !threshold_met && needed > 0` | `✨ {positive}/{total} votes · {needed} more yes to publish` |
| `threshold_met === true` | `✨ Passed community review — in moderator queue` |

**Style:** `text-xs text-violet-600 flex items-center gap-1`.

---

## 8. Frontend: Public Review Visibility

**File:** `frontend/src/components/ReviewPanel.tsx` (or wherever the review list renders on `RecipePage`).

**Change:** when the recipe is published, bypass the "blind until voted" UI path and render all reviews unconditionally. The backend no longer gates the data, so the frontend just needs to trust it.

**Voting affordance:** remains hidden on published recipes (no vote button). Part B will add that back. The panel is read-only for published recipes in this spec.

**In-review behavior:** unchanged — blind until voted, existing behavior preserved.

---

## 9. Test Coverage

**Backend migration tests** (`backend/spoonfury/apps/recipes/tests/test_review.py`):
- `test_migration_dedupes_duplicate_reviewer_rows` — set up a recipe with three `(recipe, reviewer)` rows from different rounds, run migration, assert one row survives (the most recent).
- `test_unique_constraint_rejects_second_vote` — post-migration, direct DB insert of a duplicate raises `IntegrityError`.

**Backend gate math tests:**
- `test_threshold_is_cumulative_across_rounds` — a recipe with votes in an earlier round still reflects those votes in the gate calculation after moderator kickback.
- `test_revision_requested_resubmission_preserves_votes` — recipe goes draft → in_review → mod_queue → revision_requested → mod_queue, and the gate math continues to reflect the original votes.

**Backend vote endpoint tests:**
- `test_review_vote_rejects_duplicate_reviewer_regardless_of_round` — a reviewer who voted in an earlier cycle gets a 400 with the new error copy.
- `test_review_vote_error_copy_says_already_voted_on_recipe` — explicit assertion on the error message.

**Backend serializer tests:**
- `test_recipe_serializer_includes_vouch_count` — a recipe with 3 positive and 1 negative review serializes `vouch_count: 3`.
- `test_review_progress_returned_for_author` — author sees `review_progress` populated.
- `test_review_progress_null_for_other_viewer` — non-author sees `review_progress: null`.
- `test_review_progress_returned_for_staff` — staff user sees `review_progress` populated even on others' recipes.
- `test_review_progress_needed_for_threshold_math` — assert the math across the three branches (total<3, below 80%, at/above 80%).

**Backend public review visibility tests:**
- `test_review_list_public_for_published_recipe` — anonymous GET returns full reviews array.
- `test_review_list_still_blind_for_in_review_recipe` — anonymous GET for in_review returns gated response (or 401, depending on existing auth requirement).

**Frontend component tests** (`frontend/src/**/*.test.tsx`):
- `RecipeCard` renders `✨ N` pill when `vouch_count > 0`, doesn't render when `vouch_count === 0`.
- `RecipePage` detail line renders when `status === "published"` and `vouch_count > 0`; doesn't render for `in_review`; doesn't render when `vouch_count === 0`.
- `MyKitchenPage` progression indicator renders the three copy variants based on `review_progress` shape.

---

## 10. Files Touched

**Backend:**
- `backend/spoonfury/apps/recipes/models.py` — RecipeReview Meta: swap `unique_together` for `UniqueConstraint`.
- `backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py` — new migration with dedup + constraint swap.
- `backend/spoonfury/apps/recipes/views_review.py` — `_check_threshold` (cumulative), `review_vote` (uniqueness check + error copy), `review_list` (public for published).
- `backend/spoonfury/apps/recipes/serializers.py` — add `vouch_count`, `review_progress`.
- `backend/spoonfury/apps/recipes/views.py` — RecipeViewSet `get_queryset`: add `vouch_count` annotation.
- `backend/spoonfury/apps/recipes/tests/test_review.py` — new test cases per §9.

**Frontend:**
- `frontend/src/types.ts` — `Recipe.vouch_count`, `Recipe.review_progress`, `ReviewProgress` interface.
- `frontend/src/components/RecipeCard.tsx` — vouch pill next to fork pill.
- `frontend/src/pages/MyKitchenPage.tsx` — progression indicator on in_review cards, CompactRow vouch pill.
- `frontend/src/pages/RecipePage.tsx` — published detail line.
- `frontend/src/components/ReviewPanel.tsx` — unconditional render on published.

---

## 11. Explicit Non-Goals (deferred to Part B)

- **Post-publish voting.** `review_vote` endpoint still rejects votes when `status != "in_review"`. Published recipes are read-only for reviews in Part A.
- **5-spoon star rating.** `RecipeReview.is_positive` stays boolean. Part B will introduce a rating integer or a separate rating model.
- **Drive-by negativity mitigation.** Not relevant until post-publish voting exists.
- **Reviewer avatars on the detail line.** The "Kitchen Tested" signature treatment (Option C from brainstorm) is deferred.
- **Changing the copy on the published detail line.** Once Part B ships, "in the test kitchen" will become inaccurate — we'll revise at that point.

Add to `docs/TODO.md` under a new "Recipe Ratings & Reviews (v0.9.1)" section capturing Part B.
