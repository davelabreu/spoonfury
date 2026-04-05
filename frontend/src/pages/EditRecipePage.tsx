import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Plus, X } from "lucide-react";
import type { Ingredient, ReviewsResponse } from "@/types";
import { IngredientEmojiPicker } from "@/components/IngredientEmojiPicker";
import { ImageUploadField } from "@/components/ImageUploadField";
import { DraftBanner } from "@/components/DraftBanner";

export function EditRecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reviewData, setReviewData] = useState<ReviewsResponse | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serves, setServes] = useState("");
  const [category, setCategory] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!slug) return;
    api.get(`/recipes/${slug}/`, token ?? undefined)
      .then((r: any) => {
        if (r.author_username !== username) {
          setError("You can only edit your own recipes.");
          return;
        }
        setStatus(r.status || "draft");
        setTitle(r.title);
        setDescription(r.description);
        setServes(r.serves);
        setCategory(r.category);
        setIngredients(r.ingredients);
        setInstructions(r.instructions);
        setNotes(r.notes || "");
        setImageUrl(r.image_url || "");
        if (r.status === "revision_requested" && token) {
          api.get(`/recipes/${r.slug}/reviews/`, token)
            .then((d: ReviewsResponse) => setReviewData(d))
            .catch(() => {});
        }
      })
      .catch(() => setError("Failed to load recipe."))
      .finally(() => setLoading(false));
  }, [slug, username]);

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { quantity: "", unit: "", name: "", note: "", emoji: "" }]);
  };

  const removeIngredient = (i: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!token || !slug) return;
    setError("");
    try {
      const payload: Record<string, unknown> = {
        title, description, serves,
        ingredients: ingredients.filter(i => i.name.trim() !== ""),
        instructions, notes,
      };
      if (imageUrl) payload.image_url = imageUrl;
      else payload.image_url = "";
      await api.patch(`/recipes/${slug}/`, payload, token);
      navigate(`/recipes/${slug}`);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to save changes.");
    }
  };

  if (!token) return <p className="text-muted-foreground">Sign in to edit recipes.</p>;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  const liveGate = {
    hasEnoughIngredients: ingredients.filter(i => i.name.trim() !== "").length >= 2,
    hasDescription: description.trim().length > 0,
    hasInstructions: instructions.trim().length >= 20,
    hasCategory: category.trim().length > 0,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Navigation */}
      <div className="flex items-center -ml-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Draft banner — reactive to live form state, pills flip green as you type */}
      {(status === "draft" || status === "revision_requested") && slug && (
        <DraftBanner status={status} gate={liveGate} slug={slug} moderationFeedback={reviewData?.moderation_feedback} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit Recipe</h1>
        <Badge variant="secondary" className="px-3 py-1 font-semibold">{category.replace(/_/g, " ")}</Badge>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 block">Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are we cooking?"
            className="text-lg font-semibold h-11"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 block">Description</label>
          <Textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={280}
            placeholder="A short tweet-style description..."
            className="resize-none"
          />
        </div>

        <div className="w-48">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 block">Serves</label>
          <Input
            value={serves}
            onChange={e => setServes(e.target.value)}
            placeholder="e.g. 4"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 block">Recipe Photo</label>
          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            token={token!}
          />
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Ingredients</h3>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border/40">
                <IngredientEmojiPicker
                  value={ing.emoji}
                  ingredientName={ing.name}
                  onChange={v => updateIngredient(i, "emoji", v)}
                />
                <Input 
                  className="w-16 h-9" 
                  value={ing.quantity}
                  onChange={e => updateIngredient(i, "quantity", e.target.value)} 
                  placeholder="Qty" 
                />
                
                <Select value={ing.unit} onValueChange={v => updateIngredient(i, "unit", v)}>
                  <SelectTrigger className="w-24 h-9 bg-white">
                    <SelectValue placeholder="unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Volume</SelectLabel>
                      <SelectItem value="tsp">tsp</SelectItem>
                      <SelectItem value="tbsp">tbsp</SelectItem>
                      <SelectItem value="cup">cup</SelectItem>
                      <SelectItem value="fl oz">fl oz</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Weight</SelectLabel>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Cooking</SelectLabel>
                      <SelectItem value="pinch">pinch</SelectItem>
                      <SelectItem value="clove">clove</SelectItem>
                      <SelectItem value="slice">slice</SelectItem>
                      <SelectItem value="sprig">sprig</SelectItem>
                      <SelectItem value="bunch">bunch</SelectItem>
                      <SelectItem value="head">head</SelectItem>
                      <SelectItem value="can">can</SelectItem>
                      <SelectItem value="pkg">pkg</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Input 
                  className="flex-1 h-9" 
                  value={ing.name}
                  onChange={e => updateIngredient(i, "name", e.target.value)} 
                  placeholder="Ingredient name" 
                />
                <Input 
                  className="w-32 h-9" 
                  value={ing.note}
                  onChange={e => updateIngredient(i, "note", e.target.value)} 
                  placeholder="Note" 
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredient(i)} 
                  className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addIngredient} className="mt-3 border-dashed w-full gap-2 text-muted-foreground hover:text-foreground">
            <Plus className="size-3.5" /> Add ingredient
          </Button>
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Instructions</h3>
          <Textarea
            className="w-full font-mono min-h-[200px]"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="1. Start by... \n2. Then..."
          />
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Notes (optional)</h3>
          <Textarea
            className="w-full font-mono min-h-[100px]"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional tips, variations, or serving suggestions..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button onClick={submit} className="flex-1 h-11 bg-saffron hover:bg-saffron-dark text-white border-0 font-bold text-base shadow-lg shadow-saffron/20 transition-all">
          Save changes
        </Button>
        <Button variant="outline" onClick={() => navigate(`/recipes/${slug}`)} className="h-11 px-8 rounded-xl">
          Cancel
        </Button>
      </div>
    </div>
  );
}
