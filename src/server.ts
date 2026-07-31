#!/usr/bin/env node
import { runHttp } from './http.js';
import { runStdio } from './stdio.js';

function parseAllowedHosts(): string[] | undefined {
  const raw = process.env.MCP_ALLOWED_HOSTS;
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

function resolveTransport(): 'stdio' | 'http' {
  const argv = process.argv.slice(2);
  if (argv.includes('--http')) return 'http';
  if (argv.includes('--stdio')) return 'stdio';

  const flag = argv.find((a) => a.startsWith('--transport='));
  if (flag) {
    const value = flag.split('=')[1]?.toLowerCase();
    if (value === 'http' || value === 'stdio') return value;
  }

  const envValue = (process.env.TRANSPORT ?? 'stdio').toLowerCase();
  if (envValue === 'http' || envValue === 'stdio') return envValue;

  console.error(`Unknown TRANSPORT value: "${envValue}" (expected "stdio" or "http")`);
  process.exit(1);
}

const transport = resolveTransport();

if (transport === 'http') {
  await runHttp({
    port: Number(process.env.PORT) || 4000,
    host: process.env.HOST ?? '0.0.0.0',
    allowedHosts: parseAllowedHosts(),
    sessionTtlMs: Number(process.env.MCP_SESSION_TTL_MS) || 300_000,
    maxSessions: Number(process.env.MCP_MAX_SESSIONS) || 500,
    maxBodyBytes: Number(process.env.MCP_MAX_BODY_BYTES) || 1_048_576,
    rateLimitPerMinute: Number(process.env.MCP_RATE_LIMIT_PER_MINUTE) || 60,
  });
} else {
  await runStdio();
}
