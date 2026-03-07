import { buildInstacartUrl } from "@/lib/instacart";
import type { Ingredient } from "@/types";

interface Props {
  ingredients: Ingredient[];
  onClose: () => void;
}

export function BuyNowSheet({ ingredients, onClose }: Props) {
  const handleBuy = (fulfillment: "pickup" | "delivery") => {
    window.open(buildInstacartUrl(ingredients, fulfillment), "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-bold text-xl mb-1">Buy it NOW!</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleBuy("pickup")}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors"
          >
            🚗 Pickup
          </button>
          <button
            type="button"
            onClick={() => handleBuy("delivery")}
            className="w-full py-3 rounded-xl border-2 border-green-500 text-green-700 hover:bg-green-50 font-bold text-base transition-colors"
          >
            🏠 Delivery
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">via Instacart</p>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
