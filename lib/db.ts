// Everything that talks to Postgres: turning velixir's DATABASE_URL into settings that connect,
// one connection pool per process, and the table created the first time it is needed.
//
// Server-only. Pages, route handlers and Server Actions import it; nothing that runs in the
// browser does, so the connection string never leaves the server.

import { Pool, type PoolConfig } from 'pg';

// ─── Connection settings ────────────────────────────────────────────────────

// velixir injects DATABASE_URL as postgres://user:pass@host:5432/db?sslmode=require. The
// database speaks TLS with a certificate issued by velixir's own CA, so what the URL means is
// the libpq definition of "require": encrypt the connection, but do not check the certificate
// against the public CAs your machine trusts.
//
// node-postgres reads it differently, in two ways that stack:
//
//   1. It treats sslmode=require as verify-full, so the handshake checks the certificate
//      against public CAs and fails with "self-signed certificate".
//   2. Settings parsed from the URL override the options object. Passing
//      ssl: { rejectUnauthorized: false } next to a URL that says sslmode=require does nothing.
//
// So the mode is taken out of the URL and said explicitly. The connection is still encrypted.
// A URL that asks for sslmode=verify-ca or verify-full (a database whose CA you hold, passed
// as the ca option) is left untouched.
export function pgConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);
  const mode = (url.searchParams.get('sslmode') ?? '').toLowerCase();

  // The verifying modes mean what they say in node-postgres too. Leave them alone.
  if (mode === 'verify-ca' || mode === 'verify-full') {
    return { connectionString: databaseUrl };
  }

  url.searchParams.delete('sslmode');
  const ssl = mode === '' || mode === 'disable' ? false : { rejectUnauthorized: false };
  return { connectionString: url.toString(), ssl };
}

// ─── Pool and schema ────────────────────────────────────────────────────────

// Read on every call rather than once at import: nothing here may run at build time, when
// there is no DATABASE_URL, and the setup page needs to know at request time.
export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type Db = { pool: Pool; schema?: Promise<void> };

// Kept on globalThis rather than in a module variable. Next.js can evaluate this module more
// than once in one process (once per bundle layer, and again on every edit under next dev), and
// each copy would open its own pool. One process, one pool.
const cache = globalThis as typeof globalThis & { guestbookDb?: Db };

function db(): Db {
  if (cache.guestbookDb) return cache.guestbookDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({
    ...pgConfig(connectionString),
    // Keep the pool small. An app that scales to several replicas multiplies this by the
    // replica count, and a managed instance has a connection cap.
    max: 5,
    // Fail a connection attempt after five seconds instead of waiting on the operating
    // system, so a page shows the waiting message and /healthz answers 503 promptly.
    connectionTimeoutMillis: 5000,
  });

  // A broken connection in the idle pool emits here. Without a listener it crashes the process.
  pool.on('error', (err) => console.error('idle database connection failed:', err.message));

  cache.guestbookDb = { pool };
  return cache.guestbookDb;
}

// Creating the table on first use is fine for one table and one replica. Past that, run
// migrations as a deliberate step instead: several replicas starting at once will race this.
async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guestbook_entries (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// The first caller starts the migration and everyone else awaits the same promise. A failure
// is forgotten rather than cached, so the next request tries again: a database that is briefly
// unreachable (a failover, a rotated password waiting for a redeploy) gets an explanation on
// the page instead of a crash, and the app recovers by itself when the database comes back.
async function ready(): Promise<Pool> {
  const state = db();
  state.schema ??= migrate(state.pool).then(
    () => console.log('database ready'),
    (err: unknown) => {
      state.schema = undefined;
      throw err;
    },
  );
  await state.schema;
  return state.pool;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export type Entry = {
  id: string; // BIGSERIAL arrives as a string: a JavaScript number cannot hold every int8
  name: string;
  message: string;
  created_at: Date;
};

export async function listEntries(): Promise<Entry[]> {
  const pool = await ready();
  const { rows } = await pool.query<Entry>(
    'SELECT id, name, message, created_at FROM guestbook_entries ORDER BY id DESC LIMIT 100',
  );
  return rows;
}

export async function addEntry(name: string, message: string): Promise<void> {
  const pool = await ready();
  // Parameterised, always. String-building a query with user input is how this kind of app
  // ends up owned.
  await pool.query('INSERT INTO guestbook_entries (name, message) VALUES ($1, $2)', [name, message]);
}

// For /healthz. Going through ready() means "healthy" includes "the table exists", so a
// database the app cannot create its table in is reported, not just one that is down.
export async function ping(): Promise<void> {
  const pool = await ready();
  await pool.query('SELECT 1');
}
