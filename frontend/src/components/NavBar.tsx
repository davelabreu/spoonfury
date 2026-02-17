import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Utensils } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const STICKERS = [
  { label: "Stir the Pot", to: "/", color: "bg-[#FF6B6B]", icon: Utensils, isSpecial: true },
  { label: "My Books", to: "/books", color: "bg-[#4ECDC4]", authRequired: true },
  { label: "+ Recipe", to: "/recipes/new", color: "bg-[#FFE66D]", authRequired: true },
];

const AUTH_STICKERS = [
  { label: "Sign in", to: "/login", color: "bg-[#A29BFE]", guestOnly: true },
  { label: "Join", to: "/register", color: "bg-[#primary]", guestOnly: true, isPrimary: true },
];

interface NavStickerProps {
  label: string;
  to: string;
  color: string;
  icon?: any;
  isSpecial?: boolean;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

function NavSticker({ label, to, color, icon: Icon, isSpecial, isActive, onClick, className }: NavStickerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      animate={{ 
        y: (isActive || isHovered) ? -8 : 0, // Lifted more to show it's a tab being pulled out
        rotate: (isSpecial && isHovered) ? [0, -0.5, 0.5, -0.5, 0] : 0
      }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      {/* Aggressive Steam Particles */}
      {isSpecial && isHovered && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none z-[999] w-24 h-48 flex justify-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 80, scale: 1 }}
              animate={{ 
                opacity: [0, 0.8, 0.6, 0], 
                y: [70, 0, -100], 
                x: (i - 2.5) * 15,
                scale: [1, 2.5, 4]
              }}
              transition={{ 
                duration: 1.4, 
                repeat: Infinity, 
                delay: i * 0.25,
                ease: "easeOut" 
              }}
              className="absolute bottom-0 w-8 h-8 bg-gray-300/60 rounded-full blur-[7px]"
            />
          ))}
        </div>
      )}

      <Link
        to={to}
        onClick={onClick}
        className={`
          relative flex items-center gap-2 px-4 pt-2 pb-5 rounded-t-xl text-sm font-bold border-x-[2.5px] border-t-[2.5px] border-black transition-all duration-200
          ${color} 
          ${isActive || isHovered 
            ? "shadow-[0px_-2px_0px_0px_rgba(0,0,0,1)]" 
            : ""}
          ${isSpecial ? "overflow-visible" : ""}
          ${className || ""}
        `}
        style={{ marginBottom: "-2.5px" }} // Overlap the bottom border of the nav
      >
        {/* Special Simmering Background for Stir the Pot */}
        {isSpecial && (
          <motion.div 
            className="absolute inset-0 rounded-t-[9px]"
            animate={{ 
              backgroundColor: ["#FF6B6B", "#FF8E53", "#FFAB4C", "#FF8E53", "#FF6B6B"] 
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <span className="relative z-10 flex items-center gap-2">
          {Icon && (
            <motion.span
              animate={isActive ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Icon size={16} strokeWidth={2.5} />
            </motion.span>
          )}
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 850px)");
  const [mobileOpen, setMobileOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  function handleSignOut() {
    logout();
    navigate("/");
    setMobileOpen(false);
  }

  const visibleStickers = STICKERS.filter(s => !s.authRequired || username);

  return (
    <nav ref={navRef} className="border-b-[2.5px] border-black bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-end h-14">
        {/* Column 1: Logo */}
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter flex-shrink-0 hover:rotate-2 transition-transform mr-8 mb-3"
          onClick={() => setMobileOpen(false)}
        >
          🥄 Spoonfury
        </Link>

        {isMobile ? (
          <button
            type="button"
            className="ml-auto p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white active:translate-y-[2px] active:shadow-none transition-all mb-2"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        ) : (
          <>
            {/* Column 2: Stickers (grounded on bottom border) */}
            <div className="flex-1 flex items-end justify-center gap-4 h-full">
              {visibleStickers.map((sticker) => (
                <NavSticker
                  key={sticker.to}
                  {...sticker}
                  isActive={location.pathname === sticker.to}
                />
              ))}
            </div>

            {/* Column 3: Identity / auth actions */}
            <div className="flex-shrink-0 flex items-center gap-4 mb-2">
              {username ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black bg-muted px-3 py-1.5 rounded-lg border-2 border-black">
                    @{username}
                  </span>
                  <motion.button
                    type="button"
                    whileHover={{ y: 2, shadow: "1px 1px 0px 0px rgba(0,0,0,1)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSignOut}
                    className="text-sm font-bold px-3 py-2 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    Sign out
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
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
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t bg-background px-4 py-6 overflow-hidden"
          >
            <div className="flex flex-col gap-4">
              {visibleStickers.map((sticker) => (
                <NavSticker
                  key={sticker.to}
                  {...sticker}
                  isActive={location.pathname === sticker.to}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
              
              <div className="h-px bg-black my-2" />

              {username ? (
                <>
                  <div className="text-sm font-black bg-muted px-4 py-2 rounded-xl border-2 border-black self-start">
                    @{username}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-left px-4 py-3 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <NavSticker
                    label="Sign in"
                    to="/login"
                    color="bg-[#A29BFE]"
                    isActive={location.pathname === "/login"}
                    onClick={() => setMobileOpen(false)}
                  />
                  <NavSticker
                    label="Join"
                    to="/register"
                    color="bg-primary"
                    isActive={location.pathname === "/register"}
                    onClick={() => setMobileOpen(false)}
                    className="text-primary-foreground"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
