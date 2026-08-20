import { useEffect, useState } from "react";

export const useDebouncedValue = (value: string, delayMs = 180) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
};
