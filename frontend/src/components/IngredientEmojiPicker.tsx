import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getIngredientEmoji, PICKER_CATEGORIES } from "@/lib/ingredientEmoji";
import { getIngredientInfo } from "@/lib/ingredientInfo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      onChange(autoEmoji);
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
  const info = getIngredientInfo(ingredientName);

  const pick = (emoji: string) => {
    onChange(emoji);
    setPopKey(k => k + 1);
    setOpen(false);
  };

  const triggerButton = (
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
  );

  return (
    <div ref={ref} className="relative shrink-0">
      {info ? (
        <Tooltip open={open ? false : undefined}>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="max-w-sm p-0 text-pretty bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-lg rounded-xl overflow-hidden [&>svg]:bg-neutral-100 [&>svg]:fill-neutral-100 [&>svg]:size-4 [&>svg]:translate-y-[calc(-50%_-_1px)]"
          >
            <div className="flex">
              <div className="w-1 shrink-0 bg-indigo-400 rounded-l-xl" />
              <div className="px-3 py-2.5 space-y-1.5">
                <div>
                  <p className="text-sm font-semibold">{displayed} {ingredientName}</p>
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
          </TooltipContent>
        </Tooltip>
      ) : triggerButton}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 w-[min(90vw,calc(100vw-4rem))] max-w-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Pick an ingredient</span>
              <button
                type="button"
                onClick={() => { onChange(""); setPopKey(k => k + 1); setOpen(false); }}
                className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors px-2 py-0.5 rounded-full hover:bg-indigo-50"
              >
                ↺ auto ({autoEmoji})
              </button>
            </div>

            {/* Categories — 2-col on desktop, 1-col on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PICKER_CATEGORIES.map(cat => (
                <div key={cat.label} className={`rounded-lg px-2.5 py-1.5 ${cat.color}`}>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{cat.label}</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {cat.emojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => pick(emoji)}
                        className={`text-xl w-8 h-8 flex items-center justify-center rounded-md
                          hover:scale-[1.35] hover:-translate-y-0.5
                          active:scale-110
                          transition-transform duration-150
                          ${value === emoji ? "bg-white/90 ring-2 ring-indigo-400 shadow-sm scale-110" : "hover:bg-white/70"}`}
                      >
                        {emoji}
                      </button>
                    ))}
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
