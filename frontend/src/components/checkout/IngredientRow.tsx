// frontend/src/components/checkout/IngredientRow.tsx
import { useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { getIngredientEmoji } from "@/lib/ingredientEmoji";
import { getIngredientInfo } from "@/lib/ingredientInfo";
import { getEstimatedPrice } from "@/lib/pricing";
import type { ShoppingItem } from "@/types";

const TOOLTIP_CONTENT_CLASS =
  "max-w-sm p-0 text-pretty bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-lg rounded-xl overflow-hidden [&>svg]:bg-neutral-100 [&>svg]:fill-neutral-100 [&>svg]:size-4 [&>svg]:translate-y-[calc(-50%_-_1px)]";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

interface IngredientRowProps {
  item: ShoppingItem;
  multiplier?: number;
  onDelete: (item: ShoppingItem) => void;
  onToggle: (item: ShoppingItem) => void;
}

export function IngredientRow({ item, multiplier = 1, onDelete, onToggle }: IngredientRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  // ── Swipe-to-delete (mobile) ──
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current || !rowRef.current) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = Math.min(0, dx);
    rowRef.current.style.transform = `translateX(${currentX.current}px)`;
    rowRef.current.style.transition = "none";
    const progress = Math.min(1, Math.abs(currentX.current) / 80);
    rowRef.current.style.backgroundColor = `rgba(239, 68, 68, ${progress * 0.15})`;
  };
  const onTouchEnd = () => {
    if (!swiping.current || !rowRef.current) return;
    swiping.current = false;
    rowRef.current.style.transition = "transform 0.2s ease-out, background-color 0.2s ease-out";
    if (currentX.current < -80) {
      rowRef.current.style.transform = "translateX(-100%)";
      rowRef.current.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
      setTimeout(() => onDelete(item), 200);
    } else {
      rowRef.current.style.transform = "translateX(0)";
      rowRef.current.style.backgroundColor = "";
    }
  };

  const rawEmoji = getIngredientEmoji(item.name);
  const emoji = rawEmoji !== "🛒" ? rawEmoji : "";
  const info = getIngredientInfo(item.name);
  const price = getEstimatedPrice(item.name);

  const qty = item.quantity
    ? (multiplier > 1 && !isNaN(Number(item.quantity))
        ? String(Number(item.quantity) * multiplier)
        : item.quantity)
    : "";

  const tooltipInner = info ? (
    <div className="flex">
      <div className="w-1 shrink-0 bg-indigo-400 rounded-l-xl" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div>
          <p className="text-sm font-semibold">{emoji || "🛒"} {item.name}</p>
          <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">{info.description}</p>
        </div>
        {info.nutrition && (
          <p className="text-xs leading-snug">
            <span className="font-semibold text-green-700">🌱 Health: </span>
            <span className="text-neutral-700">{info.nutrition}</span>
          </p>
        )}
        {info.tip && (
          <p className="text-xs leading-snug">
            <span className="font-semibold text-amber-600">✦ Tip: </span>
            <span className="text-neutral-700">{info.tip}</span>
          </p>
        )}
      </div>
    </div>
  ) : null;

  const emojiTile = (
    <div className={`w-7 h-7 flex items-center justify-center text-base shrink-0 rounded-lg select-none ${item.is_checked ? "bg-muted/30" : "bg-muted/50"}`}>
      {emoji || "🛒"}
    </div>
  );

  const nameAndQty = (
    <div className="flex flex-col min-w-0 flex-1">
      <span className={`text-sm leading-tight ${item.is_checked ? "line-through text-muted-foreground opacity-60" : ""}`}>
        {titleCase(item.name)}
      </span>
      {(qty || item.note) && (
        <span className="text-xs text-muted-foreground mt-0.5">
          {qty && <>{qty}{item.unit ? ` × ${item.unit}` : ""}</>}
          {qty && item.note && " · "}
          {item.note}
        </span>
      )}
    </div>
  );

  const content = (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      {emojiTile}
      {nameAndQty}
    </div>
  );

  return (
    <div
      ref={rowRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex items-center gap-2 py-1.5 px-3 border-b border-border/30 last:border-b-0"
    >
      <input
        type="checkbox"
        checked={item.is_checked}
        onChange={() => onToggle(item)}
        className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer shrink-0"
        aria-label={`Mark ${item.name} as picked up`}
      />
      {info ? (
        <div className="flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0} className="cursor-default outline-none inline-flex">{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className={TOOLTIP_CONTENT_CLASS}>
              {tooltipInner}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : <div className="flex-1 min-w-0">{content}</div>}
      <span className="text-sm font-semibold text-amber-500 min-w-[3rem] text-right tabular-nums">
        ${price.toFixed(2)}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="trash-shake p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
