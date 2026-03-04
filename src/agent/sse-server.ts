import http from 'http';
import path from 'path';
import fs from 'fs';

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
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size, agentName: 'Seedstr-Agent', uptime: Math.floor(process.uptime()) }));
      } else {
        // Serve Next.js static files for dashboard
        this.serveStaticFile(req, res);
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

  /** Serve Next.js static files from the 'out/' directory (static export) */
  private serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Map URL to file path (default to index.html for root)
    let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';

    // Remove query strings
    filePath = filePath.split('?')[0];

    // Build full path to 'out/' directory
    const fullPath = path.join(process.cwd(), 'out', filePath);

    // Security: prevent directory traversal
    const outDir = path.join(process.cwd(), 'out');
    if (!fullPath.startsWith(outDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      // Try index.html for SPA routes
      const indexPath = path.join(outDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        this.sendFile(indexPath, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Dashboard Not Found - Build with: npm run build');
      }
      return;
    }

    // If directory, serve index.html
    if (fs.statSync(fullPath).isDirectory()) {
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        this.sendFile(indexPath, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
      return;
    }

    this.sendFile(fullPath, res);
  }

  private sendFile(filePath: string, res: http.ServerResponse): void {
    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
}
}
