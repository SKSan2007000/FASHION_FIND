const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env.local
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

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runDirectAuthValidation() {
  console.log('\n========================================================');
  console.log('FASHIONFIND DIRECT DB & RBAC SECURITY VERIFICATION');
  console.log('========================================================\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || process.env.PGPASSWORD),
    database: process.env.DB_NAME || 'fashionfind_db',
  });
  await client.connect();

  // 1. Check Administrator Account
  const adminEmail = (process.env.ADMIN_EMAIL || 'sky@gmail.com').toLowerCase().trim();
  const adminQuery = await client.query(
    `SELECT u.id, u.email, u.role, u.email_verified, r.name as relational_role
     FROM public.users u
     LEFT JOIN public.user_roles ur ON u.id = ur.user_id
     LEFT JOIN public.roles r ON ur.role_id = r.id
     WHERE LOWER(u.email) = $1`,
    [adminEmail]
  );
  assert(adminQuery.rows.length > 0, `Admin account exists in database for ${adminEmail}`);
  const admin = adminQuery.rows[0];
  assert(admin.role === 'ADMIN', 'Admin user role in users table is ADMIN');
  assert(admin.relational_role === 'ADMIN', 'Admin user role in user_roles table is ADMIN');
  assert(admin.email_verified === true, 'Admin account email_verified is true');

  // 2. Check Roles Table
  const rolesQuery = await client.query('SELECT * FROM public.roles ORDER BY id ASC');
  assert(rolesQuery.rows.some((r) => r.name === 'USER'), 'Role USER exists');
  assert(rolesQuery.rows.some((r) => r.name === 'ADMIN'), 'Role ADMIN exists');

  // 3. Verify Verification Tokens Table
  const tokenTableCheck = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'verification_tokens'"
  );
  const colNames = tokenTableCheck.rows.map((r) => r.column_name);
  assert(colNames.includes('token_hash'), 'verification_tokens has token_hash column');
  assert(colNames.includes('token_type'), 'verification_tokens has token_type column');
  assert(colNames.includes('expires_at'), 'verification_tokens has expires_at column');
  assert(colNames.includes('used_at'), 'verification_tokens has used_at column');

  // 4. Verify Catalog Products in DB
  const prodQuery = await client.query('SELECT id, title, "affiliateUrl" FROM public.products');
  assert(prodQuery.rows.length >= 3, `Preserved genuine products in DB (${prodQuery.rows.length} found)`);
  for (const p of prodQuery.rows) {
    assert(p.affiliateUrl.startsWith('https://link.amazon/'), `Genuine affiliate URL preserved: ${p.affiliateUrl}`);
  }

  await client.end();

  console.log('\n========================================================');
  console.log(`DB VALIDATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runDirectAuthValidation().catch((err) => {
  console.error(err);
  process.exit(1);
});
