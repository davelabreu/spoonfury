import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Ingredient } from "@/types";

interface Props {
  ingredients: Ingredient[];
  inList: boolean;
  onAddToList?: (needed: Ingredient[]) => void;
  onBuyNow?: (needed: Ingredient[]) => void;
  addBtnRef?: React.RefObject<HTMLButtonElement | null>;
  active: boolean;
}

export function CookModeIngredients({ 
  ingredients, 
  inList, 
  onAddToList, 
  onBuyNow, 
  addBtnRef,
  active 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Don't show anything if Cook Mode is inactive or we're on desktop
  // (On desktop, it's handled via a sticky column in RecipePage)
  if (!active || isDesktop) return null;

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold h-14 px-6 gap-2 border-2 border-white/20"
        >
          <ListIcon className="w-5 h-5" />
          Ingredients
        </Button>
      </motion.div>

      {/* Bottom Sheet Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-[2rem] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Handle / Header */}
              <div className="flex flex-col items-center pt-3 pb-2 border-b">
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mb-4" />
                <div className="w-full px-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Ingredients</h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)}
                    className="rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto pb-12">
                <IngredientChecklist
                  ingredients={ingredients}
                  inList={inList}
                  onAddToList={onAddToList}
                  onBuyNow={onBuyNow}
                  addBtnRef={addBtnRef}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
