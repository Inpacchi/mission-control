import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SessionLogEntry {
  id: string;
  command: string;
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  logPath?: string;
  logSize?: number;
}

interface UseSessionHistoryReturn {
  sessions: SessionLogEntry[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  fetchLog: (sessionId: string) => Promise<string>;
  refresh: () => void;
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<SessionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions/history');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const fetchLog = useCallback(async (sessionId: string): Promise<string> => {
    const res = await fetch(`/api/sessions/history/${sessionId}/log`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }, []);

  // Filter sessions by search query and date.
  // Memoized: new Date() allocates per session per render — avoid on every
  // keystroke. Recomputes only when the source list or filter values change.
  const filtered = useMemo(() => sessions.filter((session) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCommand = session.command?.toLowerCase().includes(q);
      const matchId = session.id.toLowerCase().includes(q);
      if (!matchCommand && !matchId) return false;
    }

    // Date filter
    if (dateFilter) {
      const sessionDate = new Date(session.startedAt).toISOString().slice(0, 10);
      if (sessionDate !== dateFilter) return false;
    }

    return true;
  }), [sessions, searchQuery, dateFilter]);

  return {
    sessions: filtered,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    fetchLog,
    refresh: fetchSessions,
  };
}
