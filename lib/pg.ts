import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

// Helper to safely load .env.local if not already in process.env
function loadLocalEnv() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'fashionfind', '.env.local'),
    path.resolve(__dirname, '..', '.env.local'),
    path.resolve(__dirname, '..', '..', '.env.local'),
  ];
  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
            if (match && !process.env[match[1]]) {
              let val = match[2].trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              process.env[match[1]] = val;
            }
          }
        });
      } catch (e) {
        console.warn('Could not read .env.local from ' + envPath, e);
      }
    }
  }
}

loadLocalEnv();

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  if (pool) return pool;

  loadLocalEnv();

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: process.env.NODE_ENV === 'production' ? 4 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    return pool;
  }

  let host = process.env.DB_HOST || '127.0.0.1';
  if (host === 'localhost') host = '127.0.0.1'; // Ensure IPv4 loopback on Windows to avoid ::1 ECONNREFUSED
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  if (user && database && password !== undefined && String(password).trim().length > 0) {
    const config: PoolConfig = {
      host,
      port,
      database,
      user,
      password: String(password),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    return pool;
  }

  return null;
}

export function isPgConfigured(): boolean {
  loadLocalEnv();
  if (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL
  ) {
    return true;
  }
  const pwd = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;
  return Boolean(
    process.env.DB_USER &&
    process.env.DB_NAME &&
    pwd !== undefined &&
    pwd !== null &&
    String(pwd).trim().length > 0
  );
}

/**
 * Execute a parameterized query against PostgreSQL.
 */
export async function pgQuery<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const p = getPgPool();
  if (!p) {
    throw new Error('PostgreSQL is not configured in this environment.');
  }
  const res = await p.query(text, params);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}
