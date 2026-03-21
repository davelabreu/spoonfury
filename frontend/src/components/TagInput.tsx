import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Tag } from "@/types";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data: Tag[] = await api.get(`/tags/?search=${encodeURIComponent(input)}`);
        const filtered = data.filter((t) => !tags.includes(t.name));
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [input, tags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTag = (name: string) => {
    const clean = name.toLowerCase().trim();
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInput("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (name: string) => {
    onChange(tags.filter((t) => t !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addTag(suggestions[activeIndex].name);
      } else {
        addTag(input);
      }
      return;
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
      return;
    }
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Add tags (cuisine, dietary, vibe…)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          className="text-sm"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
            <ul className="py-1">
              {suggestions.map((tag, i) => (
                <li
                  key={tag.slug}
                  className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer ${
                    i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(tag.name);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span>{tag.name}</span>
                  <span className="text-xs text-muted-foreground">{tag.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive"
              >
                ✕
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
