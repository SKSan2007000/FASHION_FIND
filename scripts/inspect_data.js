const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function inspectData() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const client = new Client({ host, port, user, password: String(password), database });
  await client.connect();

  console.log('--- ROLES ---');
  const roles = await client.query('SELECT * FROM public.roles');
  console.log(roles.rows);

  console.log('\n--- USERS ---');
  const users = await client.query('SELECT id, name, email, status, created_at FROM public.users');
  console.log(users.rows);

  console.log('\n--- USER_ROLES ---');
  const userRoles = await client.query('SELECT * FROM public.user_roles');
  console.log(userRoles.rows);

  console.log('\n--- PRODUCTS ---');
  const prods = await client.query('SELECT id, name, brand, category, affiliate_url FROM public.products');
  console.log(prods.rows);

  await client.end();
}

inspectData().catch(console.error);
