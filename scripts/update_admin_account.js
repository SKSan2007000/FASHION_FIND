const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load .env.local
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

async function updateAdmin() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const targetEmail = 'bestsanthosh2007@gmail.com';
  const targetPassword = process.env.ADMIN_PASSWORD || 'Sky@20078';

  const client = new Client({ host, port, user, password: String(dbPassword), database });
  await client.connect();

  console.log('Connected to PostgreSQL database:', database);

  // 1. Hash password with bcrypt (12 rounds)
  const passwordHash = await bcrypt.hash(targetPassword, 12);
  console.log('Generated bcrypt hash (12 salt rounds).');

  // 2. Find the existing admin account or existing user with targetEmail
  const existingTarget = await client.query('SELECT id, email, role FROM public.users WHERE LOWER(email) = $1', [targetEmail]);
  const currentAdmin = await client.query("SELECT id, email, role FROM public.users WHERE role = 'ADMIN' OR email = 'sky@gmail.com' LIMIT 1");

  let adminId;
  if (existingTarget.rows.length > 0) {
    adminId = existingTarget.rows[0].id;
    console.log(`Found existing user with email ${targetEmail}, id: ${adminId}. Updating to ADMIN...`);
    await client.query(
      `UPDATE public.users 
       SET password_hash = $1, role = 'ADMIN', status = 'active', email_verified = true, updated_at = now()
       WHERE id = $2`,
      [passwordHash, adminId]
    );
  } else if (currentAdmin.rows.length > 0) {
    adminId = currentAdmin.rows[0].id;
    console.log(`Found existing admin account (previous email: ${currentAdmin.rows[0].email}, id: ${adminId}). Updating email to ${targetEmail}...`);
    await client.query(
      `UPDATE public.users 
       SET email = $1, password_hash = $2, role = 'ADMIN', status = 'active', email_verified = true, updated_at = now()
       WHERE id = $3`,
      [targetEmail, passwordHash, adminId]
    );
  } else {
    const crypto = require('crypto');
    adminId = crypto.randomUUID();
    console.log(`No admin account found. Creating new admin user with id: ${adminId}...`);
    await client.query(
      `INSERT INTO public.users (id, email, password_hash, name, role, status, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, 'Administrator', 'ADMIN', 'active', true, now(), now())`,
      [adminId, targetEmail, passwordHash]
    );
  }

  // 3. Ensure role mapping in user_roles table
  const roleRow = await client.query("SELECT id FROM public.roles WHERE name = 'ADMIN'");
  const adminRoleId = roleRow.rows[0]?.id || 2;

  await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [adminId]);
  await client.query('INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)', [adminId, adminRoleId]);
  console.log(`Assigned role_id ${adminRoleId} (ADMIN) in public.user_roles for user ${adminId}.`);

  // 4. Record Audit Log
  await client.query(
    `INSERT INTO public.audit_logs (actor_user_id, actor_email, action, resource_id, outcome, metadata, created_at)
     VALUES ($1::uuid, $2, 'ADMIN_UPDATED', $3, 'SUCCESS', '{"email":"${targetEmail}","role":"ADMIN"}'::jsonb, now())`,
    [adminId, targetEmail, adminId]
  );

  // 5. Verify user and password match
  const verifyRes = await client.query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.status, u.email_verified, r.name as role_name
     FROM public.users u
     LEFT JOIN public.user_roles ur ON u.id = ur.user_id
     LEFT JOIN public.roles r ON ur.role_id = r.id
     WHERE LOWER(u.email) = $1`,
    [targetEmail]
  );

  if (verifyRes.rows.length > 0) {
    const u = verifyRes.rows[0];
    const matches = await bcrypt.compare(targetPassword, u.password_hash);
    console.log('\n--- VERIFICATION ---');
    console.log('Admin ID:', u.id);
    console.log('Admin Email in DB:', u.email);
    console.log('Role in users table:', u.role);
    console.log('Role in user_roles join:', u.role_name);
    console.log('Account Status:', u.status);
    console.log('Email Verified:', u.email_verified);
    console.log('Password matches bcrypt hash:', matches);
  }

  // 6. Check existing products count to guarantee preservation
  const prodCount = await client.query('SELECT count(*)::int as count FROM public.products');
  console.log('Existing Products count in DB:', prodCount.rows[0].count);

  const userCount = await client.query('SELECT count(*)::int as count FROM public.users');
  console.log('Total Users count in DB:', userCount.rows[0].count);

  await client.end();
}

updateAdmin().catch((err) => {
  console.error('Error updating admin:', err);
  process.exit(1);
});
