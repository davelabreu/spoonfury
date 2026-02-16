import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { ForkModal } from "@/components/ForkModal";

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<any>(null);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/recipes/${slug}/`).then(setRecipe);
  }, [slug]);

  if (!recipe) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>
          <Badge variant="secondary" className="shrink-0 mt-1">{recipe.category}</Badge>
        </div>
        {recipe.parent_recipe_slug && (
          <p className="text-sm text-muted-foreground mt-1">
            Forked from{" "}
            <a href={`/recipes/${recipe.parent_recipe_slug}`} className="underline">
              @{recipe.parent_recipe_author}'s {recipe.parent_recipe_title}
            </a>
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          by @{recipe.author_username}
          {recipe.fork_count > 0 && (
            <span className="ml-3">🍴 {recipe.fork_count} fork{recipe.fork_count !== 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      <p className="text-base leading-relaxed">{recipe.description}</p>
      <p className="text-sm text-muted-foreground">Serves: {recipe.serves}</p>

      <Separator />

      <IngredientChecklist ingredients={recipe.ingredients} />

      <Separator />

      <div>
        <h2 className="font-semibold text-lg mb-3">Instructions</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
        </div>
      </div>

      {recipe.notes && (
        <>
          <Separator />
          <div>
            <h2 className="font-semibold text-lg mb-3">Notes</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{recipe.notes}</ReactMarkdown>
            </div>
          </div>
        </>
      )}

      {token && (
        <div className="pt-4">
          <Button onClick={() => setForking(true)} className="w-full" size="lg">
            🍴 Make it mine
          </Button>
        </div>
      )}

      {forking && (
        <ForkModal
          recipe={recipe}
          token={token!}
          onClose={() => setForking(false)}
          onSuccess={(slug: string) => navigate(`/recipes/${slug}`)}
        />
      )}
    </article>
  );
}
