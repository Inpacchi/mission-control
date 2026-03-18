import { useState, useEffect } from 'react';
import { parseDeliverables } from '../../server/services/sdlcParser.js';
import type { Deliverable } from '../../shared/types.js';

interface UseDeliverablesResult {
  deliverables: Deliverable[];
  loading: boolean;
  error: string | null;
}

export function useDeliverables(
  projectPath: string,
  initialDeliverables: Deliverable[] = []
): UseDeliverablesResult {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const [loading, setLoading] = useState<boolean>(initialDeliverables.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have initial deliverables, no need to re-fetch
    if (initialDeliverables.length > 0) {
      setDeliverables(initialDeliverables);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const result = await parseDeliverables(projectPath);
        if (!cancelled) {
          setDeliverables(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectPath, initialDeliverables]);

  return { deliverables, loading, error };
}
