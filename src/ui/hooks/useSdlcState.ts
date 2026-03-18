import { useCallback, useEffect, useState } from 'react';
import type { Deliverable, SdlcStats, WsMessage } from '@shared/types';

interface UseSdlcStateReturn {
  deliverables: Deliverable[];
  stats: SdlcStats | null;
  loading: boolean;
  error: string | null;
}

interface UseSdlcStateOptions {
  subscribe: (channels: string[]) => void;
  addListener: (handler: (msg: WsMessage) => void) => () => void;
  connected: boolean;
}

export function useSdlcState({
  subscribe,
  addListener,
  connected,
}: UseSdlcStateOptions): UseSdlcStateReturn {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [stats, setStats] = useState<SdlcStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    try {
      const res = await fetch('/api/sdlc/deliverables');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDeliverables(data.deliverables ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliverables');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sdlc/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch {
      // Stats are non-critical; don't set error
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchDeliverables(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchDeliverables, fetchStats]);

  // Re-fetch on reconnect
  useEffect(() => {
    if (connected) {
      fetchDeliverables();
      fetchStats();
    }
  }, [connected, fetchDeliverables, fetchStats]);

  // Subscribe to watcher channel
  useEffect(() => {
    if (connected) {
      subscribe(['watcher:sdlc']);
    }
  }, [connected, subscribe]);

  // Listen for WebSocket updates
  useEffect(() => {
    const remove = addListener((msg: WsMessage) => {
      if (msg.channel === 'watcher:sdlc' && msg.type === 'update') {
        const data = msg.data as { deliverables?: Deliverable[] };
        if (data.deliverables) {
          setDeliverables(data.deliverables);
        }
        // Also refresh stats on SDLC updates
        fetchStats();
      }
    });
    return remove;
  }, [addListener, fetchStats]);

  return { deliverables, stats, loading, error };
}
