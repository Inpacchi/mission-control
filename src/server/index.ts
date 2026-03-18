import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as projectRegistry from './services/projectRegistry.js';
import { createFileWatcher, type FileWatcherHandle } from './services/fileWatcher.js';
import { initSessionStore } from './services/sessionStore.js';
import * as terminalManager from './services/terminalManager.js';

import { createSdlcRouter } from './routes/sdlc.js';
import { createSessionsRouter } from './routes/sessions.js';
import { createConfigRouter } from './routes/config.js';
import { createProjectsRouter } from './routes/projects.js';
import { createFilesRouter } from './routes/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port: number;
  bind: string;
  projectPath: string;
  dev?: boolean;
}

// Track WebSocket client subscriptions and heartbeat
interface ClientState {
  subscriptions: Set<string>;
  alive: boolean;
}

/**
 * Mutable server context — holds the active project path and resources
 * that need to be re-initialized on project switch.
 */
interface ServerContext {
  projectPath: string;
  fileWatcher: FileWatcherHandle;
}

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, bind, projectPath, dev } = options;

  // --- Service initialization ---

  // 1. Resolve and register project
  const resolvedPath = projectRegistry.resolve(projectPath);
  projectRegistry.register(resolvedPath);

  // 2. Initialize session store (runs pruning)
  initSessionStore(resolvedPath);

  // 3. Cleanup callbacks for graceful shutdown
  const cleanupCallbacks: Array<() => void | Promise<void>> = [];

  // --- Express setup ---
  const app = express();
  app.use(express.json());

  // Client state tracking (declared early — used by broadcast and routes)
  const clientStates = new Map<WebSocket, ClientState>();

  // Broadcast to clients subscribed to a channel
  function broadcast(channel: string, message: object): void {
    const payload = JSON.stringify(message);
    for (const [ws, state] of clientStates) {
      if (ws.readyState === WebSocket.OPEN && state.subscriptions.has(channel)) {
        ws.send(payload);
      }
    }
  }

  // --- Mutable context (swapped on project switch) ---
  const ctx: ServerContext = {
    projectPath: resolvedPath,
    fileWatcher: createFileWatcher({
      projectPath: resolvedPath,
      onUpdate: (deliverables) => {
        broadcast('watcher:sdlc', {
          channel: 'watcher:sdlc',
          type: 'update',
          data: deliverables,
        });
      },
    }),
  };

  /**
   * Re-initialize server resources for a new project.
   * Called from POST /api/projects/switch.
   */
  async function switchProjectContext(newProjectPath: string): Promise<void> {
    const absPath = projectRegistry.resolve(newProjectPath);
    projectRegistry.register(absPath);

    // Close old file watcher
    await ctx.fileWatcher.close();

    // Re-init session store for new project
    initSessionStore(absPath);

    // Create new file watcher
    ctx.fileWatcher = createFileWatcher({
      projectPath: absPath,
      onUpdate: (deliverables) => {
        broadcast('watcher:sdlc', {
          channel: 'watcher:sdlc',
          type: 'update',
          data: deliverables,
        });
      },
    });

    ctx.projectPath = absPath;
    console.log(`[server] Switched to project: ${absPath}`);

    // Broadcast project switch to all connected clients
    const payload = JSON.stringify({
      channel: 'system',
      type: 'project-switched',
      data: { projectPath: absPath },
    });
    for (const [ws] of clientStates) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      projectPath: ctx.projectPath,
      uptime: process.uptime(),
    });
  });

  // Mount routes — use getter functions so routes always read current ctx
  app.use('/api/sdlc', createSdlcRouter(() => ctx.projectPath));
  app.use('/api/sessions', createSessionsRouter(() => ctx.projectPath));
  app.use('/api/config', createConfigRouter(() => ctx.projectPath));
  app.use('/api/projects', createProjectsRouter(switchProjectContext, () => ctx.projectPath));
  app.use('/api/files', createFilesRouter(() => ctx.projectPath));

  // Catch-all for unhandled API routes — return JSON 404 instead of SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // In production, serve the built UI
  if (!dev) {
    const uiDistPath = path.resolve(__dirname, '..', '..', 'ui');
    app.use(express.static(uiDistPath));

    // SPA fallback: serve index.html for all non-API routes
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });
  }

  // --- HTTP + WebSocket server ---
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // --- WebSocket connection handling ---
  wss.on('connection', (ws: WebSocket) => {
    const state: ClientState = {
      subscriptions: new Set(),
      alive: true,
    };
    clientStates.set(ws, state);

    ws.on('pong', () => {
      state.alive = true;
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));

        // System messages
        if (msg.channel === 'system') {
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ channel: 'system', type: 'pong' }));
            return;
          }

          if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
            for (const ch of msg.channels) {
              if (typeof ch === 'string') {
                state.subscriptions.add(ch);

                // If subscribing to a terminal channel, register with terminal manager
                const termMatch = ch.match(/^terminal:(.+)$/);
                if (termMatch) {
                  terminalManager.subscribe(termMatch[1], ws);
                }
              }
            }
            return;
          }
        }

        // Terminal input messages
        const terminalMatch = msg.channel?.match(/^terminal:(.+)$/);
        if (terminalMatch) {
          const sessionId = terminalMatch[1];

          if (msg.type === 'input' && typeof msg.data === 'string') {
            terminalManager.sendInput(sessionId, msg.data);
            return;
          }

          if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
            terminalManager.resize(sessionId, msg.cols, msg.rows);
            return;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      // Unsubscribe from all terminal channels
      terminalManager.unsubscribeAll(ws);
      clientStates.delete(ws);
    });

    ws.on('error', () => {
      terminalManager.unsubscribeAll(ws);
      clientStates.delete(ws);
    });
  });

  // --- WebSocket heartbeat: ping every 30s, close on 2 missed pongs ---
  const heartbeatInterval = setInterval(() => {
    for (const [ws, state] of clientStates) {
      if (!state.alive) {
        // Missed pong — terminate
        terminalManager.unsubscribeAll(ws);
        clientStates.delete(ws);
        ws.terminate();
        continue;
      }
      state.alive = false;
      ws.ping();
    }
  }, 30000);

  cleanupCallbacks.push(() => clearInterval(heartbeatInterval));

  // Register terminal manager cleanup
  cleanupCallbacks.push(() => terminalManager.killAll());

  // Register file watcher cleanup (uses ctx so always closes the current one)
  cleanupCallbacks.push(() => ctx.fileWatcher.close());

  // --- Graceful shutdown ---
  const shutdown = async () => {
    console.log('\nShutting down...');

    // Run all cleanup callbacks
    for (const cb of cleanupCallbacks) {
      try {
        await cb();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }

    wss.clients.forEach((client) => client.close());

    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });

    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // --- Start listening ---
  return new Promise<void>((resolve) => {
    server.listen(port, bind, () => {
      console.log(`Mission Control running at http://${bind}:${port}`);
      console.log(`Project: ${resolvedPath}`);
      if (dev) {
        console.log('Mode: development (UI served by Vite on :5173)');
      }
      resolve();
    });
  });
}
