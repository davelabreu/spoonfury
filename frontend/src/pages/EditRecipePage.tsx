import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import type { Ingredient } from "@/types";
import { IngredientEmojiPicker } from "@/components/IngredientEmojiPicker";

export function EditRecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serves, setServes] = useState("");
  const [category, setCategory] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!slug) return;
    api.get(`/recipes/${slug}/`)
      .then((r: any) => {
        if (r.author_username !== username) {
          setError("You can only edit your own recipes.");
          return;
        }
        setTitle(r.title);
        setDescription(r.description);
        setServes(r.serves);
        setCategory(r.category);
        setIngredients(r.ingredients);
        setInstructions(r.instructions);
        setNotes(r.notes || "");
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
      await api.patch(`/recipes/${slug}/`, {
        title,
        description,
        serves,
        ingredients: ingredients.filter(i => i.name.trim() !== ""),
        instructions,
        notes,
      }, token);
      navigate(`/recipes/${slug}`);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to save changes.");
    }
  };

  if (!token) return <p className="text-muted-foreground">Sign in to edit recipes.</p>;
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Navigation */}
      <div className="flex items-center -ml-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
        <Badge variant="secondary">{category}</Badge>
      </div>

      <input
        className="w-full border rounded px-3 py-2 text-sm"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
      />
      <textarea
        className="w-full border rounded px-3 py-2 text-sm"
        rows={2}
        value={description}
        onChange={e => setDescription(e.target.value)}
        maxLength={280}
        placeholder="Description (280 chars)"
      />
      <input
        className="w-full border rounded px-3 py-2 text-sm"
        value={serves}
        onChange={e => setServes(e.target.value)}
        placeholder="Serves"
      />

      <div>
        <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <IngredientEmojiPicker
              value={ing.emoji}
              ingredientName={ing.name}
              onChange={v => updateIngredient(i, "emoji", v)}
            />
            <input className="border rounded px-2 py-1 text-xs w-14" value={ing.quantity}
              onChange={e => updateIngredient(i, "quantity", e.target.value)} placeholder="Qty" />
            <select className="border rounded px-2 py-1 text-xs w-20 bg-white" value={ing.unit}
              onChange={e => updateIngredient(i, "unit", e.target.value)}>
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
            <input className="border rounded px-2 py-1 text-xs flex-1" value={ing.name}
              onChange={e => updateIngredient(i, "name", e.target.value)} placeholder="Name" />
            <input className="border rounded px-2 py-1 text-xs w-24" value={ing.note}
              onChange={e => updateIngredient(i, "note", e.target.value)} placeholder="Note" />
            <button onClick={() => removeIngredient(i)} className="text-xs text-destructive hover:opacity-70">✕</button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addIngredient}>+ Add ingredient</Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Instructions</h3>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm font-mono"
          rows={8}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Notes (optional)</h3>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm font-mono"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={submit} className="flex-1">Save changes</Button>
        <Button variant="outline" onClick={() => navigate(`/recipes/${slug}`)}>Cancel</Button>
      </div>
    </div>
  );
}
