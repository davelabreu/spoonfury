import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getIngredientEmoji, PICKER_CATEGORIES } from "@/lib/ingredientEmoji";

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

  const pick = (emoji: string) => {
    onChange(emoji);
    setPopKey(k => k + 1);
    setOpen(false);
  };

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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-[460px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">Pick an ingredient</span>
              <button
                type="button"
                onClick={() => { onChange(""); setPopKey(k => k + 1); setOpen(false); }}
                className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors px-2 py-0.5 rounded-full hover:bg-indigo-50"
              >
                ↺ auto ({autoEmoji})
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-2.5">
              {PICKER_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <div className={`rounded-xl px-3 py-2 ${cat.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{cat.label}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cat.emojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => pick(emoji)}
                          className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg
                            hover:scale-[1.35] hover:shadow-md hover:-translate-y-0.5
                            active:scale-110
                            transition-all duration-150
                            ${value === emoji ? "bg-white/90 ring-2 ring-indigo-400 shadow-sm scale-110" : "hover:bg-white/70"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
