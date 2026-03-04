import http from 'http';

// SSE event types matching UI's AgentEvent union
export type SSEEventType =
  | 'agent_started'
  | 'polling'
  | 'job_found'
  | 'job_generating'
  | 'job_building'
  | 'job_submitting'
  | 'job_success'
  | 'job_failed'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Simple SSE (Server-Sent Events) server for real-time agent monitoring.
 * Broadcasts agent events to connected UI clients.
 */
export class SSEServer {
  private server: http.Server | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private readonly port: number;

  constructor(port = 3001) {
    // Use Railway's PORT env var, fallback to provided port or 3001
    this.port = process.env.PORT ? parseInt(process.env.PORT, 10) : port;
    this.port = port;
  }

  start(): void {
    this.server = http.createServer((req, res) => {
      // Allow CORS for all origins
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/events' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
        });

        // Flush headers immediately
        res.flushHeaders?.();

        this.clients.add(res);
        console.log(`[SSE] Client connected. Total: ${this.clients.size}`);

        // Send initial heartbeat
        this.sendToClient(res, {
          type: 'agent_started',
          timestamp: Date.now(),
          data: {
            uptime: process.uptime() * 1000,
            status: 'running',
          },
        });

        // Keep-alive ping every 30s to prevent proxy timeouts
        const ping = setInterval(() => {
          try {
            res.write(': ping\n\n');
          } catch {
            clearInterval(ping);
            this.clients.delete(res);
          }
        }, 30_000);

        req.on('close', () => {
          clearInterval(ping);
          this.clients.delete(res);
          console.log(`[SSE] Client disconnected. Total: ${this.clients.size}`);
        });
      } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Listen on 0.0.0.0 (all interfaces) for Railway compatibility
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`[SSE] Server listening on http://0.0.0.0:${this.port}/events`);
    });
  }

  stop(): void {
    if (this.server) {
      this.clients.forEach((client) => client.end());
      this.clients.clear();
      this.server.close();
      this.server = null;
      console.log('[SSE] Server stopped');
    }
  }

  /** Broadcast an event to all connected clients */
  broadcast(event: SSEEvent): void {
    for (const client of this.clients) {
      this.sendToClient(client, event);
    }
  }

  private sendToClient(client: http.ServerResponse, event: SSEEvent): void {
    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.clients.delete(client);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
