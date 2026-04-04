import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { ModerationQueueEntry } from "@/types";

export function ModerationPage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<ModerationQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get("/moderation/queue/", token)
      .then((data: ModerationQueueEntry[]) => setRecipes(data))
      .catch((err: { status?: number }) => {
        if (err.status === 403) setError("You don't have moderator access.");
        else setError("Failed to load queue.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async (slug: string) => {
    if (!token || !window.confirm("Approve this recipe for publishing?")) return;
    setActionInProgress(slug);
    try {
      await api.post(`/moderation/${slug}/approve/`, {}, token);
      setRecipes(prev => prev.filter(r => r.slug !== slug));
    } catch { setError("Failed to approve."); }
    setActionInProgress(null);
  };

  const handleRequestRevision = async (slug: string) => {
    if (!token) return;
    const feedback = feedbackMap[slug]?.trim();
    if (!feedback) return;
    setActionInProgress(slug);
    try {
      await api.post(`/moderation/${slug}/request-revision/`, { feedback }, token);
      setRecipes(prev => prev.filter(r => r.slug !== slug));
    } catch { setError("Failed to request revision."); }
    setActionInProgress(null);
  };

  if (!token) return <p className="text-muted-foreground">Please sign in.</p>;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive font-medium">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <Badge variant="outline">{recipes.length} pending</Badge>
      </div>

      {recipes.length === 0 ? (
        <p className="text-muted-foreground">No recipes awaiting moderation.</p>
      ) : (
        <div className="space-y-4">
          {recipes.map(recipe => (
            <Card key={recipe.slug}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/recipes/${recipe.slug}`} className="text-lg font-semibold hover:underline">
                      {recipe.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      by @{recipe.author_username}
                      {recipe.author_strike_count > 0 && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          {recipe.author_strike_count} strike{recipe.author_strike_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">{recipe.category}</Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    👍 {recipe.positive_votes}/{recipe.total_votes} votes
                  </span>
                  <span>Round {recipe.review_round}</span>
                </div>

                <p className="text-sm">{recipe.description}</p>

                <div className="flex items-start gap-3 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(recipe.slug)}
                    disabled={actionInProgress === recipe.slug}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Feedback (required for revision request)..."
                      rows={2}
                      value={feedbackMap[recipe.slug] || ""}
                      onChange={e => setFeedbackMap(prev => ({ ...prev, [recipe.slug]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestRevision(recipe.slug)}
                      disabled={
                        actionInProgress === recipe.slug ||
                        !feedbackMap[recipe.slug]?.trim()
                      }
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      Request Revision
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
