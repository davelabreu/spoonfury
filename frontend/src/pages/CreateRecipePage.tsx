import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IngredientEmojiPicker } from "@/components/IngredientEmojiPicker";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TagInput } from "@/components/TagInput";

const CATEGORY_CHOICES = [
  { value: "sandwich_burger", label: "Sandwiches & Burgers" },
  { value: "pizza", label: "Pizza & Flatbreads" },
  { value: "soup", label: "Soup & Stews" },
  { value: "salad", label: "Salads" },
  { value: "pasta_noodles", label: "Pasta & Noodles" },
  { value: "meat_seafood", label: "Meat & Seafood" },
  { value: "bowl", label: "Bowls" },
  { value: "casserole_bake", label: "Casseroles & Bakes" },
  { value: "side_dish", label: "Side Dishes" },
  { value: "sauce_condiment", label: "Sauces & Condiments" },
  { value: "breakfast_bakery", label: "Breakfast & Bakery" },
  { value: "dessert", label: "Desserts" },
  { value: "drink", label: "Drinks" },
  { value: "snack_app", label: "Snacks & Appetizers" },
  { value: "other", label: "Other" },
];

export function CreateRecipePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", serves: "",
    instructions: "", notes: "", category: "other", image_url: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState([{ quantity: "", unit: "", name: "", note: "", emoji: "" }]);
  const [error, setError] = useState("");

  if (!token) return <p>Please <a href="/login" className="underline">sign in</a> to create recipes.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        ...form,
        tags,
        ingredients: ingredients.filter(i => i.name.trim() !== ""),
      };
      if (!payload.image_url) delete payload.image_url;
      await api.post("/recipes/", payload, token);
      navigate("/kitchen");
    } catch (err: unknown) {
      const e = err as { status?: number; data?: unknown };
      setError(`Error ${e.status ?? "?"}: ${JSON.stringify(e.data) || "Failed to create recipe."}`);
    }
  };

  const updateIng = (i: number, f: string, v: string) =>
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [f]: v } : ing));

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader><CardTitle>New Recipe</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-8">

          {/* ── Section 1: The Identity ── */}
          <section className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="What's this dish called? (max 100 chars)"
                maxLength={100} value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} maxLength={280}
                placeholder="The elevator pitch — what makes this special? (max 280 chars)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <ImageUploadField
              value={form.image_url}
              onChange={url => setForm(f => ({ ...f, image_url: url }))}
              token={token}
            />
          </section>

          <Separator />

          {/* ── Section 2: The Classification ── */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Classify your dish</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Pick one primary category, then add tags for cuisine, diet, or vibe.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Primary Category</Label>
                <Select
                  value={form.category}
                  onValueChange={val => setForm(f => ({ ...f, category: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_CHOICES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (Cuisine, Diet, Vibe)</Label>
                <TagInput tags={tags} onChange={setTags} />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Section 3: The Blueprint ── */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold mb-1">Ingredients</h3>
                <p className="text-xs text-muted-foreground">
                  Add each ingredient with an amount, unit, and optional note.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="serves" className="text-xs whitespace-nowrap">Serves</Label>
                <Input id="serves" className="w-20 text-xs" placeholder='e.g. 4'
                  value={form.serves} onChange={e => setForm(f => ({ ...f, serves: e.target.value }))} />
              </div>
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <IngredientEmojiPicker
                  value={ing.emoji}
                  ingredientName={ing.name}
                  onChange={v => updateIng(i, "emoji", v)}
                />
                <Input className="w-16 text-xs" placeholder="Qty"
                  value={ing.quantity} onChange={e => updateIng(i, "quantity", e.target.value)} />
                <Select value={ing.unit} onValueChange={v => updateIng(i, "unit", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-20 h-9 text-xs">
                    <SelectValue placeholder="unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">unit</SelectItem>
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
                <Input className="flex-1 text-xs" placeholder="Ingredient name"
                  value={ing.name} onChange={e => updateIng(i, "name", e.target.value)} />
                <Input className="w-24 text-xs" placeholder="Note"
                  value={ing.note} onChange={e => updateIng(i, "note", e.target.value)} />
                {ingredients.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => setIngredients(p => p.filter((_, idx) => idx !== i))}>✕</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setIngredients(p => [...p, { quantity: "", unit: "", name: "", note: "", emoji: "" }])}>
              + Add ingredient
            </Button>
          </section>

          <Separator />

          {/* ── Section 4: The Execution ── */}
          <section className="space-y-4">
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <p className="text-xs text-muted-foreground mb-1">Markdown supported</p>
              <Textarea id="instructions" className="font-mono" rows={10}
                placeholder="Step-by-step instructions..."
                value={form.instructions}
                onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <p className="text-xs text-muted-foreground mb-1">Tips, variations, or backstory</p>
              <Textarea id="notes" className="font-mono" rows={4}
                placeholder="Any extra notes or tips..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </section>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" size="lg">Save to Test Kitchen 🧪</Button>
        </form>
      </CardContent>
    </Card>
  );
}
