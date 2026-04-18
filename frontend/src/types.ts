/** Possible recipe statuses in the privacy/publish flow. */
export type RecipeStatus = "draft" | "in_review" | "mod_queue" | "revision_requested" | "published";

export interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
  emoji?: string;
}

export interface Tag {
  name: string;
  slug: string;
  kind: "cuisine" | "dietary" | "ingredient" | "vibe";
}

/** Owner/staff-only structured progression indicator for in_review recipes. */
export interface ReviewProgress {
  positive: number;
  total: number;
  needed_for_threshold: number;
  threshold_met: boolean;
}

/** Full recipe object returned by the API. */
export interface Recipe {
  id: number;
  slug: string;
  title: string;
  description: string;
  serves: string;
  category: string;
  tags?: Tag[];
  ingredients: Ingredient[];
  instructions: string;
  notes: string;
  image_url?: string;
  author_username: string;
  author_display_name: string;
  parent_recipe_slug: string | null;
  parent_recipe_title: string | null;
  parent_recipe_author: string | null;
  fork_count: number;
  prep_time?: number;
  created_at: string;
  updated_at?: string;
  status: RecipeStatus;
  published_at: string | null;
  review_round: number;
  /** Live vote tally — only present when status is in_review or mod_queue */
  total_votes?: number | null;
  positive_votes?: number | null;
  /** Cumulative count of positive reviews (vouches). Always present, >= 0. */
  vouch_count: number;
  /** Owner/staff-only structured progression indicator, null for other viewers. */
  review_progress: ReviewProgress | null;
}

export interface Book {
  id: number;
  title: string;
  description?: string;
  is_public: boolean;
  is_default?: boolean;
  recipe_count?: number;
  recipes?: Recipe[];
}

export interface ShoppingItem {
  id: number;
  recipe_title: string;
  recipe_slug: string;
  name: string;
  quantity: string;
  unit: string;
  note: string;
  is_checked: boolean;
}

export interface RecipeGroup {
  recipe_slug: string;
  recipe_title: string;
  recipe_image_url: string;
  recipe_category: string;
  multiplier: number;
  items: ShoppingItem[];
}

export interface ShoppingListData {
  total_items: number;
  items_by_recipe: RecipeGroup[];
}

/** Checklist gate criteria for publishing a recipe. */
export interface PublishGate {
  hasEnoughIngredients: boolean;
  hasInstructions: boolean;
  hasDescription: boolean;
  hasCategory: boolean;
}

/** Response from the kitchen endpoint. */
export interface KitchenResponse {
  owner: string;
  count: number;
  recipes: Recipe[];
}

/** A single review vote on a recipe. */
export interface RecipeReviewItem {
  reviewer: string;
  is_positive: boolean;
  rating?: number | null;
  comment: string;
  round: number;
  created_at: string;
}

/** Response from GET /recipes/:slug/reviews/ */
export interface ModerationFeedbackItem {
  moderator: string;
  feedback: string;
  round: number;
  created_at: string;
}

export interface ReviewsResponse {
  review_round: number;
  total_votes: number;
  positive_votes: number;
  threshold_met: boolean;
  has_voted: boolean;
  average_rating?: number | null;
  rating_distribution?: Record<string, number>;
  rated_count?: number;
  reviews?: RecipeReviewItem[];
  /** All reviews across all rounds — only present for the recipe owner */
  all_rounds?: RecipeReviewItem[];
  /** Moderator revision-request feedback — only present for the recipe owner */
  moderation_feedback?: ModerationFeedbackItem[];
}

/** An in-app notification. */
export interface AppNotification {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  actor_username: string | null;
  recipe_slug: string;
  recipe_title: string;
  created_at: string;
}

/** A recipe in the moderation queue with extra metadata. */
export interface ModerationQueueEntry extends Recipe {
  total_votes: number;
  positive_votes: number;
  author_strike_count: number;
}

export interface WeeklyPlanItem {
  id: number;
  day: number; // 0-6 (Monday-Sunday)
  order: number;
  recipe: Recipe;
}

export interface WeeklyPlan {
  id: number;
  owner: string;
  updated_at: string;
  items: WeeklyPlanItem[];
}
