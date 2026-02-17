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

function UsernameBadge({ username, className }: { username: string; className?: string }) {
  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-black 
        bg-[#E9D8FD] text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] 
        ${className || ""}
      `}
    >
      <span className="text-sm leading-none">👨‍🍳</span>
      <span className="leading-none">@{username}</span>
    </div>
  );
}

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 850px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

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
    <nav ref={navRef} className="bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-end h-14 relative">
        {/* Column 1: Logo */}
        <Link
          to="/"
          className="text-2xl font-black tracking-tighter flex-shrink-0 mr-8 mb-2.5 z-30 group flex items-center"
          onClick={() => setMobileOpen(false)}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <div className="relative flex items-center">
            {/* Fire Particles - More flame-like teardrop shapes */}
            <AnimatePresence>
              {logoHovered && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none w-12 h-12 flex justify-center">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20, scale: 0.3 }}
                      animate={{ 
                        opacity: [0, 1, 0.8, 0], 
                        y: [15, -15, -45], 
                        x: [(i - 2) * 3, (i - 2) * 6 + (Math.sin(i) * 10), (i - 2) * 10],
                        scale: [0.5, 1.8, 0.1],
                        rotate: [0, (i % 2 === 0 ? 20 : -20), 0]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        delay: i * 0.12,
                        ease: "easeOut" 
                      }}
                      className="absolute bottom-0 w-2.5 h-6 rounded-t-full rounded-b-[40%] blur-[1px]"
                      style={{ 
                        backgroundColor: i % 3 === 0 ? "#FFF000" : (i % 3 === 1 ? "#FF8E53" : "#FF4D00"),
                        boxShadow: i % 2 === 0 ? "0 0 12px #FF4D00" : "0 0 8px #FFD700"
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
            
            <motion.span 
              animate={logoHovered ? { 
                scale: [1, 1.15, 1.08, 1.2, 1],
                filter: [
                  "drop-shadow(0 0 0px transparent)",
                  "drop-shadow(0 0 12px #FF4D00)",
                  "drop-shadow(0 0 6px #FFF000)",
                  "drop-shadow(0 0 15px #FF4D00)",
                  "drop-shadow(0 0 0px transparent)"
                ]
              } : {}}
              transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
              className="relative z-10"
            >
              🥄
            </motion.span>
          </div>
          <span className="ml-1">Spoonfury</span>
        </Link>

        {isMobile ? (
          <div className="ml-auto flex items-center gap-3 mb-2.5 z-30">
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
            {/* Column 2: Stickers (grounded in the z-slot) */}
            <div className="flex-1 flex items-end justify-center gap-4 h-full relative z-10">
              {visibleStickers.map((sticker) => (
                <NavSticker
                  key={sticker.to}
                  {...sticker}
                  isActive={location.pathname === sticker.to}
                />
              ))}
            </div>

            {/* Column 3: Identity / auth actions */}
            <div className="flex-shrink-0 flex items-end gap-4 h-full z-30">
              {username ? (
                <div className="flex items-end gap-3 h-full">
                  <div className="mb-3.5">
                    <UsernameBadge username={username} />
                  </div>
                  <NavSticker
                    label="Sign out"
                    color="bg-white"
                    onClick={handleSignOut}
                  />
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
                </div>
              )}
            </div>
          </>
        )}

        {/* The Slot Edge: A black line that sits ABOVE the stickers but BELOW the logo/auth */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black z-[25]" />
      </div>

      {/* ── Mobile drawer ── */}
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
              
              <div className="h-[2.5px] bg-black/10 my-2" />

              {username ? (
                <div className="flex flex-col gap-6">
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
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
