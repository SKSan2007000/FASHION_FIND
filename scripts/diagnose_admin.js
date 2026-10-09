const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
const content = fs.readFileSync(envPath, 'utf8');
const env = {};
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  }
});

async function check() {
  const client = new Client({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    user: env.DB_USER || 'postgres',
    password: String(env.DB_PASSWORD || env.PGPASSWORD),
    database: env.DB_NAME || 'fashionfind_db',
  });
  await client.connect();

  const adminEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPass = (env.ADMIN_PASSWORD || '').trim();

  const userRes = await client.query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.status, u.email_verified, r.name as role_name
     FROM public.users u
     LEFT JOIN public.user_roles ur ON u.id = ur.user_id
     LEFT JOIN public.roles r ON ur.role_id = r.id
     WHERE LOWER(u.email) = $1`,
    [adminEmail]
  );

  console.log('User found in DB:', userRes.rows.length);
  if (userRes.rows.length > 0) {
    const user = userRes.rows[0];
    console.log('User Email:', user.email);
    console.log('User Role in users table:', user.role);
    console.log('User Role in roles table (via user_roles):', user.role_name);
    console.log('User Status:', user.status);
    console.log('Email Verified:', user.email_verified);
    const matches = await bcrypt.compare(adminPass, user.password_hash);
    console.log('Password from .env.local matches DB hash?:', matches);
  }
  await client.end();
}
check().catch(console.error);
