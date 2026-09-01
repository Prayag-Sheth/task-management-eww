import { useEffect, useState } from 'react';

/**
 * Delays a rapidly-changing value, so typing in a search box issues one request
 * on pause rather than one per keystroke.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
