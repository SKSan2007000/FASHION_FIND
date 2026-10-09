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

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const client = new Client({ host, port, user, password: String(password), database });
  await client.connect();

  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'public.products'::regclass;
  `);
  console.log('Products constraints:');
  for (const r of res.rows) {
    console.log(`- ${r.conname}: ${r.def}`);
  }

  await client.end();
}

run().catch(console.error);
