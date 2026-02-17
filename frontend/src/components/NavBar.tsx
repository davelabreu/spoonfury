import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const AUTH_TABS = [
  { label: "My Books", to: "/books" },
  { label: "+ Recipe", to: "/recipes/new" },
];

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSignOut() {
    logout();
    navigate("/");
    setMobileOpen(false);
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
        {/* Column 1: Logo */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight flex-shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          🥄 Spoonfury
        </Link>

        {isMobile ? (
          /* ── Mobile: hamburger (pushed to far right) ── */
          <button
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : (
          <>
            {/* Column 2: Tabs (centered) */}
            <div
              className="flex-1 flex items-center justify-center gap-1"
              onMouseLeave={() => setHoveredTab(null)}
            >
              {username &&
                AUTH_TABS.map((tab) => {
                  const isActive = location.pathname === tab.to;
                  return (
                    <Link
                      key={tab.to}
                      to={tab.to}
                      className="relative px-3 py-1.5 rounded-md text-sm font-medium outline-none"
                      onMouseEnter={() => setHoveredTab(tab.to)}
                    >
                      {hoveredTab === tab.to && (
                        <motion.span
                          layoutId="hoverBubble"
                          className="absolute inset-0 rounded-md bg-muted"
                          transition={SPRING}
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="activeUnderline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                          transition={SPRING}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  );
                })}
            </div>

            {/* Column 3: Identity / auth actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {username ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    @{username}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-md"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-t bg-background px-4 py-3 flex flex-col gap-1"
          >
            {username ? (
              <>
                <div className="text-sm text-muted-foreground px-2 py-1">
                  @{username}
                </div>
                {AUTH_TABS.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === tab.to
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="text-left px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Join
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
