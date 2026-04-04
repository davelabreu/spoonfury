/**
 * PublishModal — Confirmation modal for the "Perfect It" publish flow.
 *
 * Shows a full recipe preview (exactly what the public will see),
 * then fires confetti on confirmation. The recipe is published via
 * POST /recipes/{slug}/publish/.
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Recipe } from "@/types";

interface PublishModalProps {
  recipe: Recipe;
  token: string;
  onClose: () => void;
  onPublished: (updated: Recipe) => void;
}

/** Fire a celebratory confetti burst from the center of the screen. */
function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A29BFE", "#FF8E53"],
  });
}

export function PublishModal({ recipe, token, onClose, onPublished }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const updated = await api.post(`/recipes/${recipe.slug}/publish/`, {}, token);
      fireConfetti();
      // Small delay so the user sees the confetti before the modal closes
      setTimeout(() => onPublished(updated), 800);
    } catch (err: unknown) {
      const e = err as { data?: { errors?: string[] } };
      setError(e.data?.errors?.join(" ") || "Failed to publish. Try again.");
      setPublishing(false);
    }
  };

  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl bg-white animate-in zoom-in-95 duration-200 border-none">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-amber-600 mb-1">
            🎉 Ready to share this with the world?
          </p>
          <CardTitle className="text-black text-xl">Recipe Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview: mirrors RecipePage layout */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold leading-tight">{recipe.title}</h2>
              <Badge variant="secondary" className="shrink-0 mt-1">{recipe.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">by @{recipe.author_username}</p>
          </div>

          <p className="text-base leading-relaxed">{recipe.description}</p>
          <p className="text-sm text-muted-foreground">Serves: {recipe.serves}</p>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-2">Ingredients ({validIngredients.length})</h3>
            <ul className="space-y-1">
              {validIngredients.map((ing, i) => (
                <li key={i} className="text-sm">
                  {ing.quantity} {ing.unit} {ing.name}
                  {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-2">Instructions</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
            </div>
          </div>

          {recipe.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">Notes</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Separator />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {publishing ? "Publishing…" : "🎉 Perfect It — Publish!"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={publishing}
              className="text-black border-slate-200 hover:bg-slate-50"
            >
              Not yet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
