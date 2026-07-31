import { randomUUID } from 'node:crypto';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './create-server.js';
import { ensureDataLoaded, isDataLoaded } from './data.js';
import { VERSION } from './version.js';

export interface HttpOptions {
  port: number;
  host: string;
  allowedHosts?: string[];
  sessionTtlMs: number;
  maxSessions: number;
  maxBodyBytes: number;
  rateLimitPerMinute: number;
}

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  lastSeen: number;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

function jsonRpcError(res: ServerResponse, status: number, code: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}

export async function runHttp(
  opts: HttpOptions,
): Promise<{ port: number; close: () => Promise<void> }> {
  process.on('uncaughtException', (error: unknown): void => {
    console.error('[uncaughtException]', error);
  });
  process.on('unhandledRejection', (error: unknown): void => {
    console.error('[unhandledRejection]', error);
  });

  const sessions = new Map<string, Session>();

  // Simple per-IP token bucket for rate limiting.
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
      return false;
    }
    bucket.count += 1;
    return bucket.count > opts.rateLimitPerMinute;
  }

  function clientIp(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]!.trim();
    }
    return req.socket.remoteAddress ?? 'unknown';
  }

  function hostAllowed(req: IncomingMessage): boolean {
    if (!opts.allowedHosts || opts.allowedHosts.length === 0) return true;
    const hostHeader = req.headers.host ?? '';
    const hostname = hostHeader.split(':')[0]!.toLowerCase();
    return opts.allowedHosts.some((h): boolean => h.toLowerCase() === hostname);
  }

  async function createSession(): Promise<Session> {
    const server = createServer();
    const session: Session = {
      server,
      transport: undefined as unknown as StreamableHTTPServerTransport,
      lastSeen: Date.now(),
    };

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: (): string => randomUUID(),
      onsessioninitialized: (id: string): void => {
        session.lastSeen = Date.now();
        sessions.set(id, session);
      },
      onsessionclosed: (id: string): void => {
        sessions.delete(id);
      },
    });
    session.transport = transport;

    transport.onclose = (): void => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };

    await server.connect(transport);
    return session;
  }

  const httpServer: Server = createHttpServer((req, res): void => {
    void (async (): Promise<void> => {
      const ip = clientIp(req);
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
      }

      if (!hostAllowed(req)) {
        jsonRpcError(res, 403, -32000, 'Forbidden: host not allowed');
        return;
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(
          JSON.stringify({
            status: 'ok',
            dataLoaded: isDataLoaded(),
            version: VERSION,
            sessions: sessions.size,
          }),
        );
        return;
      }

      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      if (!['POST', 'GET', 'DELETE'].includes(req.method ?? '')) {
        res.writeHead(405, { Allow: 'GET, POST, DELETE, OPTIONS', ...CORS_HEADERS });
        res.end();
        return;
      }

      if (isRateLimited(ip)) {
        res.writeHead(429, {
          'Retry-After': '60',
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        });
        res.end(JSON.stringify({ error: 'Too many requests' }));
        return;
      }

      const contentLength = Number(req.headers['content-length'] ?? '0');
      if (contentLength > opts.maxBodyBytes) {
        jsonRpcError(res, 413, -32000, 'Request body too large');
        return;
      }

      Object.entries(CORS_HEADERS).forEach(([key, value]): void => {
        res.setHeader(key, value);
      });

      const sessionIdHeader = req.headers['mcp-session-id'];
      const sid = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

      if (sid) {
        const session = sessions.get(sid);
        if (!session) {
          jsonRpcError(res, 404, -32001, 'Session not found');
          return;
        }
        session.lastSeen = Date.now();
        await session.transport.handleRequest(req, res);
        return;
      }

      if (req.method !== 'POST') {
        jsonRpcError(res, 400, -32000, 'Mcp-Session-Id header is required');
        return;
      }

      if (sessions.size >= opts.maxSessions) {
        res.writeHead(503, {
          'Retry-After': '30',
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        });
        res.end(JSON.stringify({ error: 'Server is at capacity, try again shortly' }));
        return;
      }

      // No session id on a POST: only valid if this is an `initialize` call.
      // The transport itself validates that and returns a 400 if it isn't.
      const session = await createSession();
      await session.transport.handleRequest(req, res);
    })().catch((error: unknown): void => {
      console.error('[http request error]', error);
      if (!res.headersSent) {
        jsonRpcError(res, 500, -32000, 'Internal server error');
      }
    });
  });

  // Idle-session reaper.
  const reaper = setInterval((): void => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastSeen > opts.sessionTtlMs) {
        session.transport.close().catch(() => {});
        sessions.delete(id);
      }
    }
  }, 60_000);
  reaper.unref();

  // Load data BEFORE listening — cold start is under 1s, so there's no
  // reason to ever serve "still loading" to an HTTP client.
  await ensureDataLoaded();

  await new Promise<void>((resolve): void => {
    httpServer.listen(opts.port, opts.host, resolve);
  });

  const address = httpServer.address();
  const resolvedPort = typeof address === 'object' && address ? address.port : opts.port;
  console.error(`Quran MCP HTTP server listening on http://${opts.host}:${resolvedPort}/mcp`);

  async function close(): Promise<void> {
    clearInterval(reaper);
    await Promise.allSettled([...sessions.values()].map((s) => s.transport.close()));
    sessions.clear();
    await new Promise<void>((resolve, reject): void => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  }

  const shutdown = (signal: string): void => {
    console.error(`Received ${signal}, shutting down...`);
    const timer = setTimeout((): void => {
      console.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);
    timer.unref();
    close()
      .then((): void => {
        process.exit(0);
      })
      .catch((error: unknown): void => {
        console.error('Error during shutdown', error);
        process.exit(1);
      });
  };

  process.once('SIGTERM', (): void => shutdown('SIGTERM'));
  process.once('SIGINT', (): void => shutdown('SIGINT'));

  return { port: resolvedPort, close };
}
