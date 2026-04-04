import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types";

interface NotificationBellProps {
  token: string;
}

export function NotificationBell({ token }: NotificationBellProps) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count on mount and every 60 seconds
  useEffect(() => {
    const fetchCount = () => {
      api.get("/notifications/unread-count/", token)
        .then((data: unknown) => setUnreadCount((data as { count: number }).count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleDropdown = async () => {
    if (!open) {
      setLoading(true);
      try {
        const data = await api.get("/notifications/", token) as AppNotification[];
        setNotifications(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    setOpen(prev => !prev);
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await api.post("/notifications/mark-read/", { ids: [n.id] }, token);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif)
        );
      } catch { /* ignore */ }
    }
    setOpen(false);
    navigate(`/recipes/${n.recipe_slug}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read/", {}, token);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                      !n.is_read ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
