export interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
  emoji?: string;
}

export interface Recipe {
  id: number;
  slug: string;
  title: string;
  description: string;
  serves: string;
  category: string;
  ingredients: Ingredient[];
  instructions: string;
  notes?: string;
  image_url?: string;
  author_username: string;
  fork_count: number;
  parent_recipe_slug?: string;
  parent_recipe_title?: string;
  parent_recipe_author?: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  title: string;
  description?: string;
  is_public: boolean;
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
