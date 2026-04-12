import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Recipe } from "@/types";

interface DraggableRecipeProps {
  recipe: Recipe;
}

export function DraggableRecipe({ recipe }: DraggableRecipeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${recipe.slug}`,
    data: {
      recipe,
      type: "library-recipe",
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group bg-background border rounded-md p-3 shadow-sm hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all active:cursor-grabbing"
    >
      <div className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
        {recipe.title}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {recipe.category.replace("_", " ")}
        </span>
        {recipe.prep_time && (
          <span className="text-[10px] text-muted-foreground">
            {recipe.prep_time}m
          </span>
        )}
      </div>
    </div>
  );
}
