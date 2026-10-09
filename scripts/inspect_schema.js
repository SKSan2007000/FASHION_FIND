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

async function inspectSchema() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const client = new Client({ host, port, user, password: String(password), database });
  await client.connect();
  console.log('Connected to PostgreSQL to inspect schema...\n');

  // List all tables
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables in public schema:', tables.rows.map(r => r.table_name));

  for (const row of tables.rows) {
    const tableName = row.table_name;
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    console.log(`\nTable: ${tableName}`);
    for (const c of cols.rows) {
      console.log(`  - ${c.column_name} (${c.data_type}) nullable=${c.is_nullable} default=${c.column_default}`);
    }

    // Row count
    const countRes = await client.query(`SELECT COUNT(*)::int as count FROM public."${tableName}"`);
    console.log(`  Total rows: ${countRes.rows[0].count}`);
  }

  await client.end();
}

inspectSchema().catch((err) => {
  console.error('Error inspecting schema:', err);
  process.exit(1);
});
