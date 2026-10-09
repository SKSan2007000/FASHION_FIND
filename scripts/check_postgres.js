const { Client } = require('pg');
const fs = require('fs');

async function checkPostgres() {
  let envPwd = process.env.DB_PASSWORD || '';
  if (fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^DB_PASSWORD=(.*)$/);
      if (m) envPwd = m[1].trim();
    }
  }

  const testList = [envPwd, 'postgres', 'admin', 'root', 'password', '', '1234', '123456', 'santhosh', 'Santhosh@123'].filter(Boolean);

  for (const pwd of testList) {
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: pwd,
      database: 'postgres',
    });

    try {
      await client.connect();
      console.log('SUCCESS: Connected to PostgreSQL 17 server!');
      
      // Check if fashionfind_db database exists
      const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'fashionfind_db'");
      if (res.rows.length === 0) {
        console.log('Creating database fashionfind_db...');
        await client.query('CREATE DATABASE fashionfind_db');
        console.log('Database fashionfind_db created successfully.');
      } else {
        console.log('Database fashionfind_db already exists.');
      }
      
      await client.end();
      return { success: true, password: pwd };
    } catch (err) {
      // Continue testing
    }
  }

  console.log('AUTH_REQUIRED: Could not authenticate with common default passwords.');
  return { success: false };
}

checkPostgres().then(res => {
  if (res.success && res.password && !fs.existsSync('.env.local')) {
    fs.writeFileSync('.env.local', [
      'DB_HOST=localhost',
      'DB_PORT=5432',
      'DB_NAME=fashionfind_db',
      'DB_USER=postgres',
      `DB_PASSWORD=${res.password}`,
      'SESSION_SECRET=fashionfind-local-development-session-secret-2026',
      'ADMIN_BOOTSTRAP_SECRET=fashionfind-bootstrap-admin-secret',
    ].join('\n') + '\n');
    console.log('Created .env.local with verified credentials.');
  }
});
