import { useState } from 'react';
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

  function reset(): void {
    setQuery('');
    options?.onQueryChange?.('');
  }

  function handleKey(input: string, key: Key): boolean {
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
  }

  return { query, reset, handleKey };
}
