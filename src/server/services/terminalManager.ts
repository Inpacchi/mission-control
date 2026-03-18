import type { WebSocket } from 'ws';
import type { Session } from '../../shared/types.js';
import * as sessionStore from './sessionStore.js';

// node-pty is a native CJS module; handle import carefully
let ptyModule: typeof import('node-pty') | null = null;

async function loadPty(): Promise<typeof import('node-pty')> {
  if (ptyModule) return ptyModule;
  try {
    ptyModule = await import('node-pty');
    return ptyModule;
  } catch (err) {
    throw new Error(`Failed to load node-pty: ${(err as Error).message}`);
  }
}

interface ManagedSession {
  session: Session;
  pty: import('node-pty').IPty | null;
  subscribers: Set<WebSocket>;
}

const sessions = new Map<string, ManagedSession>();

export async function createSession(
  projectPath: string,
  command?: string,
  cols = 80,
  rows = 24
): Promise<Session> {
  const pty = await loadPty();

  const logEntry = sessionStore.createSession(projectPath, command);

  const args = command ? [command] : [];
  let ptyProcess: import('node-pty').IPty;

  try {
    ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: projectPath,
      env: { ...process.env } as Record<string, string>,
    });
  } catch (err) {
    const session: Session = {
      id: logEntry.id,
      projectPath,
      command,
      status: 'exited',
      exitCode: 1,
      startedAt: logEntry.startedAt,
      endedAt: new Date().toISOString(),
      logPath: logEntry.logFile,
    };
    throw new Error(`Failed to spawn claude: ${(err as Error).message}. Session: ${JSON.stringify(session)}`);
  }

  const session: Session = {
    id: logEntry.id,
    projectPath,
    command,
    status: 'running',
    startedAt: logEntry.startedAt,
    logPath: logEntry.logFile,
  };

  const managed: ManagedSession = {
    session,
    pty: ptyProcess,
    subscribers: new Set(),
  };

  sessions.set(session.id, managed);

  // Bridge PTY output to WebSocket subscribers and log
  ptyProcess.onData((data: string) => {
    // Stream to log file (no memory buffering)
    sessionStore.appendLog(session.id, projectPath, data);

    // Send to all subscribed WebSocket clients
    const message = JSON.stringify({
      channel: `terminal:${session.id}`,
      type: 'data',
      data,
    });

    for (const ws of managed.subscribers) {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(message);
      }
    }
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
    session.status = 'exited';
    session.exitCode = exitCode;
    session.endedAt = new Date().toISOString();

    sessionStore.finalizeSession(session.id, projectPath);

    // Notify subscribers
    const message = JSON.stringify({
      channel: `terminal:${session.id}`,
      type: 'exit',
      code: exitCode,
    });

    for (const ws of managed.subscribers) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }

    // Clean up subscribers
    managed.subscribers.clear();
    managed.pty = null;

    // Delayed cleanup: remove session from map after clients have received the exit event
    setTimeout(() => {
      sessions.delete(session.id);
    }, 5000);
  });

  return session;
}

export function subscribe(sessionId: string, ws: WebSocket): boolean {
  const managed = sessions.get(sessionId);
  if (!managed) return false;
  managed.subscribers.add(ws);
  return true;
}

export function unsubscribe(sessionId: string, ws: WebSocket): void {
  const managed = sessions.get(sessionId);
  if (managed) {
    managed.subscribers.delete(ws);
  }
}

export function unsubscribeAll(ws: WebSocket): void {
  for (const managed of sessions.values()) {
    managed.subscribers.delete(ws);
  }
}

export function sendInput(sessionId: string, data: string): boolean {
  const managed = sessions.get(sessionId);
  if (!managed?.pty) return false;
  managed.pty.write(data);
  return true;
}

export function resize(sessionId: string, cols: number, rows: number): boolean {
  const managed = sessions.get(sessionId);
  if (!managed?.pty) return false;
  try {
    managed.pty.resize(cols, rows);
    return true;
  } catch {
    return false;
  }
}

export function killSession(sessionId: string): boolean {
  const managed = sessions.get(sessionId);
  if (!managed?.pty) return false;
  try {
    managed.pty.kill();
    return true;
  } catch {
    return false;
  }
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId)?.session;
}

export function listSessions(): Session[] {
  return Array.from(sessions.values()).map((m) => m.session);
}

export function killAll(): void {
  for (const [id, managed] of sessions) {
    if (managed.pty) {
      try {
        managed.pty.kill();
      } catch {
        // Best effort
      }
    }
    managed.subscribers.clear();
    sessions.delete(id);
  }
}
