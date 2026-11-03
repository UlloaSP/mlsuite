import { useEffect, useRef, useState } from "react";

export const LOADING_REVEAL_DELAY_MS = 180;
export const LOADING_MIN_VISIBLE_MS = 420;

export function useStableLoading(loading: boolean) {
  const revealedAtRef = useRef<number | null>(null);
  // True from the moment a loading state is revealed until it has been visible long enough.
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (loading) {
      if (revealedAtRef.current != null) return;

      const revealTimeout = window.setTimeout(() => {
        revealedAtRef.current = Date.now();
        setHeld(true);
      }, LOADING_REVEAL_DELAY_MS);

      return () => window.clearTimeout(revealTimeout);
    }

    const revealedAt = revealedAtRef.current;
    if (revealedAt == null) return;

    const timeout = window.setTimeout(
      () => {
        revealedAtRef.current = null;
        setHeld(false);
      },
      Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - revealedAt)),
    );
    return () => window.clearTimeout(timeout);
  }, [loading]);

  return loading || held;
}
