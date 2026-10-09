import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

// Helper to safely load .env.local if not already in process.env
function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
          if (match && !process.env[match[1]]) {
            // Strip optional quotes
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            process.env[match[1]] = val;
          }
        }
      });
    } catch (e) {
      console.warn('Could not read .env.local:', e);
    }
  }
}

loadLocalEnv();

const hasDirectPg = Boolean(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  (process.env.DB_USER && process.env.DB_NAME && (process.env.DB_PASSWORD !== undefined || process.env.PGPASSWORD !== undefined))
);

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  if (pool) return pool;

  loadLocalEnv();

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    return pool;
  }

  const host = process.env.DB_HOST || 'localhost';
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
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return true;
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
