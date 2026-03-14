import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getIngredientEmoji, PICKER_EMOJIS } from "@/lib/ingredientEmoji";

interface Props {
  value: string | undefined;
  ingredientName: string;
  onChange: (emoji: string) => void;
}

export function IngredientEmojiPicker({ value, ingredientName, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Track auto-emoji changes → spring pop
  const autoEmoji = getIngredientEmoji(ingredientName);
  const prevAutoRef = useRef(autoEmoji);
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    if (!value && autoEmoji !== prevAutoRef.current && autoEmoji !== "🛒") {
      setPopKey(k => k + 1);
    }
    prevAutoRef.current = autoEmoji;
  }, [autoEmoji, value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayed = value || autoEmoji;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Change emoji"
        className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-base transition-colors overflow-hidden"
      >
        <motion.span
          key={popKey}
          initial={popKey > 0 ? { scale: 0.2, rotate: -20 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
        >
          {displayed}
        </motion.span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-52">
          {/* Reset to auto */}
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-[10px] text-center text-indigo-400 hover:text-indigo-600 py-0.5 mb-1.5 border-b border-gray-100 transition-colors"
          >
            ↺ auto ({autoEmoji})
          </button>
          <div className="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
            {PICKER_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={`text-base p-0.5 rounded hover:bg-indigo-50 transition-colors leading-none ${value === emoji ? "bg-indigo-100 ring-1 ring-indigo-300" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
