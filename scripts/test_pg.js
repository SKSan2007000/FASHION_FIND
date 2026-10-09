const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
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

async function test() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || process.env.PGPASSWORD),
    database: process.env.DB_NAME || 'fashionfind_db',
  });
  await client.connect();
  const roles = await client.query('SELECT * FROM public.roles');
  console.log('Roles:', roles.rows);
  const users = await client.query('SELECT id, email, role, email_verified FROM public.users');
  console.log('Users:', users.rows);
  const userRoles = await client.query('SELECT * FROM public.user_roles');
  console.log('User Roles:', userRoles.rows);
  const tokens = await client.query('SELECT * FROM public.verification_tokens');
  console.log('Tokens count:', tokens.rows.length);
  await client.end();
}
test().catch(console.error);
