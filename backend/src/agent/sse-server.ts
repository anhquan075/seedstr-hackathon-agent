import fs from 'fs';
import http from 'http';
import path from 'path';
import { metricsRegistry } from '../instrumentation/metrics.js';
// SSE event types matching UI's AgentEvent union
export type SSEEventType =
  | 'agent_started'
  | 'polling'
  | 'job_received'
  | 'job_processing'
  | 'job_building'
  | 'job_submitting'
  | 'job_approval_request'
  | 'job_completed'
  | 'job_failed'
  | 'job_found'
  | 'job_generated'
  | 'log'
  | 'error'
  | 'job_accepted'
  | 'job_skipped'
  | 'tool_call'
  | 'tool_result'
  | 'response_generated'
  | 'project_built'
  | 'files_uploading'
  | 'files_uploaded'
  | 'response_submitted';



export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

interface ControlHandlers {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  prompt: (prompt: string) => Promise<unknown> | unknown;
  getState: () => unknown;
  getHistory: (limit?: number) => unknown;
  replayLast: () => Promise<unknown> | unknown;
}

/**
 * Simple SSE (Server-Sent Events) server for real-time agent monitoring.
 * Broadcasts agent events to connected UI clients.
 * Optimized for Railway edge proxy (based on Nexus-Forge patterns)
 */
export class SSEServer {
  private server: http.Server | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private readonly port: number;
  private controlHandlers: ControlHandlers | null = null;
  private jobsMap: Map<string, Record<string, unknown>> = new Map();

  constructor(port = 8080) {
    // Railway provides PORT env var for production
    // Fallback to provided port (default 8080) for local development
    const envPort = process.env.PORT;
    this.port = envPort ? parseInt(envPort, 10) : port;
    console.log(`[SSE Server] Initializing on port ${this.port}`);
  }

