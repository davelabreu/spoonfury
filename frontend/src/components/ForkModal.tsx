import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

interface ForkModalProps {
  recipe: any;
  token: string;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}

export function ForkModal({ recipe, token, onClose, onSuccess }: ForkModalProps) {
  const [title, setTitle] = useState(`${recipe.title} (my version)`);
  const [description, setDescription] = useState(recipe.description);
  const [serves, setServes] = useState(recipe.serves);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    JSON.parse(JSON.stringify(recipe.ingredients)) // deep copy
  );
  const [instructions, setInstructions] = useState(recipe.instructions);
  const [notes, setNotes] = useState(recipe.notes || "");
  const [error, setError] = useState("");

  const originalNames = new Set<string>(recipe.ingredients.map((i: Ingredient) => i.name.trim().toLowerCase()));
  const currentNames = new Set(ingredients.map(i => i.name.trim().toLowerCase()));
  const added = [...currentNames].filter(n => !originalNames.has(n));
  const removed = [...originalNames].filter(n => !currentNames.has(n));
  const changeCount = Math.max(added.length, removed.length);

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    if (changeCount >= 3) return;
    setIngredients(prev => [...prev, { quantity: "", unit: "", name: "", note: "" }]);
  };

  const removeIngredient = (i: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    setError("");
    try {
      const data = await api.post(
        `/recipes/${recipe.slug}/fork/`,
        { title, description, serves, ingredients, instructions, notes },
        token,
      );
      onSuccess(data.slug);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to save fork.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Make it mine — forking "{recipe.title}"</CardTitle>
          <p className="text-sm text-muted-foreground">
            Category locked to: <strong>{recipe.category}</strong> · Ingredient changes:{" "}
            <span className={changeCount > 3 ? "text-red-500 font-bold" : "font-semibold"}>
              {changeCount}/3
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input className="w-full border rounded px-3 py-2 text-sm font-semibold" value={title}
            onChange={e => setTitle(e.target.value)} placeholder="Recipe title" />
          <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={description}
            onChange={e => setDescription(e.target.value)} maxLength={280} placeholder="Description (280 chars)" />
          <input className="w-full border rounded px-3 py-2 text-sm" value={serves}
            onChange={e => setServes(e.target.value)} placeholder="Serves" />

          <div>
            <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input className="border rounded px-2 py-1 text-xs w-14" value={ing.quantity}
                  onChange={e => updateIngredient(i, "quantity", e.target.value)} placeholder="Qty" />
                <input className="border rounded px-2 py-1 text-xs w-14" value={ing.unit}
                  onChange={e => updateIngredient(i, "unit", e.target.value)} placeholder="Unit" />
                <input className="border rounded px-2 py-1 text-xs flex-1" value={ing.name}
                  onChange={e => updateIngredient(i, "name", e.target.value)} placeholder="Ingredient name" />
                <input className="border rounded px-2 py-1 text-xs w-24" value={ing.note}
                  onChange={e => updateIngredient(i, "note", e.target.value)} placeholder="Note" />
                <button onClick={() => removeIngredient(i)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addIngredient} disabled={changeCount >= 3}>
              + Add ingredient
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Instructions</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={8}
              value={instructions} onChange={e => setInstructions(e.target.value)} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Notes (optional)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={3}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button onClick={submit} disabled={changeCount > 3} className="flex-1">
              Save my version
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
