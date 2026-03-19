import { useState, useCallback } from 'react';
import type { Key } from 'ink';

interface UseSearchInputOptions {
  onQueryChange?: (query: string) => void;
}

interface UseSearchInputResult {
  query: string;
  reset: () => void;
  handleKey: (input: string, key: Key) => boolean;
}

export function useSearchInput(options?: UseSearchInputOptions): UseSearchInputResult {
  const [query, setQuery] = useState('');

  const reset = useCallback((): void => {
    setQuery('');
    options?.onQueryChange?.('');
  // options is an object created at call site; onQueryChange identity is what matters.
  // Using a stable ref pattern would be ideal, but callers never change the callback,
  // so this dep is safe in practice. eslint-disable covers the inline options object.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.onQueryChange]);

  const handleKey = useCallback((input: string, key: Key): boolean => {
    if (key.escape) {
      setQuery('');
      options?.onQueryChange?.('');
      return true;
    }
    if (key.backspace || key.delete) {
      setQuery((q) => {
        const next = q.slice(0, -1);
        options?.onQueryChange?.(next);
        return next;
      });
      return true;
    }
    if (input && !key.ctrl && !key.meta) {
      setQuery((q) => {
        const next = q + input;
        options?.onQueryChange?.(next);
        return next;
      });
      return true;
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.onQueryChange]);

  return { query, reset, handleKey };
}
