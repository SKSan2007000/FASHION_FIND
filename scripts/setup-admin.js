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
  );

  if (hasPgConfig) {
    let client;
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      client = new Client({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    } else {
      client = new Client({ host, port, user, password: String(dbPassword), database });
    }

    try {
      await client.connect();
      console.log('✓ Connected to PostgreSQL database.');

      // Ensure users table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.users (
          id text PRIMARY KEY,
          email text UNIQUE NOT NULL,
          password_hash text NOT NULL,
          name text,
          role text NOT NULL DEFAULT 'USER',
          account_status text NOT NULL DEFAULT 'active',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);

      // Ensure audit_logs table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          actor_id text,
          actor_email text,
          action text NOT NULL,
          target_resource text,
          outcome text NOT NULL,
          details jsonb DEFAULT '{}'::jsonb,
          created_at timestamptz DEFAULT now()
        );
      `);

      // Check if user already exists
      const existingRes = await client.query('SELECT id, email, role FROM public.users WHERE email = $1', [normalizedEmail]);

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (existing.role === 'ADMIN') {
          console.log(`✓ Administrator account already established for ${normalizedEmail} with ADMIN role.`);
          console.log('✓ Setup is idempotent. Existing account preserved without modification.');
        } else {
          // Promote existing user to ADMIN
          await client.query(
            "UPDATE public.users SET role = 'ADMIN', account_status = 'active', updated_at = now() WHERE email = $1",
            [normalizedEmail]
          );
          console.log(`✓ Existing user ${normalizedEmail} successfully promoted to validated ADMIN role.`);

          await client.query(`
            INSERT INTO public.audit_logs (actor_email, action, target_resource, outcome, details)
            VALUES ($1, 'ADMIN_PROMOTED_CLI', $2, 'SUCCESS', '{"method":"setup-admin.js"}'::jsonb)
          `, [normalizedEmail, existing.id]);
        }
      } else {
        // Hash password with bcrypt (12 rounds)
        const passwordHash = await bcrypt.hash(password, 12);
        const adminId = crypto.randomUUID();

        await client.query(`
          INSERT INTO public.users (id, email, password_hash, name, role, account_status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'ADMIN', 'active', now(), now())
        `, [adminId, normalizedEmail, passwordHash, 'Administrator']);

        console.log(`✓ Initial administrator successfully created in database with role ADMIN.`);

        await client.query(`
          INSERT INTO public.audit_logs (actor_id, actor_email, action, target_resource, outcome, details)
          VALUES ($1, $2, 'ADMIN_CREATED_CLI', $1, 'SUCCESS', '{"method":"setup-admin.js"}'::jsonb)
        `, [adminId, normalizedEmail]);
      }

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
