import { useEffect, useRef, useState } from "react";

export const LOADING_REVEAL_DELAY_MS = 180;
export const LOADING_MIN_VISIBLE_MS = 420;

export function useStableLoading(loading: boolean) {
  const revealedAtRef = useRef<number | null>(null);
  const [held, setHeld] = useState(loading);

  useEffect(() => {
    if (loading) {
      setHeld(true);
      if (revealedAtRef.current != null) return;

      const revealTimeout = window.setTimeout(() => {
        revealedAtRef.current = Date.now();
      }, LOADING_REVEAL_DELAY_MS);

      return () => window.clearTimeout(revealTimeout);
    }

    const revealedAt = revealedAtRef.current;
    if (revealedAt == null) {
      setHeld(false);
      return;
    }

    const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - revealedAt));

    if (remaining === 0) {
      revealedAtRef.current = null;
      setHeld(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      revealedAtRef.current = null;
      setHeld(false);
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [loading]);

  return loading || held;
}
