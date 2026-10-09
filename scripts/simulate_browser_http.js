const http = require('http');
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

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('\n========================================================');
  console.log('FASHIONFIND RUNNING SERVER HTTP INTEGRATION VERIFICATION');
  console.log('========================================================\n');

  const adminEmail = env.ADMIN_EMAIL || 'sky@gmail.com';
  const adminPassword = env.ADMIN_PASSWORD || 'Sky@20078';

  // 1. Admin Login
  console.log('--- 1. Administrator Login & Session Verification ---');
  const loginPayload = JSON.stringify({ email: adminEmail, password: adminPassword });
  const loginRes = await httpRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    },
    loginPayload
  );

  assert(loginRes.statusCode === 200, `Admin login HTTP status is 200 OK`);
  const loginData = JSON.parse(loginRes.body);
  assert(loginData.user && loginData.user.role === 'ADMIN', 'Admin user payload role is ADMIN');

  const setCookies = loginRes.headers['set-cookie'] || [];
  let adminSessionCookie = '';
  for (const c of setCookies) {
    if (c.startsWith('fashionfind_session=')) {
      adminSessionCookie = c.split(';')[0];
    }
  }
  assert(!!adminSessionCookie, 'Session cookie fashionfind_session is set');

  // 2. Admin Session Inspection (/api/auth/me)
  console.log('\n--- 2. Admin Session Inspection (/api/auth/me) ---');
  const meRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      Cookie: adminSessionCookie,
    },
  });

  assert(meRes.statusCode === 200, `/api/auth/me status is 200 OK`);
  const meData = JSON.parse(meRes.body);
  assert(meData.authenticated === true, 'Session is authenticated');
  assert(meData.user.role === 'ADMIN', 'Session user role is ADMIN');
  assert(meData.user.email_verified === true, 'Admin account email is verified');

  // 3. Admin Protected API Access
  console.log('\n--- 3. Admin Access to Protected Control Endpoints ---');
  const productsRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/products',
    method: 'GET',
    headers: { Cookie: adminSessionCookie },
  });
  assert(productsRes.statusCode === 200, 'Admin accesses /api/admin/products (200 OK)');
  assert(JSON.parse(productsRes.body).products.length >= 3, 'Genuine catalog products retrieved');

  const usersRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { Cookie: adminSessionCookie },
  });
  assert(usersRes.statusCode === 200, 'Admin accesses /api/admin/users (200 OK)');
  const usersList = JSON.parse(usersRes.body).users;
  assert(Array.isArray(usersList) && usersList.length > 0, 'Registered user accounts retrieved');

  const analyticsRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/analytics',
    method: 'GET',
    headers: { Cookie: adminSessionCookie },
  });
  assert(analyticsRes.statusCode === 200, 'Admin accesses /api/admin/analytics (200 OK)');

  const auditRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/audit-logs',
    method: 'GET',
    headers: { Cookie: adminSessionCookie },
  });
  assert(auditRes.statusCode === 200, 'Admin accesses /api/admin/audit-logs (200 OK)');

  // 4. Admin HTML Page Access
  console.log('\n--- 4. Admin Dashboard Page (/admin) ---');
  const adminPageRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin',
    method: 'GET',
    headers: { Cookie: adminSessionCookie },
  });
  assert(adminPageRes.statusCode === 200, '/admin HTML page responds with 200 OK');

  // 5. Ordinary User Registration, Login & Denied Admin Access
  console.log('\n--- 5. Ordinary User Registration & Denied Admin Access (403) ---');
  const testUserEmail = `shopper-${Date.now()}@fashionfind.internal`;
  const regPayload = JSON.stringify({
    email: testUserEmail,
    password: 'ShopperPassword123!',
    confirmPassword: 'ShopperPassword123!',
    name: 'Regular Shopper',
  });

  const regRes = await httpRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(regPayload),
      },
    },
    regPayload
  );
  assert(regRes.statusCode === 200, 'Ordinary user registration succeeds');
  const regCookies = regRes.headers['set-cookie'] || [];
  let userSessionCookie = '';
  for (const c of regCookies) {
    if (c.startsWith('fashionfind_session=')) {
      userSessionCookie = c.split(';')[0];
    }
  }

  // Attempt Admin APIs as Ordinary User (Must ALL return 403 Forbidden)
  const userAdminProds = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/products',
    method: 'GET',
    headers: { Cookie: userSessionCookie },
  });
  assert(userAdminProds.statusCode === 403, 'Ordinary user blocked from /api/admin/products (403 Forbidden)');

  const userAdminUsers = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { Cookie: userSessionCookie },
  });
  assert(userAdminUsers.statusCode === 403, 'Ordinary user blocked from /api/admin/users (403 Forbidden)');

  const userAdminAna = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/analytics',
    method: 'GET',
    headers: { Cookie: userSessionCookie },
  });
  assert(userAdminAna.statusCode === 403, 'Ordinary user blocked from /api/admin/analytics (403 Forbidden)');

  const userAdminAudit = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/audit-logs',
    method: 'GET',
    headers: { Cookie: userSessionCookie },
  });
  assert(userAdminAudit.statusCode === 403, 'Ordinary user blocked from /api/admin/audit-logs (403 Forbidden)');

  // 6. Logout Flow
  console.log('\n--- 6. Logout & Session Cleared ---');
  const logoutRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { Cookie: userSessionCookie },
  });
  assert(logoutRes.statusCode === 200, 'Logout succeeds with 200 OK');
  const logoutCookies = logoutRes.headers['set-cookie'] || [];
  assert(logoutCookies.some((c) => c.includes('Max-Age=0') || c.includes('Expires=')), 'Session cookie cleared on logout');

  console.log('\n========================================================');
  console.log(`SERVER VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
