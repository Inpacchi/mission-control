import { create } from 'zustand';
import type { Session } from '@shared/types';

export interface ActiveProject {
  path: string;
  name: string;
  lastOpened: string;
  hasClaudeMd: boolean;
  hasIndex: boolean;
  hasClaude: boolean;
  hasMcConfig: boolean;
}

export type SupplementaryPanel = 'chronicle' | 'adhoc' | 'sessions' | null;

interface DashboardState {
  activeSessionId: string | null;
  sessions: Session[];
  selectedCardId: string | null;
  previewOpen: boolean;
  terminalCollapsed: boolean;
  terminalHeight: number;

  // Supplementary panel accordion — only one can be open at a time
  openSupplementaryPanel: SupplementaryPanel;

  // Project state
  activeProject: ActiveProject | null;
  projectLoading: boolean;

  // Actions
  setActiveSession: (id: string | null) => void;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  setSelectedCard: (id: string | null) => void;
  togglePreview: (open?: boolean) => void;
  toggleTerminal: (collapsed?: boolean) => void;
  setTerminalHeight: (height: number) => void;

  // Supplementary panel actions
  setOpenSupplementaryPanel: (panel: SupplementaryPanel) => void;
  toggleSupplementaryPanel: (panel: Exclude<SupplementaryPanel, null>) => void;

  // Project actions
  setActiveProject: (project: ActiveProject | null) => void;
  setProjectLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeSessionId: null,
  sessions: [],
  selectedCardId: null,
  previewOpen: false,
  terminalCollapsed: false,
  terminalHeight: 280,

  // Supplementary panel accordion
  openSupplementaryPanel: null,

  // Project state
  activeProject: null,
  projectLoading: true,

  setActiveSession: (id) => set({ activeSessionId: id }),

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    })),

  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? sessions[sessions.length - 1]?.id ?? null
          : state.activeSessionId;
      return { sessions, activeSessionId };
    }),

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  setSelectedCard: (id) =>
    set({ selectedCardId: id, previewOpen: id !== null }),

  togglePreview: (open) =>
    set((state) => ({
      previewOpen: open !== undefined ? open : !state.previewOpen,
      selectedCardId: open === false ? null : state.selectedCardId,
    })),

  toggleTerminal: (collapsed) =>
    set((state) => ({
      terminalCollapsed:
        collapsed !== undefined ? collapsed : !state.terminalCollapsed,
    })),

  setTerminalHeight: (height) =>
    set({ terminalHeight: Math.max(150, Math.min(height, window.innerHeight * 0.6)) }),

  // Supplementary panel actions
  setOpenSupplementaryPanel: (panel) => set({ openSupplementaryPanel: panel }),

  toggleSupplementaryPanel: (panel) =>
    set((state) => ({
      openSupplementaryPanel: state.openSupplementaryPanel === panel ? null : panel,
    })),

  // Project actions
  setActiveProject: (project) => set({ activeProject: project }),
  setProjectLoading: (loading) => set({ projectLoading: loading }),
}));
