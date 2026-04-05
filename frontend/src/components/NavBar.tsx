import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Menu, X, Utensils, ShoppingCart, BookOpen, LogOut, Palette, UserCircle } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useShopping, SHOPPING_LIST_UPDATED } from "@/contexts/ShoppingContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavTheme } from "@/hooks/useNavTheme";
import { buildInstacartUrl } from "@/lib/instacart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ingredient } from "@/types";

const STICKERS = [
  { label: "Stir the Pot", to: "/", color: "bg-[#FF6B6B]", icon: Utensils, isSpecial: true },
  { label: "My Books", to: "/books", color: "bg-[#4ECDC4]", authRequired: true },
  { label: "+ Recipe", to: "/recipes/new", color: "bg-[#FFE66D]", authRequired: true },
  { label: "My Kitchen", to: "/kitchen", color: "bg-[#FFB347]", authRequired: true },
];

interface NavStickerProps {
  label: string;
  to?: string;
  color: string;
  icon?: any;
  isSpecial?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "tab" | "button";
}

function NavSticker({ label, to, color, icon: Icon, isSpecial, isActive, onClick, className, variant = "tab" }: NavStickerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isTab = variant === "tab";

  // The lift amount
  const lift = isHovered ? (isTab ? -6 : -4) : (isActive ? (isTab ? -3 : -2) : 0);
  
  // Dynamic clip-path logic (ONLY for tabs)
  const clipBottom = 12 + lift;
  const clipPath = isTab ? `inset(-500px -500px ${clipBottom}px -500px)` : "none";

  const content = (
    <span className="relative z-10 flex items-center gap-2 h-5">
      {Icon && (
        <motion.span
          animate={isActive ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center justify-center w-5"
        >
          <Icon size={18} strokeWidth={2.5} />
        </motion.span>
      )}
      <span className="leading-none flex items-center h-full pt-0.5">{label}</span>
    </span>
  );

  const sharedClasses = `
    relative flex items-center justify-center gap-2 px-5 transition-all duration-200 font-bold border-black
    ${color} 
    ${isTab ? "pt-2.5 pb-4 rounded-t-xl border-x-[2.5px] border-t-[2.5px] text-sm" : "py-3 rounded-xl border-[2.5px] text-base"}
    ${isActive || isHovered 
      ? (isTab ? "shadow-[0px_-2px_0px_0px_rgba(0,0,0,1)]" : "shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]") 
      : (isTab ? "" : "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]")}
    ${isSpecial ? "overflow-visible" : ""}
    ${className || ""}
  `;

  return (
    <motion.div
      animate={{ 
        y: lift,
        rotate: (isSpecial && isHovered) ? [0, -0.8, 0.8, -0.8, 0] : 0
      }}
      whileTap={{ scale: 0.96 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative z-10"
    >
      {/* Aggressive Steam Particles */}
      {isSpecial && isHovered && (
        <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-[100] w-32 h-56 flex justify-center ${isTab ? "-top-32" : "-top-24"}`}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 100, scale: 1 }}
              animate={{ 
                opacity: [0, 1, 0.8, 0], 
                y: [80, -40, -150], 
                x: (i - 4) * 18,
                scale: [1, 3, 5]
              }}
              transition={{ 
                duration: 1.0, 
                repeat: Infinity, 
                delay: i * 0.12,
                ease: "easeOut" 
              }}
              className="absolute bottom-0 w-10 h-10 bg-gray-300/60 rounded-full blur-[10px]"
            />
          ))}
        </div>
      )}

      {to ? (
        <Link 
          to={to} 
          onClick={onClick} 
          style={{ clipPath, marginBottom: isTab ? "-12px" : "0px" }} 
          className={sharedClasses}
        >
          {isSpecial && (
            <motion.div 
              className={`absolute inset-0 ${isTab ? "rounded-t-[9px]" : "rounded-[9px]"}`}
              animate={{ backgroundColor: ["#FF6B6B", "#FF8E53", "#FFAB4C", "#FF8E53", "#FF6B6B"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {content}
        </Link>
      ) : (
        <button 
          type="button" 
          onClick={onClick} 
          style={{ clipPath, marginBottom: isTab ? "-12px" : "0px" }} 
          className={sharedClasses}
        >
          {content}
        </button>
      )}
    </motion.div>
  );
}

function UsernameBadge({ username, className, onSignOut, onSwitchTheme, switchThemeLabel, variant = "sticker", isStaff = false }: { username: string; className?: string; onSignOut?: () => void; onSwitchTheme?: () => void; switchThemeLabel?: string; variant?: "sticker" | "capsule"; isStaff?: boolean }) {
  const navigate = useNavigate();

  const badge = variant === "capsule" ? (
    <div className={`relative badge-wrap ${className || ""}`}>
      <div className="badge-glow" />
      <div
        className={`
          badge-capsule relative
          inline-flex items-center gap-2 px-3.5 py-1.5
          border border-slate-200 bg-white/50 backdrop-blur-sm
          rounded-full shadow-sm
          hover:shadow-md
          transition-all cursor-pointer
        `}
      >
        <span className="text-sm leading-none">👨‍🍳</span>
        <div className="w-px h-4 bg-slate-300" />
        <span className="text-sm font-medium text-slate-700 leading-none">@{username}</span>
        {onSignOut && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-400">
            <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  ) : (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-black
        bg-[#E9D8FD] text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
        ${onSignOut ? "cursor-pointer hover:bg-[#D6BCFA] transition-colors" : ""}
        ${className || ""}
      `}
    >
      <span className="text-sm leading-none">👨‍🍳</span>
      <span className="leading-none">@{username}</span>
    </div>
  );

  if (!onSignOut) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {badge}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => navigate(`/@${username}`)} className="gap-2 cursor-pointer font-semibold">
          <UserCircle className="w-4 h-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/books")} className="gap-2 cursor-pointer">
          <BookOpen className="w-4 h-4" />
          My Books
        </DropdownMenuItem>
        {isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/moderation")} className="gap-2 cursor-pointer text-purple-700 focus:text-purple-700">
              <span className="w-4 h-4 flex items-center justify-center text-xs">⚖️</span>
              Moderation Queue
            </DropdownMenuItem>
          </>
        )}
        {onSwitchTheme && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSwitchTheme} className="gap-2 cursor-pointer">
              <Palette className="w-4 h-4" />
              {switchThemeLabel || "Switch theme"}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="gap-2 cursor-pointer text-red-500 focus:text-red-500">
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CartButton({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <Link
      to="/shopping-list"
      onClick={onClick}
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
      aria-label={`Shopping list${count > 0 ? ` (${count} items)` : ""}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-black leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

const MAX_FLY_EMOJIS = 5;
const STAGGER_MS = 120;
const ARC_DURATION_MS = 700;
const LAND_LINGER_MS = 600;

/** Animate a DOM element along a quadratic bezier arc, then call onDone. */
function animateArc(
  el: HTMLElement,
  sx: number, sy: number,
  ex: number, ey: number,
  duration: number,
  onDone: () => void,
) {
  const mx = sx + (ex - sx) * 0.4;
  const my = Math.min(sy, ey) - 80;
  const startTime = performance.now();

  function step(now: number) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x = (1 - ease) ** 2 * sx + 2 * (1 - ease) * ease * mx + ease ** 2 * ex;
    const y = (1 - ease) ** 2 * sy + 2 * (1 - ease) * ease * my + ease ** 2 * ey;
    // Shrink less aggressively: 1.5 → 0.9 (stays readable)
    const scale = 1.5 - 0.6 * ease;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = "1";

    if (t < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

/** "Drop into cart" — emoji settles into the cart icon, then shrinks away */
function animateLand(el: HTMLElement, stackIndex: number) {
  // Each emoji drops slightly lower into the cart, like items piling in
  const yDrop = 4 + stackIndex * 3;
  const xJitter = (stackIndex % 2 === 0 ? -1 : 1) * (2 + stackIndex);
  el.style.transition = `all ${LAND_LINGER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
  el.style.transform = `scale(0.85) translate(${xJitter}px, ${yDrop}px)`;
  el.style.opacity = "1";

  // Shrink into the cart after lingering
  setTimeout(() => {
    el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    el.style.opacity = "0";
    el.style.transform = `scale(0.2) translate(${xJitter}px, ${yDrop + 6}px)`;
    setTimeout(() => el.remove(), 250);
  }, LAND_LINGER_MS);
}

export function CartCapsule({ count, items, compact = false, onManualTrigger }: { count: number; items: Ingredient[]; compact?: boolean; onManualTrigger?: React.MutableRefObject<(() => void) | null> }) {
  const [hovered, setHovered] = useState<"pickup" | "delivery" | "cart" | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);
  // Visual count: enumerates during animation, then settles to real count
  const [visualCount, setVisualCount] = useState(count);
  const animatingRef = useRef(false);
  const prevCount = useRef(count);
  const capsuleControls = useAnimationControls();
  const cartIconControls = useAnimationControls();
  const cartIconRef = useRef<HTMLDivElement>(null);

  /** Shake capsule + wobble cart icon */
  const shakeAndWobble = useCallback(() => {
    capsuleControls.start({ x: [0, -5, 5, -3, 3, -1, 1, 0], transition: { duration: 0.4, ease: "easeInOut" } });
    cartIconControls.start({ rotate: [-7, 7, -5, 5, -2, 2, 0], transition: { duration: 0.5, ease: "easeInOut" } });
  }, [capsuleControls, cartIconControls]);

  /** Launch arc-and-absorb animation with real ingredient emojis */
  const fireArcBurst = useCallback((emojis: string[], sourceRect: DOMRect | null, totalAdding: number) => {
    const cartEl = cartIconRef.current;
    if (!cartEl) return;

    animatingRef.current = true;
    const baseCount = prevCount.current;

    const cartRect = cartEl.getBoundingClientRect();
    // Target the basket opening of the cart icon
    const endX = cartRect.left + cartRect.width * 0.001;
    const endY = cartRect.top - cartRect.height * 0.75;

    const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : endX;
    const startY = sourceRect ? sourceRect.top : endY + 200;

    const flyList = emojis.slice(0, MAX_FLY_EMOJIS);
    // How much to increment per emoji (distributes totalAdding across flyList)
    const countPerEmoji = Math.max(1, Math.round(totalAdding / flyList.length));

    flyList.forEach((emoji, i) => {
      setTimeout(() => {
        const el = document.createElement("span");
        el.textContent = emoji;
        el.style.cssText = "position:fixed;z-index:9999;font-size:22px;pointer-events:none;will-change:transform,opacity;";

        const spread = (i - (flyList.length - 1) / 2) * 16;
        const sx = startX + spread;
        el.style.left = `${sx}px`;
        el.style.top = `${startY}px`;
        el.style.transform = "scale(1.3)";
        document.body.appendChild(el);

        requestAnimationFrame(() => {
          el.style.transition = "all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)";
          el.style.transform = "scale(1.6)";
          el.style.top = `${startY - 15}px`;

          setTimeout(() => {
            const dur = ARC_DURATION_MS + i * 60;
            animateArc(el, sx, startY - 15, endX, endY, dur, () => {
              // Land & stack instead of removing immediately
              animateLand(el, i);

              // Enumerate badge: tick up incrementally
              const newVisual = Math.min(baseCount + (i + 1) * countPerEmoji, baseCount + totalAdding);
              setVisualCount(newVisual);
              setBadgeKey(k => k + 1);

              // Shake + wobble on last arrival
              if (i === flyList.length - 1) {
                shakeAndWobble();
                // Settle to final count after the stack lingers
                setTimeout(() => {
                  setVisualCount(baseCount + totalAdding);
                  animatingRef.current = false;
                }, LAND_LINGER_MS);
              }
            });
          }, 100);
        });
      }, i * STAGGER_MS);
    });
  }, [shakeAndWobble]);

  /** Empty cart: cart icon floats up and is replaced */
  const fireEmptyAnimation = useCallback(() => {
    const cartEl = cartIconRef.current;
    if (!cartEl) return;

    const rect = cartEl.getBoundingClientRect();
    const ghost = document.createElement("span");
    ghost.textContent = "🛒";
    ghost.style.cssText = `position:fixed;z-index:9999;font-size:20px;pointer-events:none;
      left:${rect.left + rect.width / 2 - 10}px;top:${rect.top}px;
      opacity:1;transition:all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);`;
    document.body.appendChild(ghost);

    requestAnimationFrame(() => {
      ghost.style.transform = "translateY(-40px) scale(0.4)";
      ghost.style.opacity = "0";
      setTimeout(() => ghost.remove(), 600);
    });

    capsuleControls.start({ scale: [1, 0.92, 1.05, 1], transition: { duration: 0.4 } });
    setVisualCount(0);
    setBadgeKey(k => k + 1);
  }, [capsuleControls]);

  useEffect(() => {
    if (onManualTrigger) onManualTrigger.current = () => fireArcBurst(["🛒"], null, 1);
  });

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.emojis) {
        // Add-to-cart: arc animation with real emojis
        const emojis: string[] = detail.emojis;
        const sourceRect: DOMRect | null = detail.sourceRect ?? null;
        fireArcBurst(emojis, sourceRect, emojis.length);
      } else if (detail?.cleared) {
        // Clear cart: empty animation
        fireEmptyAnimation();
      } else {
        // Generic update (no detail) — could be a clear or other action
        // If count dropped to 0, treat as clear
        // (handled by the count effect below)
      }
    };
    window.addEventListener(SHOPPING_LIST_UPDATED, onUpdate);
    return () => window.removeEventListener(SHOPPING_LIST_UPDATED, onUpdate);
  }, [fireArcBurst, fireEmptyAnimation]);

  // Sync visual count with real count when not animating
  useEffect(() => {
    if (!animatingRef.current) {
      // Detect clear: count went to 0 from nonzero
      if (count === 0 && prevCount.current > 0) {
        fireEmptyAnimation();
      }
      setVisualCount(count);
    }
    prevCount.current = count;
  }, [count, fireEmptyAnimation]);

  const segmentBase = { padding: "0 13px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const, lineHeight: "32px", textDecoration: "none", transition: "background 0.15s ease, color 0.15s ease" };

  return (
    <motion.div
      animate={capsuleControls}
      style={{
        position: "relative",
        backgroundImage: "linear-gradient(270deg, #86efac, #93c5fd, #c4b5fd, #fda4af, #86efac)",
        backgroundSize: "300% 300%",
        animation: "shimmer 8s ease infinite",
        boxShadow: hovered ? "0 4px 14px rgba(147,197,253,0.5)" : "0 2px 8px rgba(147,197,253,0.3)",
        padding: 2,
        borderRadius: 9999,
        transition: "box-shadow 0.15s ease",
      }}
    >
      <div style={{ borderRadius: 9999, overflow: "hidden", background: "#fff", display: "flex", alignItems: "center" }}>
        {!compact && (
          <>
            <a
              href={buildInstacartUrl(items, "pickup")}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered("pickup")}
              onMouseLeave={() => setHovered(null)}
              style={{ ...segmentBase, background: hovered === "pickup" ? "#fde8ea" : "#fff", color: hovered === "pickup" ? "#9f1239" : "#374151" }}
            >
              🚗 Pickup
            </a>
            <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb", flexShrink: 0 }} />
            <a
              href={buildInstacartUrl(items, "delivery")}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered("delivery")}
              onMouseLeave={() => setHovered(null)}
              style={{ ...segmentBase, background: hovered === "delivery" ? "#ede9fe" : "#fff", color: hovered === "delivery" ? "#5b21b6" : "#374151" }}
            >
              🏠 Delivery
            </a>
          </>
        )}
        <Link
          to="/shopping-list"
          onMouseEnter={() => setHovered("cart")}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: compact ? "0 15px" : "0 13px",
            background: hovered === "cart" ? "#f0fdf4" : "#fff",
            color: "#15803d",
            borderLeft: compact ? "none" : "1px solid rgba(0,0,0,0.06)",
            alignSelf: "stretch",
            lineHeight: compact ? "34px" : "32px",
            transition: "background 0.15s ease",
          }}
        >
          {compact && <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginRight: 6, whiteSpace: "nowrap" }}>Order now!</span>}
          <motion.div ref={cartIconRef} animate={cartIconControls}>
            <ShoppingCart className="w-[22px] h-[22px]" />
          </motion.div>
        </Link>
      </div>

      {visualCount > 0 && (
        <motion.span
          key={badgeKey}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ type: "spring", stiffness: 420, damping: 11 }}
          style={{ position: "absolute", top: 0, right: 0 }}
          className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-green-500 text-white text-[9px] font-black border-[1.5px] border-white px-0.5"
        >
          {visualCount > 99 ? "99+" : visualCount}
        </motion.span>
      )}
    </motion.div>
  );
}

