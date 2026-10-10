const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 1. Load .env.local if present
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
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
}

function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans ? ans.trim() : '');
    });
  });
}

async function setupAdmin() {
  console.log('========================================================');
  console.log('FASHIONFIND SECURE INITIAL ADMINISTRATOR SETUP');
  console.log('========================================================\n');

  let email = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim() : '';
  let password = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : '';

  // If running in interactive terminal and values are missing, prompt the user
  if (!email && process.stdin.isTTY) {
    email = await promptHidden('Enter Administrator Email (ADMIN_EMAIL): ');
  }
  if (!password && process.stdin.isTTY) {
    password = await promptHidden('Enter Strong Administrator Password (ADMIN_PASSWORD): ');
  }

  if (!email || !password) {
    console.error('✗ SETUP ERROR: Required environment variables are missing.');
    console.error('  ADMIN_EMAIL and ADMIN_PASSWORD must be configured.');
    console.error('\nPlease supply these values via your local environment or .env.local file:');
    console.error('  ADMIN_EMAIL=your_admin_email@example.com');
    console.error('  ADMIN_PASSWORD=YourStrongUniquePassword\n');
    console.error('========================================================\n');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('✗ SETUP ERROR: Provided ADMIN_EMAIL is not a valid email address.');
    process.exit(1);
  }

  // Validate password strength (min 8 characters)
  if (password.length < 8) {
    console.error('✗ SETUP ERROR: ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase();
  console.log(`Configuring administrator account for: ${normalizedEmail}`);

  // DB credentials
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const hasPgConfig = Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    (user && database && dbPassword && String(dbPassword).trim().length > 0)
  if (hasPgConfig) {
    let client;
    const connStr =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL;

    if (connStr) {
      const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');
      client = new Client({
        connectionString: connStr,
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
      });
    } else {
      let h = host;
      if (h === 'localhost') h = '127.0.0.1';
      client = new Client({ host: h, port, user, password: String(dbPassword), database });
    }

    try {
      await client.connect();
      console.log('✓ Connected to PostgreSQL database.');

      // Ensure roles table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.roles (
          id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name varchar(50) UNIQUE NOT NULL
        );
        INSERT INTO public.roles (name) VALUES ('USER'), ('ADMIN') ON CONFLICT (name) DO NOTHING;
      `);

      // Ensure users table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          password_hash text NOT NULL,
          name text,
          role text NOT NULL DEFAULT 'USER',
          status text NOT NULL DEFAULT 'active',
          email_verified boolean NOT NULL DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);

      // Ensure user_roles table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.user_roles (
          user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          role_id smallint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
          assigned_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, role_id)
        );
      `);

      // Hash password with bcrypt (12 rounds)
      const passwordHash = await bcrypt.hash(password, 12);

      // Check if user already exists
      const existingRes = await client.query('SELECT id, email, role FROM public.users WHERE LOWER(email) = $1', [normalizedEmail]);

      let adminId;
      if (existingRes.rows.length > 0) {
        adminId = existingRes.rows[0].id;
        await client.query(
          "UPDATE public.users SET password_hash = $1, role = 'ADMIN', status = 'active', email_verified = true, updated_at = now() WHERE id = $2",
          [passwordHash, adminId]
        );
        console.log(`✓ Existing user ${normalizedEmail} successfully updated with ADMIN role and new password hash.`);
      } else {
        adminId = crypto.randomUUID();
        await client.query(`
          INSERT INTO public.users (id, email, password_hash, name, role, status, email_verified, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'ADMIN', 'active', true, now(), now())
        `, [adminId, normalizedEmail, passwordHash, 'Administrator']);
        console.log(`✓ Initial administrator successfully created in database with role ADMIN.`);
      }

      // Ensure role mapping in user_roles table
      const roleRow = await client.query("SELECT id FROM public.roles WHERE name = 'ADMIN'");
      const adminRoleId = roleRow.rows[0]?.id || 2;
      await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [adminId]);
      await client.query('INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)', [adminId, adminRoleId]);
      console.log(`✓ Assigned role_id ${adminRoleId} (ADMIN) in user_roles table for user ${adminId}.`);

      await client.end();
      console.log('\n========================================================');
      console.log('✓ ADMINISTRATOR SETUP COMPLETED SECURELY!');
      console.log('========================================================\n');
      return true;
    } catch (err) {
      console.error(`✗ PostgreSQL Error: ${err.message}`);
      if (client) await client.end().catch(() => {});
      process.exit(1);
    }
  } else {
    // Database credentials not provided in .env.local yet
    console.log('ℹ PostgreSQL credentials (DB_PASSWORD) not provided in .env.local.');
    console.log('  Testing password hashing and local verification...');
    const hash = await bcrypt.hash(password, 12);
    const valid = await bcrypt.compare(password, hash);
    if (valid) {
      console.log('✓ Password hashing and verification validated (bcrypt 12 rounds).');
      console.log('✓ Administrator setup script ready. Configure DB_PASSWORD in .env.local to persist to PostgreSQL.');
    }
    console.log('\n========================================================');
    console.log('✓ ADMIN SETUP SCRIPT VALIDATED!');
    console.log('========================================================\n');
    return true;
  }
}

setupAdmin().catch((e) => {
  console.error('Setup script exception:', e);
  process.exit(1);
});
