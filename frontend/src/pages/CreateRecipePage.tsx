import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IngredientEmojiPicker } from "@/components/IngredientEmojiPicker";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TagInput } from "@/components/TagInput";

const CATEGORIES: [string, string][] = [
  ["sandwich_burger", "Sandwiches & Burgers"],
  ["pizza", "Pizza & Flatbreads"],
  ["soup", "Soup & Stews"],
  ["salad", "Salads"],
  ["pasta_noodles", "Pasta & Noodles"],
  ["meat_seafood", "Meat & Seafood"],
  ["bowl", "Bowls"],
  ["casserole_bake", "Casseroles & Bakes"],
  ["side_dish", "Side Dishes"],
  ["sauce_condiment", "Sauces & Condiments"],
  ["breakfast_bakery", "Breakfast & Bakery"],
  ["dessert", "Desserts"],
  ["drink", "Drinks"],
  ["snack_app", "Snacks & Appetizers"],
  ["other", "Other"],
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
      const data = await api.post("/recipes/", payload, token);
      navigate(`/recipes/${data.slug}`);
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
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Title (max 100 chars)"
            maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} maxLength={280}
            placeholder="Description (max 280 chars — the elevator pitch)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3">
            <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="Serves"
              value={form.serves} onChange={e => setForm(f => ({ ...f, serves: e.target.value }))} />
            <Select
              value={form.category}
              onValueChange={val => setForm(f => ({ ...f, category: val }))}
            >
              <SelectTrigger className="w-[220px] text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Tags</h3>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <ImageUploadField
            value={form.image_url}
            onChange={url => setForm(f => ({ ...f, image_url: url }))}
            token={token}
          />

          <div>
            <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <IngredientEmojiPicker
                  value={ing.emoji}
                  ingredientName={ing.name}
                  onChange={v => updateIng(i, "emoji", v)}
                />
                <input className="border rounded px-2 py-1 text-xs w-14" placeholder="Qty"
                  value={ing.quantity} onChange={e => updateIng(i, "quantity", e.target.value)} />
                <select className="border rounded px-2 py-1 text-xs w-20 bg-white" value={ing.unit}
                  onChange={e => updateIng(i, "unit", e.target.value)}>
                  <option value="">— unit</option>
                  <optgroup label="Volume">
                    <option>tsp</option>
                    <option>tbsp</option>
                    <option>cup</option>
                    <option>fl oz</option>
                    <option>ml</option>
                    <option>L</option>
                  </optgroup>
                  <optgroup label="Weight">
                    <option>g</option>
                    <option>kg</option>
                    <option>oz</option>
                    <option>lb</option>
                  </optgroup>
                  <optgroup label="Cooking">
                    <option>pinch</option>
                    <option>clove</option>
                    <option>slice</option>
                    <option>sprig</option>
                    <option>bunch</option>
                    <option>head</option>
                    <option>can</option>
                    <option>pkg</option>
                  </optgroup>
                </select>
                <input className="border rounded px-2 py-1 text-xs flex-1" placeholder="Name"
                  value={ing.name} onChange={e => updateIng(i, "name", e.target.value)} />
                <input className="border rounded px-2 py-1 text-xs w-24" placeholder="Note"
                  value={ing.note} onChange={e => updateIng(i, "note", e.target.value)} />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => setIngredients(p => p.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500">✕</button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setIngredients(p => [...p, { quantity: "", unit: "", name: "", note: "", emoji: "" }])}>
              + Add ingredient
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Instructions (markdown)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={10}
              value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Notes (optional markdown)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={4}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Publish Recipe</Button>
        </form>
      </CardContent>
    </Card>
  );
}
