import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewsResponse } from "@/types";

interface ReviewPanelProps {
  recipeSlug: string;
  token: string;
}

export function ReviewPanel({ recipeSlug, token }: ReviewPanelProps) {
  const [reviewData, setReviewData] = useState<ReviewsResponse | null>(null);
  const [vote, setVote] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/recipes/${recipeSlug}/reviews/`, token)
      .then((data: ReviewsResponse) => setReviewData(data))
      .catch(() => {});
  }, [recipeSlug, token]);

  const handleSubmit = async () => {
    if (vote === null) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post(
        `/recipes/${recipeSlug}/review/`,
        { is_positive: vote, comment },
        token
      );
      // Refresh review data to show results
      const updated = await api.get(`/recipes/${recipeSlug}/reviews/`, token) as ReviewsResponse;
      setReviewData(updated);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to submit review.");
    }
    setSubmitting(false);
  };

  if (!reviewData) return null;

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Community Review
          <Badge variant="outline" className="text-[10px]">
            Round {reviewData.review_round}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote summary */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {reviewData.total_votes} vote{reviewData.total_votes !== 1 ? "s" : ""}
          </span>
          {reviewData.total_votes > 0 && (
            <span className="text-muted-foreground">
              ({reviewData.positive_votes} positive)
            </span>
          )}
          {reviewData.threshold_met && (
            <Badge className="bg-green-100 text-green-700 border-green-200">Threshold met</Badge>
          )}
        </div>

        {/* Vote form — only if user hasn't voted yet */}
        {!reviewData.has_voted ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={vote === true ? "default" : "outline"}
                size="sm"
                onClick={() => setVote(true)}
                className={vote === true ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <ThumbsUp className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                variant={vote === false ? "default" : "outline"}
                size="sm"
                onClick={() => setVote(false)}
                className={vote === false ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <ThumbsDown className="w-4 h-4 mr-1" /> Needs work
              </Button>
            </div>
            <Textarea
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={vote === null || submitting}
              size="sm"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">You've submitted your review.</p>
        )}

        {/* Revealed reviews (after voting) */}
        {reviewData.reviews && reviewData.reviews.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All reviews</p>
            {reviewData.reviews.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{r.is_positive ? "👍" : "👎"}</span>
                <div>
                  <span className="font-medium">@{r.reviewer}</span>
                  {r.comment && (
                    <p className="text-muted-foreground mt-0.5">{r.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
