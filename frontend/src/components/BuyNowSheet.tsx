import { buildInstacartUrl } from "@/lib/instacart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Buy it NOW!</DialogTitle>
          <DialogDescription>
            {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={() => handleBuy("pickup")}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base"
          >
            🚗 Pickup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleBuy("delivery")}
            className="w-full py-3 rounded-xl border-2 border-green-500 text-green-700 hover:bg-green-50 font-bold text-base"
          >
            🏠 Delivery
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">via Instacart</p>
      </DialogContent>
    </Dialog>
  );
}
