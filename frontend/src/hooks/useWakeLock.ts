import { useState, useRef, useEffect } from "react";

export function useWakeLock() {
  const [active, setActive] = useState(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  const acquire = async () => {
    if (supported) {
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
        lockRef.current.addEventListener("release", () => setActive(false));
      } catch {
        // Denied (e.g. page not visible) — still show Cook Now UI
      }
    }
    setActive(true);
  };

  const release = () => {
    lockRef.current?.release();
    lockRef.current = null;
    setActive(false);
  };

  // Release automatically if component unmounts (user navigates away)
  useEffect(() => () => { lockRef.current?.release(); }, []);

  return { active, acquire, release, supported };
}
