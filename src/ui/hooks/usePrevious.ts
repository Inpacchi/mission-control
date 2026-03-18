import { useEffect, useRef } from 'react';

/**
 * Returns the value from the previous render.
 * Returns undefined on the first render.
 *
 * Useful for comparing current vs previous props or state to drive
 * conditional animations or derived state transitions.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
