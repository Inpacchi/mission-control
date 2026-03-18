import { useEffect, useState } from 'react';
import type { McConfig, ColumnConfig } from '@shared/types';

interface UseConfigResult {
  config: McConfig | null;
  columns: ColumnConfig[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the project config from GET /api/config once on mount.
 * Returns the full config, a convenience `columns` array, and loading/error state.
 */
export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<McConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: McConfig = await res.json();
        if (!cancelled) {
          setConfig(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useConfig] Failed to fetch config:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    config,
    columns: config?.columns ?? [],
    loading,
    error,
  };
}
