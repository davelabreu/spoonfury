import { useState } from "react";

export type NavTheme = "sticker" | "minimal";
const KEY = "spoonfury-nav-theme";

export function useNavTheme() {
  const [theme, setThemeState] = useState<NavTheme>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored === "minimal" ? "minimal" : "sticker";
    } catch {
      return "sticker";
    }
  });

  function setTheme(t: NavTheme) {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
  }

  return { theme, setTheme };
}
