import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { WsMessage } from '@shared/types';

const xtermTheme = {
  background: '#0D1117',
  foreground: '#C9D1D9',
  cursor: '#7EB8F7',
  cursorAccent: '#0D1117',
  selectionBackground: '#2F74D050',
  black: '#1C2333',
  brightBlack: '#4E5C72',
  red: '#F87171',
  brightRed: '#FCA5A5',
  green: '#4ADE80',
  brightGreen: '#86EFAC',
  yellow: '#FCD34D',
  brightYellow: '#FEF08A',
  blue: '#60A5FA',
  brightBlue: '#93C5FD',
  magenta: '#C084FC',
  brightMagenta: '#D8B4FE',
  cyan: '#22D3EE',
  brightCyan: '#67E8F9',
  white: '#E8EDF4',
  brightWhite: '#F8FAFC',
};

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement | null;
}

// Module-level cache to preserve terminal instances across tab switches
const terminalCache = new Map<string, TerminalInstance>();

interface UseTerminalSessionOptions {
  sessionId: string | null;
  send: (msg: WsMessage) => void;
  addListener: (handler: (msg: WsMessage) => void) => () => void;
  subscribe: (channels: string[]) => void;
  connected: boolean;
}

export function useTerminalSession({
  sessionId,
  send,
  addListener,
  subscribe,
  connected,
}: UseTerminalSessionOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  const getOrCreateTerminal = useCallback(
    (id: string): TerminalInstance => {
      let instance = terminalCache.get(id);
      if (!instance) {
        const terminal = new Terminal({
          theme: xtermTheme,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          allowProposedApi: true,
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Send user input to server
        terminal.onData((data) => {
          send({
            channel: `terminal:${id}`,
            type: 'input',
            data,
          });
        });

        // Send resize events
        terminal.onResize(({ cols, rows }) => {
          send({
            channel: `terminal:${id}`,
            type: 'resize',
            cols,
            rows,
          });
        });

        instance = { terminal, fitAddon, container: null };
        terminalCache.set(id, instance);
      }
      return instance;
    },
    [send]
  );

  // Attach terminal to DOM container
  const attachToContainer = useCallback(
    (container: HTMLDivElement | null) => {
      containerRef.current = container;
      if (!sessionId || !container) return;

      const instance = getOrCreateTerminal(sessionId);

      // If already attached to this container, just fit
      if (instance.container === container) {
        try {
          instance.fitAddon.fit();
        } catch {
          // fit can fail if container has no dimensions yet
        }
        return;
      }

      // Detach from old container if needed
      if (instance.container) {
        const xtermEl = instance.container.querySelector('.xterm');
        if (xtermEl) {
          instance.container.removeChild(xtermEl);
        }
      }

      // Clear new container and attach
      container.innerHTML = '';
      instance.terminal.open(container);
      instance.container = container;

      // Fit after a frame to ensure container has dimensions
      requestAnimationFrame(() => {
        try {
          instance.fitAddon.fit();
        } catch {
          // Container might not be visible yet
        }
      });
    },
    [sessionId, getOrCreateTerminal]
  );

  // Subscribe to terminal channel
  useEffect(() => {
    if (sessionId && connected) {
      subscribe([`terminal:${sessionId}`]);
    }
  }, [sessionId, connected, subscribe]);

  // Listen for terminal output
  useEffect(() => {
    if (!sessionId) return;

    const remove = addListener((msg: WsMessage) => {
      if (msg.channel !== `terminal:${sessionId}`) return;

      const instance = terminalCache.get(sessionId);
      if (!instance) return;

      if (msg.type === 'data') {
        instance.terminal.write(msg.data);
      } else if (msg.type === 'exit') {
        instance.terminal.write('\r\n\x1b[90m--- Session ended ---\x1b[0m\r\n');
      }
    });

    return remove;
  }, [sessionId, addListener]);

  // Handle resize observer
  useEffect(() => {
    if (!sessionId) return;
    const container = containerRef.current;
    if (!container) return;

    const instance = terminalCache.get(sessionId);
    if (!instance) return;

    const observer = new ResizeObserver(() => {
      try {
        instance.fitAddon.fit();
      } catch {
        // Ignore fit errors during resize
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [sessionId]);

  // Track current session for cleanup
  useEffect(() => {
    currentSessionRef.current = sessionId;
  }, [sessionId]);

  const fit = useCallback(() => {
    if (!sessionId) return;
    const instance = terminalCache.get(sessionId);
    if (instance) {
      try {
        instance.fitAddon.fit();
      } catch {
        // Ignore
      }
    }
  }, [sessionId]);

  const destroySession = useCallback((id: string) => {
    const instance = terminalCache.get(id);
    if (instance) {
      instance.terminal.dispose();
      terminalCache.delete(id);
    }
  }, []);

  return {
    attachToContainer,
    fit,
    destroySession,
  };
}
