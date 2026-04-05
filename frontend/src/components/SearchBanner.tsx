import { useState } from "react";
import { Search } from "lucide-react";
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
    <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 p-8 sm:p-10 text-center shadow-lg">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
        What will you cook today?
      </h1>
      <p className="text-white/70 text-sm sm:text-base mb-6">
        Discover recipes, fork your favorites, make them yours
      </p>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search recipes, ingredients, tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-4 h-11 rounded-full bg-white/95 backdrop-blur border-0 shadow-md text-sm placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-white/50"
        />
      </form>
    </div>
  );
}
