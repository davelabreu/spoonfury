import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IngredientEmojiPicker } from "@/components/IngredientEmojiPicker";

const CATEGORIES = ["soup","pasta","bake","salad","grill","breakfast","dessert","drink","snack","other"];

export function CreateRecipePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", serves: "",
    instructions: "", notes: "", category: "other",
  });
  const [ingredients, setIngredients] = useState([{ quantity: "", unit: "", name: "", note: "", emoji: "" }]);
  const [error, setError] = useState("");

  if (!token) return <p>Please <a href="/login" className="underline">sign in</a> to create recipes.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post("/recipes/", { 
        ...form, 
        ingredients: ingredients.filter(i => i.name.trim() !== "") 
      }, token);
      navigate(`/recipes/${data.slug}`);
    } catch (err: unknown) {
      const e = err as { data?: unknown };
      setError(JSON.stringify(e.data || "Failed to create recipe."));
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
            <select className="border rounded px-3 py-2 text-sm" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

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
                <input className="border rounded px-2 py-1 text-xs w-14" placeholder="Unit"
                  value={ing.unit} onChange={e => updateIng(i, "unit", e.target.value)} />
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
