# Context Scope: Core Flow (Forking & Books)

## Overview
This document describes the data relationships and flow for the core Spoonfury mechanics: forking recipes and organizing them into books. This is the "connective tissue" of the application.

## 1. Forking Relationship Chain
In Spoonfury, a **Fork** is a new `Recipe` instance linked back to its progenitor via the `parent_recipe` foreign key.

### Key Data Relationships
- **Lineage:** `Recipe.parent_recipe` (Self-referential FK). When `null`, the recipe is an "Original." When set, it is a "Fork."
- **Ownership:** `Recipe.author` always points to the user who performed the fork.
- **Counters:** `Recipe.fork_count` on the **parent** is incremented via a database `update()` call during the fork process.
- **Slug Integrity:** The `Recipe.save()` method handles collision detection. If `@user` forks `pasta`, the first fork is `pasta-my-version`, and subsequent forks result in `pasta-my-version-1`, `pasta-my-version-2`, etc.

### Health Check Indicators
- A healthy fork must have a `parent_recipe` pointing to a valid PK.
- The `fork_count` of the parent should ideally reflect the number of child recipes pointing to it.

## 2. Recipe Book Associations
Recipes are collected into `RecipeBooks` through a many-to-many relationship managed by the `BookRecipe` join model.

### Key Data Relationships
- **The Join Model:** `BookRecipe` links a `RecipeBook` to a `Recipe`.
- **Ordering:** `BookRecipe.order` (Integer) determines the display sequence within the book. New recipes are appended to the end.
- **Privacy vs. Sharing:** `RecipeBook.is_public` (Boolean) toggles visibility. Public books use a `share_token` (UUID/String) for unauthenticated access via the `/share/` endpoint.

### Flow for "Make it Mine"
1. **POST `/api/recipes/:slug/fork/`**: Creates the new forked recipe instance.
2. **POST `/api/books/:id/add-recipe/`**: The frontend associates the new fork's slug with the selected book.
3. **Redirection**: The user is redirected to the `BookDetailPage` where the recipe appears at the bottom.

### Health Check Indicators
- Every `BookRecipe` entry must have a valid `book_id` and `recipe_id`.
- Deleting a `Recipe` removes it from all books (`CASCADE`).
- Deleting a `RecipeBook` does **not** delete the underlying recipes.
