import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchBannerProps {
  onSearch: (query: string) => void;
  initial?: string;
}

export function SearchBanner({ onSearch, initial = "" }: SearchBannerProps) {
  const [query, setQuery] = useState(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query.trim());
  }

  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600" />
      {/* Animated shimmer overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 6s ease-in-out infinite",
        }}
      />

      {/* Liquid glass card floating above gradient */}
      <Card className="relative bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl py-0 rounded-3xl">
        <CardContent className="px-8 py-10 sm:py-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3 drop-shadow-sm">
            What will you cook today?
          </h1>
          <p className="text-white/60 text-sm sm:text-base mb-8 max-w-md mx-auto">
            Discover recipes, fork your favorites, make them yours
          </p>
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
            <Input
              type="text"
              placeholder="Search recipes, ingredients, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 pr-4 h-12 rounded-2xl bg-white/90 backdrop-blur-md border-white/30 shadow-lg text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-white/40 transition-shadow duration-300 hover:shadow-xl"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