  start(): void {
    this.server = http.createServer(async (req, res) => {
      const pathname = (req.url || '/').split('?')[0];

      // Allow CORS for all origins
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname === '/events' && req.method === 'GET') {
        console.log('[SSE] New connection request received');
        
        // SSE headers - optimized for Railway edge proxy (based on Nexus-Forge)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        console.log('[SSE] Headers written');

        // Flush headers immediately
        res.flushHeaders?.();
        console.log('[SSE] Headers flushed');

        this.clients.add(res);
        console.log(`[SSE] Client added. Total: ${this.clients.size}`);

        const initialMsg = ': connected\n\n';
        res.write(initialMsg);
        console.log(`[SSE] Initial message written (${initialMsg.length} bytes)`);
        
        // Railway edge proxy needs at least some data to start streaming
        // Single comment line is enough to trigger streaming
        res.write(':\n\n');
        console.log('[SSE] Sent additional keepalive comments');
        
        // Force flush to prevent Railway buffering
        if (res.socket) {
          res.socket.uncork();
          console.log('[SSE] Socket uncorked');
        }

        // Send initial event
        this.sendToClient(res, {
          type: 'agent_started',
          timestamp: Date.now(),
          data: {
            uptime: process.uptime() * 1000,
            status: 'running',
          },
        });

        // Keep-alive: send actual polling event every 15s (Railway edge proxy timeout)
        const ping = setInterval(() => {
          try {
            this.sendToClient(res, {
              type: 'polling',
              timestamp: Date.now(),
              data: {}
            });
          } catch {
            clearInterval(ping);
            this.clients.delete(res);
          }
        }, 15_000);
        // Connection timeout - cleanup stalled clients after 90s (Railway edge proxy timeout)
        const timeout = setTimeout(() => {
          try {
            res.end();
          } catch {}
          clearInterval(ping);
          this.clients.delete(res);
          console.log(`[SSE] Client timeout after 90s. Total: ${this.clients.size}`);
        }, 90_000);

        req.on('close', () => {
          clearInterval(ping);
          clearTimeout(timeout);
          this.clients.delete(res);
          console.log(`[SSE] Client disconnected. Total: ${this.clients.size}`);
        });
      } else if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size, agentName: 'Seedstr-Agent', uptime: Math.floor(process.uptime()) }));
      } else if (pathname === '/state' && req.method === 'GET') {
        const state = this.controlHandlers?.getState() ?? { running: false, activeJobs: 0, sseClients: this.clients.size };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(state));
      } else if (pathname === '/metrics' && req.method === 'GET') {
        try {
          const metricsOutput = metricsRegistry.metrics();
          res.writeHead(200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate'
          });
          res.end(metricsOutput);
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to generate metrics' }));
        }
      } else if (pathname === '/control/history' && req.method === 'GET') {
        this.handleControlHistory(req, res);
      } else if (pathname === '/control/start' && req.method === 'POST') {
        this.handleControlStart(res);
      } else if (pathname === '/control/stop' && req.method === 'POST') {
        this.handleControlStop(res);
      } else if (pathname === '/control/prompt' && req.method === 'POST') {
        this.handleControlPrompt(req, res);
      } else if (pathname === '/control/replay' && req.method === 'POST') {
        this.handleControlReplay(res);
      } else if (pathname.startsWith('/api/')) {
        // Handle API routes BEFORE static file serving
        this.handleApiRoute(req, res);
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

  setControlHandlers(handlers: ControlHandlers): void {
    this.controlHandlers = handlers;
  }

  /** Send a log message to all connected clients */
  public logToClients(level: 'info' | 'warn' | 'error', message: string): void {
    const event: SSEEvent = {
      type: 'log',
      timestamp: Date.now(),
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        level,
        message,
      },
    };

    for (const client of this.clients) {
      this.sendToClient(client, event);
    }
    
    // Also log to server console
    console.log(`[SSE Log] ${level.toUpperCase()}: ${message}`);
  }

  /** Broadcast an event to all connected clients */
  broadcast(event: SSEEvent): void {
    // Track job state changes and log them to clients
    if (event.type.startsWith('job_')) {
      const jobId = (event.data.jobId as string) || (event.data.id as string) || 'unknown';
      const existingJob = this.jobsMap.get(jobId) || {};
      
      // Update job state based on event type
      if (event.type === 'job_found') {
        this.jobsMap.set(jobId, {
          id: jobId,
          status: 'received',
          prompt: event.data.prompt,
          budget: event.data.budget,
          skills: event.data.skills,
          timestamp: event.timestamp,
          output: null,
          error: null,
        });
        this.logToClients('info', `Job Found: ${jobId} - "${event.data.prompt}" (Budget: ${event.data.budget})`);
      } else if (event.type === 'job_received') {
        this.jobsMap.set(jobId, {
          id: jobId,
          status: 'received',
          prompt: event.data.prompt,
          budget: event.data.budget,
          skills: event.data.skills,
          timestamp: event.timestamp,
          output: null,
          error: null,
        });
        this.logToClients('info', `Job Received: ${jobId}`);
      } else if (event.type === 'job_processing') {
        this.jobsMap.set(jobId, { ...existingJob, status: 'processing', timestamp: event.timestamp });
        this.logToClients('info', `Job Processing: ${jobId} - Stage: ${event.data.stage || 'executing'}`);
      } else if (event.type === 'job_completed') {
        this.jobsMap.set(jobId, { ...existingJob, status: 'completed', output: event.data.result, timestamp: event.timestamp, completedAt: event.timestamp });
        this.logToClients('info', `Job Completed: ${jobId}`);
      } else if (event.type === 'job_failed') {
        this.jobsMap.set(jobId, { ...existingJob, status: 'failed', error: event.data.error, timestamp: event.timestamp, completedAt: event.timestamp });
        this.logToClients('error', `Job Failed: ${jobId} - ${event.data.error}`);
      }
    }
    
    for (const client of this.clients) {
      this.sendToClient(client, event);
    }
  }

  private sendToClient(client: http.ServerResponse, event: SSEEvent): void {
    // Check if connection is still writable (Nexus-Forge pattern)
    if (client.writableEnded) {
      this.clients.delete(client);
      return;
    }

    try {
      // SSE format: event line + data line + blank line
      const payload = `event: ${event.type}\ndata: ${JSON.stringify({
        timestamp: event.timestamp,
        ...event.data
      })}\n\n`;
      
      client.write(payload);
      // Force flush to Railway edge proxy
      if (client.socket) {
        client.socket.uncork();
      }
    } catch {
      this.clients.delete(client);
    }
  }

  private async handleControlStart(res: http.ServerResponse): Promise<void> {
    if (!this.controlHandlers) {
      this.respondJson(res, 503, { error: 'Control handlers are not configured' });
      return;
    }

    await this.controlHandlers.start();
    this.respondJson(res, 200, { ok: true, state: this.controlHandlers.getState() });
  }

  private async handleControlStop(res: http.ServerResponse): Promise<void> {
    if (!this.controlHandlers) {
      this.respondJson(res, 503, { error: 'Control handlers are not configured' });
      return;
    }

    await this.controlHandlers.stop();
    this.respondJson(res, 200, { ok: true, state: this.controlHandlers.getState() });
  }

  private handleControlPrompt(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.controlHandlers) {
      this.respondJson(res, 503, { error: 'Control handlers are not configured' });
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}') as { prompt?: string };
        const prompt = parsed.prompt?.trim();

        if (!prompt) {
          this.respondJson(res, 400, { error: 'Prompt is required' });
          return;
        }

        const result = await this.controlHandlers!.prompt(prompt);
        this.respondJson(res, 200, { ok: true, result, state: this.controlHandlers!.getState() });
      } catch (error) {
        this.respondJson(res, 500, {
          error: error instanceof Error ? error.message : 'Failed to process prompt',
        });
      }
    });
  }

  private async handleControlReplay(res: http.ServerResponse): Promise<void> {
    if (!this.controlHandlers) {
      this.respondJson(res, 503, { error: 'Control handlers are not configured' });
      return;
    }

    try {
      const result = await this.controlHandlers.replayLast();
      this.respondJson(res, 200, { ok: true, result, state: this.controlHandlers.getState() });
    } catch (error) {
      this.respondJson(res, 500, {
        error: error instanceof Error ? error.message : 'Failed to replay prompt',
      });
    }
  }

  private handleControlHistory(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.controlHandlers) {
      this.respondJson(res, 503, { error: 'Control handlers are not configured' });
      return;
    }

    const params = new URL(req.url || '/control/history', 'http://localhost').searchParams;
    const requested = Number(params.get('limit') || '10');
    const limit = Number.isFinite(requested) ? Math.max(1, Math.min(100, requested)) : 10;
    const items = this.controlHandlers.getHistory(limit);

    this.respondJson(res, 200, { items });
  }

  private handleApiRoute(req: http.IncomingMessage, res: http.ServerResponse): void {
    const pathname = (req.url || '/').split('?')[0];
    
    if (pathname === '/api/agents' && req.method === 'GET') {
      this.handleGetAgents(res);
    } else if (pathname === '/api/jobs' && req.method === 'POST') {
      this.handlePostJob(req, res);
    } else if (pathname === '/api/jobs' && req.method === 'GET') {
      this.handleGetJobs(res);
    } else {
      this.respondJson(res, 404, { error: 'API endpoint not found', path: pathname });
    }
  }

  private handleGetAgents(res: http.ServerResponse): void {
    // Return agent information with real metrics calculated from jobsMap
    const uptime = Math.floor(process.uptime() * 1000); // Convert to milliseconds
    
    // Calculate job statistics from jobsMap
    const totalJobs = this.jobsMap.size;
    const completedJobs = Array.from(this.jobsMap.values()).filter(
      job => job.status === 'completed'
    ).length;
    const failedJobs = Array.from(this.jobsMap.values()).filter(
      job => job.status === 'failed'
    ).length;
    const successRate = totalJobs > 0 
      ? Math.round((completedJobs / totalJobs) * 100) 
      : 0;

    const agents = [
      {
        id: process.env.SEEDSTR_AGENT_ID || 'seedstr-agent',
        name: 'Seedstr-Agent',
        status: 'running',
        uptime, // milliseconds for precise tracking
        uptimeSeconds: Math.floor(uptime / 1000),
        clients: this.clients.size,
        totalJobs,
        completedJobs,
        failedJobs,
        successRate,
        capabilities: [
          'design_system_generation',
          'ui_template_creation',
          'project_building',
          'code_generation'
        ]
      }
    ];
    
    this.respondJson(res, 200, { agents, total: agents.length });
  }

  private handleGetJobs(res: http.ServerResponse): void {
    // Return tracked job data from jobsMap
    const jobs = Array.from(this.jobsMap.values()).map(job => ({
      id: job.id,
      status: job.status,
      prompt: job.prompt,
      output: job.output || null,
      error: job.error || null,
      timestamp: job.timestamp,
      completedAt: job.completedAt || null,
    }));
    
    this.respondJson(res, 200, { jobs, total: jobs.length });
  }

  private handlePostJob(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}') as { prompt?: string; budget?: number };
        const { prompt, budget } = payload;

        if (!prompt) {
          this.respondJson(res, 400, { error: 'Prompt is required' });
          return;
        }

        if (!budget || budget <= 0) {
          this.respondJson(res, 400, { error: 'Budget must be greater than 0' });
          return;
        }

        // Generate a job ID and return success
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Broadcast job event to connected SSE clients
        this.broadcast({
          type: 'job_found',
          timestamp: Date.now(),
          data: {
            jobId,
            prompt,
            budget,
            status: 'queued'
          }
        });

        // Also create the .agent-prompt file to trigger actual execution via Watcher
        try {
          const promptFile = path.join(process.cwd(), '.agent-prompt');
          const fileContent = [
            prompt,
            `budget: ${budget}`,
            `jobId: ${jobId}`,
            `status: queued`,
            `isLocal: true`,
          ].join('\n');
          fs.writeFileSync(promptFile, fileContent);
          console.log(`[SSE] Created .agent-prompt for job ${jobId}`);
        } catch (err) {
          console.error('[SSE] Failed to create .agent-prompt:', err);
        }

        this.respondJson(res, 201, {
          jobId,
          status: 'queued',
          prompt,
          budget,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        this.respondJson(res, 500, {
          error: error instanceof Error ? error.message : 'Failed to process job'
        });
      }
    });
  }

  private respondJson(res: http.ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
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

    // CSP header for static files (allows Next.js requirements)
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self'",
    ].join('; ');

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType, 'Content-Security-Policy': csp });
      res.end(data);
    });
  }
}