type StickerDef = typeof STICKERS[number];

function MinimalNav({
  visibleStickers,
  username,
  token,
  cartCount,
  cartItems,
  onSignOut,
  onSwitchTheme,
  isStaff = false,
}: {
  visibleStickers: StickerDef[];
  username: string | null | undefined;
  token: string | null;
  cartCount: number;
  cartItems: Ingredient[];
  onSignOut: () => void;
  onSwitchTheme: () => void;
  isStaff?: boolean;
}) {
  const location = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 850px)");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflowY = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflowY = ""; };
  }, [mobileOpen]);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link to="/" className="text-xl font-black tracking-tighter mr-6 flex items-center gap-1 shrink-0">
          <span>🥄</span>
          <span>Spoonfury</span>
        </Link>

        {isMobile ? (
          <div className="ml-auto flex items-center gap-2">
            {username && cartCount > 0 && (
              <CartCapsule count={cartCount} items={cartItems} compact />
            )}
            {username && token && <NotificationBell token={token} />}
            {username ? (
              /* Logged-in: combined badge + hamburger capsule */
              <div className="relative badge-wrap">
                <div className="badge-glow" />
                <button
                  type="button"
                  onClick={() => setMobileOpen((o) => !o)}
                  className={`
                    badge-capsule relative
                    inline-flex items-center gap-2 px-3.5 py-1.5
                    border bg-white/50 backdrop-blur-sm
                    rounded-full shadow-sm
                    transition-all cursor-pointer
                    ${mobileOpen ? "border-violet-300 bg-white/85" : "border-slate-200"}
                  `}
                >
                  <span className="text-sm leading-none">👨‍🍳</span>
                  <div className="w-px h-4 bg-slate-300" />
                  <span className="text-sm font-medium text-slate-700 leading-none">@{username}</span>
                  <div className="w-px h-4 bg-slate-300" />
                  {mobileOpen
                    ? <X size={16} strokeWidth={2} className="text-slate-500" />
                    : <Menu size={16} strokeWidth={2} className="text-slate-500" />
                  }
                </button>
              </div>
            ) : (
              /* Logged-out: glass pill hamburger */
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5
                  border bg-white/50 backdrop-blur-sm
                  rounded-full shadow-sm
                  hover:bg-white/80 hover:shadow-md
                  transition-all cursor-pointer
                  ${mobileOpen ? "border-slate-300 bg-white/80" : "border-slate-200"}
                `}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen
                  ? <X size={18} strokeWidth={2} className="text-slate-600" />
                  : <Menu size={18} strokeWidth={2} className="text-slate-600" />
                }
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5 flex-1">
              {visibleStickers.map((sticker) => {
                const isActive = location.pathname === sticker.to;
                return (
                  <Link
                    key={sticker.to}
                    to={sticker.to!}
                    className="relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    onMouseEnter={() => setHovered(sticker.to!)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {hovered === sticker.to && (
                      <motion.div
                        layoutId="hoverBubble"
                        className="absolute inset-0 bg-muted rounded-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                      />
                    )}
                    <span className="relative z-10">{sticker.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeUnderline"
                        className="absolute bottom-0.5 left-2 right-2 h-0.5 bg-foreground rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {username && token && <NotificationBell token={token} />}
              {username && <CartCapsule count={cartCount} items={cartItems} />}
              {username ? (
                <UsernameBadge username={username} onSignOut={onSignOut} onSwitchTheme={onSwitchTheme} switchThemeLabel="Fridge Sticker theme" variant="capsule" isStaff={isStaff} />
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Sign in
                  </Link>
                  <Link to="/register" className="text-sm font-medium px-3 py-1.5 bg-foreground text-background rounded-md hover:opacity-90 transition-opacity">
                    Join
                  </Link>
                  <button
                    type="button"
                    onClick={onSwitchTheme}
                    title="Switch to Fridge Sticker theme"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-base"
                    aria-label="Switch to Fridge Sticker theme"
                  >
                    🏷️
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background px-4 py-6 overflow-hidden"
          >
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {visibleStickers.map((sticker) => (
                <Link
                  key={sticker.to}
                  to={sticker.to!}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 text-base font-semibold rounded-lg transition-colors ${
                    location.pathname === sticker.to ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  {sticker.label}
                </Link>
              ))}
              {username && (
                <Link
                  to="/shopping-list"
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 text-base font-semibold rounded-lg transition-colors ${
                    location.pathname === "/shopping-list" ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  Shopping List
                </Link>
              )}
              <div className="h-px bg-border my-2" />
              {username ? (
                <>
                  <div className="px-4 py-2"><UsernameBadge username={username} variant="capsule" /></div>
                  <button
                    type="button"
                    onClick={() => { onSwitchTheme(); setMobileOpen(false); }}
                    className="px-4 py-3 text-base font-semibold rounded-lg text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <Palette className="w-4 h-4" />
                    Fridge Sticker theme
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSignOut(); setMobileOpen(false); }}
                    className="px-4 py-3 text-base font-semibold rounded-lg text-left text-red-500 hover:bg-muted/50 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-base font-semibold rounded-lg hover:bg-muted/50 transition-colors">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-base font-semibold rounded-lg bg-foreground text-background text-center hover:opacity-90 transition-opacity">
                    Join
                  </Link>
                  <div className="h-px bg-border my-2" />
                  <button
                    type="button"
                    onClick={() => { onSwitchTheme(); setMobileOpen(false); }}
                    className="px-4 py-3 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    🏷️ Switch to Fridge Sticker theme
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function NavBar() {
  const { username, token, isStaff, logout } = useAuth();
  const { count: cartCount, items: cartItems } = useShopping();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 850px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const { theme, setTheme } = useNavTheme();

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [mobileOpen]);

  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    document.body.style.overflowY = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflowY = ""; };
  }, [mobileOpen]);

  function handleSignOut() {
    logout();
    navigate("/");
    setMobileOpen(false);
  }

  const visibleStickers = STICKERS.filter(s => !s.authRequired || username);

  if (theme === "minimal") {
    return (
      <MinimalNav
        visibleStickers={visibleStickers}
        username={username}
        token={token}
        cartCount={cartCount}
        cartItems={cartItems}
        onSignOut={handleSignOut}
        onSwitchTheme={() => setTheme("sticker")}
        isStaff={isStaff}
      />
    );
  }

  return (
    <nav ref={navRef} className="bg-background sticky top-0 z-50">
      <svg className="absolute h-0 w-0 pointer-events-none">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="max-w-6xl mx-auto px-4 flex items-end h-14 relative">
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter flex-shrink-0 mr-8 mb-2.5 z-30 group flex items-center"
          onClick={() => setMobileOpen(false)}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <div className="relative flex items-center justify-center w-10 h-10">
            <AnimatePresence>
              {logoHovered && (
                <div 
                  className="absolute inset-0 pointer-events-none flex justify-center items-end"
                  style={{ filter: "url(#goo)" }}
                >
                  {[...Array(24)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.2 }}
                      animate={{ 
                        opacity: [0, 1, 1, 0], 
                        y: [20, -10, -85], 
                        x: [(i - 11.5) * 0.8, (i - 11.5) * 1.5, (i - 11.5) * 3],
                        scaleY: [0.4, 5, 0.1],
                        scaleX: [1.8, 0.5, 0.1],
                      }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }} 
                      transition={{ 
                        duration: 0.4 + Math.random() * 0.6, 
                        repeat: Infinity, 
                        delay: i * 0.02,
                        ease: "easeOut" 
                      }}
                      className="absolute w-6 h-12 rounded-full" 
                      style={{ 
                        backgroundColor: i % 3 === 0 ? "#FFD700" : (i % 3 === 1 ? "#FF8E53" : "#FF4D00"),
                        bottom: "-25%", 
                        mixBlendMode: "screen"
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
            
            <motion.span 
              animate={logoHovered ? { 
                scale: [1, 1.1, 1.05, 1.15, 1],
                x: [0, -0.8, 0.8, -0.8, 0], 
                y: [0, 0.8, -0.8, 0.8, 0],
                filter: [
                  "drop-shadow(0 0 8px #FF4D00)",
                  "drop-shadow(0 0 20px #FF4D00)",
                  "drop-shadow(0 0 12px #FFD700)",
                  "drop-shadow(0 0 25px #FF4D00)",
                  "drop-shadow(0 0 8px #FF4D00)"
                ]
              } : {
                filter: [
                  "drop-shadow(0 0 4px #FF4D00)",
                  "drop-shadow(0 0 15px #FF9100)",
                  "drop-shadow(0 0 4px #FF4D00)"
                ]
              }}
              transition={logoHovered 
                ? { duration: 0.25, repeat: Infinity } 
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative z-10 text-2xl"
            >
              🥄
            </motion.span>
          </div>
          <span className="ml-1">Spoonfury</span>
        </Link>

        {isMobile ? (
          <div className="ml-auto flex items-center gap-2 mb-2.5 z-30">
            {username && token && <NotificationBell token={token} />}
            {username && <CartButton count={cartCount} onClick={() => setMobileOpen(false)} />}
            {username && <UsernameBadge username={username} />}
            <button
              type="button"
              className="p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-y-[2px] active:shadow-none transition-all"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-end justify-center gap-4 h-full relative z-10">
              {visibleStickers.map((sticker) => (
                <NavSticker
                  key={sticker.to}
                  {...sticker}
                  isActive={location.pathname === sticker.to}
                />
              ))}
            </div>

            <div className="flex-shrink-0 flex items-end gap-2 h-full z-30">
              {username && token && (
                <div className="mb-3.5">
                  <NotificationBell token={token} />
                </div>
              )}
              {username && cartCount > 0 && (
                <div className="mb-3.5">
                  <CartCapsule count={cartCount} items={cartItems} />
                </div>
              )}
              {username ? (
                <div className="flex items-end gap-3 h-full">
                  <div className="mb-3.5">
                    <UsernameBadge username={username} onSignOut={handleSignOut} onSwitchTheme={() => setTheme("minimal")} switchThemeLabel="Minimal theme" isStaff={isStaff} />
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-3 h-full">
                  <NavSticker
                    label="Sign in"
                    to="/login"
                    color="bg-[#A29BFE]"
                    isActive={location.pathname === "/login"}
                  />
                  <NavSticker
                    label="Join"
                    to="/register"
                    color="bg-primary"
                    isActive={location.pathname === "/register"}
                    className="text-primary-foreground"
                  />
                  <div className="mb-3.5">
                    <button
                      type="button"
                      onClick={() => setTheme("minimal")}
                      title="Switch to Minimal theme"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-base"
                      aria-label="Switch to Minimal theme"
                    >
                      ☰
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black z-[25]" />
      </div>

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t-[2.5px] border-black bg-background px-4 py-8 overflow-hidden"
          >
            <div className="flex flex-col gap-6 max-w-sm mx-auto">
              {visibleStickers.map((sticker) => (
                <NavSticker
                  key={sticker.to}
                  {...sticker}
                  variant="button"
                  isActive={location.pathname === sticker.to}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
              {username && (
                <NavSticker
                  label="Shopping List"
                  to="/shopping-list"
                  color="bg-[#95D5B2]"
                  icon={ShoppingCart}
                  variant="button"
                  isActive={location.pathname === "/shopping-list"}
                  onClick={() => setMobileOpen(false)}
                />
              )}

              <div className="h-[2.5px] bg-black/10 my-2" />

              {username ? (
                <div className="flex flex-col gap-6">
                  <button
                    type="button"
                    onClick={() => { setTheme("minimal"); setMobileOpen(false); }}
                    className="text-left px-1 text-sm font-medium text-muted-foreground flex items-center gap-2"
                  >
                    <Palette className="w-4 h-4" />
                    Minimal theme
                  </button>
                  <NavSticker
                    label="Sign out"
                    color="bg-white"
                    variant="button"
                    onClick={handleSignOut}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <NavSticker
                    label="Sign in"
                    to="/login"
                    color="bg-[#A29BFE]"
                    variant="button"
                    isActive={location.pathname === "/login"}
                    onClick={() => setMobileOpen(false)}
                  />
                  <NavSticker
                    label="Join"
                    to="/register"
                    color="bg-primary"
                    variant="button"
                    isActive={location.pathname === "/register"}
                    onClick={() => setMobileOpen(false)}
                    className="text-primary-foreground"
                  />
                  <div className="h-[2.5px] bg-black/10 my-2" />
                  <button
                    type="button"
                    onClick={() => { setTheme("minimal"); setMobileOpen(false); }}
                    className="text-left px-1 text-sm font-medium text-muted-foreground"
                  >
                    ☰ Switch to Minimal theme
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
