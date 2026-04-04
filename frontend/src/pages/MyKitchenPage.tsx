/**
 * MyKitchenPage — The user's personal recipe dashboard.
 *
 * Two sections:
 *   1. Test Kitchen 🧪 — draft recipes with publish readiness indicators
 *   2. Published ✅ — recipes visible to the public
 *
 * Also includes test kitchen sharing controls.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Recipe, PublishGate } from "@/types";

/** Check which publish gate criteria a recipe meets. */
function getPublishGate(recipe: Recipe): PublishGate {
  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}

/** Whether all gate criteria are met. */
function isPublishReady(gate: PublishGate): boolean {
  return Object.values(gate).every(Boolean);
}

/** Visual checklist indicator for a single recipe's publish readiness. */
function GateChecklist({ gate }: { gate: PublishGate }) {
  const items = [
    { label: "2+ ingredients", met: gate.hasEnoughIngredients },
    { label: "Instructions (20+ chars)", met: gate.hasInstructions },
    { label: "Description", met: gate.hasDescription },
    { label: "Category", met: gate.hasCategory },
  ];

  const metCount = items.filter(i => i.met).length;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(item => (
        <span
          key={item.label}
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            item.met
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {item.met ? "✓" : "○"} {item.label}
        </span>
      ))}
      <span className="text-[10px] font-bold text-muted-foreground ml-auto">
        {metCount}/4
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    in_review: { label: "In Review", className: "bg-blue-100 text-blue-700" },
    mod_queue: { label: "In Moderation", className: "bg-purple-100 text-purple-700" },
    revision_requested: { label: "Revision Needed", className: "bg-orange-100 text-orange-700" },
    published: { label: "Published", className: "bg-green-100 text-green-700" },
  };
  const c = config[status] || config.draft;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}

/** Card for a single recipe in the kitchen or published section. */
function RecipeCard({ recipe, showGate }: { recipe: Recipe; showGate?: boolean }) {
  const gate = getPublishGate(recipe);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="block border rounded-lg p-4 hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{recipe.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {recipe.description || "No description yet…"}
          </p>
          {recipe.published_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Published {new Date(recipe.published_at).toLocaleDateString()}
            </p>
          )}
          {recipe.status === "revision_requested" && (
            <p className="text-xs text-orange-600 mt-1">
              Moderator requested changes — view recipe for details
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={recipe.status} />
          <Badge variant="secondary">{recipe.category}</Badge>
          {recipe.fork_count > 0 && (
            <span className="text-xs text-muted-foreground">🍴 {recipe.fork_count}</span>
          )}
        </div>
      </div>
      {showGate && <GateChecklist gate={gate} />}
    </Link>
  );
}

export function MyKitchenPage() {
  const { token, username } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    // page_size=200 ensures all user recipes are returned in one request —
    // the kitchen page must show every draft/published recipe the user owns.
    api.get("/recipes/?page_size=200", token)
      .then((data: { results?: Recipe[] }) => setRecipes(data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <p className="text-muted-foreground">
        Please <Link to="/login" className="underline">sign in</Link> to view your kitchen.
      </p>
    );
  }

  const myRecipes = recipes.filter(r => r.author_username === username);
  const drafts = myRecipes.filter(r => r.status === "draft" || r.status === "revision_requested");
  const inReview = myRecipes.filter(r => r.status === "in_review");
  const inModeration = myRecipes.filter(r => r.status === "mod_queue");
  const published = myRecipes.filter(r => r.status === "published");

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !username) return;
    try {
      await api.post(
        `/users/${username}/kitchen/invite/`,
        { invitee_username: inviteUsername.trim() },
        token
      );
      setInviteMsg(`Invited @${inviteUsername.trim()}!`);
      setInviteUsername("");
      setTimeout(() => setInviteMsg(""), 3000);
    } catch {
      setInviteMsg("Failed to invite. Check the username.");
      setTimeout(() => setInviteMsg(""), 3000);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">My Kitchen</h1>

      {/* Test Kitchen Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">🧪 Test Kitchen</h2>
          <Badge variant="outline">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</Badge>
        </div>

        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recipes in the test kitchen.{" "}
            <Link to="/recipes/new" className="underline">Create one</Link> to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {drafts.map(r => (
              <RecipeCard key={r.slug} recipe={r} showGate />
            ))}
          </div>
        )}

        {/* Kitchen sharing */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Share your test kitchen with a friend
          </p>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-1.5 text-sm flex-1"
              placeholder="Username"
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
            <Button size="sm" onClick={handleInvite} disabled={!inviteUsername.trim()}>
              Invite
            </Button>
          </div>
          {inviteMsg && (
            <p className="text-xs font-medium text-indigo-600 mt-1.5 animate-in fade-in">
              {inviteMsg}
            </p>
          )}
        </div>
      </section>

      {/* In Review Section */}
      {inReview.length > 0 && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">🔍 In Review</h2>
              <Badge variant="outline">{inReview.length}</Badge>
            </div>
            <div className="space-y-3">
              {inReview.map(r => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* In Moderation Section */}
      {inModeration.length > 0 && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">⏳ In Moderation</h2>
              <Badge variant="outline">{inModeration.length}</Badge>
            </div>
            <div className="space-y-3">
              {inModeration.map(r => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
          </section>
        </>
      )}

      <Separator />

      {/* Published Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">✅ Published</h2>
          <Badge variant="outline">{published.length} recipe{published.length !== 1 ? "s" : ""}</Badge>
        </div>

        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published recipes yet. Perfect a recipe in your test kitchen to publish it!
          </p>
        ) : (
          <div className="space-y-3">
            {published.map(r => (
              <RecipeCard key={r.slug} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
