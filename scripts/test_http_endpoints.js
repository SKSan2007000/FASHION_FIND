const http = require('http');

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runHttpTests() {
  console.log('========================================================');
  console.log('FASHIONFIND END-TO-END HTTP INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  // 1. Homepage HTML & Elements
  console.log('--- 1. Testing Homepage (/) ---');
  const home = await fetchUrl('/');
  assert(home.status === 200, 'Homepage returns HTTP 200');
  assert(home.body.includes('FASHIONFIND'), 'Homepage contains FASHIONFIND branding');
  assert(home.body.includes('Choose My Fashion'), 'Homepage contains Choose My Fashion links');
  assert(home.body.includes('Explore The Catalog'), 'Homepage contains Explore The Catalog section');
  assert(home.body.includes('Transparent Affiliate Disclosure'), 'Homepage contains Affiliate Disclosure');

  // 2. Choose My Fashion Page (/style)
  console.log('\n--- 2. Testing Choose My Fashion (/style) ---');
  const style = await fetchUrl('/style');
  assert(style.status === 200, 'Choose My Fashion page returns HTTP 200');
  assert(style.body.includes('CHOOSE YOUR FASHION'), 'Page contains "CHOOSE YOUR FASHION" heading');
  assert(!style.body.includes('male-body.jpg'), 'No 3D/virtual try-on human models rendered');

  // 3. Products API (/api/products)
  console.log('\n--- 3. Testing Products API (/api/products) ---');
  const prodRes = await fetchUrl('/api/products');
  assert(prodRes.status === 200, 'Products API returns HTTP 200');
  const prodData = JSON.parse(prodRes.body);
  assert(prodData.products && prodData.products.length >= 3, 'Products API returns catalog products');
  for (const p of prodData.products) {
    assert(p.affiliateUrl && p.affiliateUrl.startsWith('https://link.amazon/'), `Exact affiliate URL preserved for ${p.id}`);
  }

  // 4. Recommendation API (/api/recommendations)
  console.log('\n--- 4. Testing Recommendations API (/api/recommendations) ---');
  const recRes = await fetchUrl('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      gender: 'MEN',
      occasion: 'Birthday',
      styleDirection: 'CASUAL',
    },
  });
  assert(recRes.status === 200, 'Recommendations API returns HTTP 200');
  const recData = JSON.parse(recRes.body);
  assert(recData.outfits && recData.outfits.length > 0, 'Recommendations returns outfit combinations');
  assert(recData.gender === 'MEN', 'Recommendations strictly match gender');

  // 5. Auth & RBAC Protection on Admin (/api/admin/*)
  console.log('\n--- 5. Testing RBAC Security on Admin Endpoints ---');
  const unauthAnalytics = await fetchUrl('/api/admin/analytics');
  assert(unauthAnalytics.status === 403, 'Unauthorized /api/admin/analytics access returns HTTP 403 Forbidden');

  const unauthProducts = await fetchUrl('/api/admin/products');
  assert(unauthProducts.status === 403, 'Unauthorized /api/admin/products access returns HTTP 403 Forbidden');

  const unauthAudit = await fetchUrl('/api/admin/audit-logs');
  assert(unauthAudit.status === 403, 'Unauthorized /api/admin/audit-logs access returns HTTP 403 Forbidden');

  // 6. User Registration & Role Self-Promotion Prevention
  console.log('\n--- 6. Testing User Registration & Self-Promotion Guard ---');
  const testEmail = `testuser-${Date.now()}@example.com`;
  const regRes = await fetchUrl('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: testEmail,
      password: 'UserSecurePassword123!',
      name: 'Regular User',
      role: 'ADMIN', // Malicious attempt to self-promote
    },
  });
  assert(regRes.status === 200, 'Registration succeeds');
  const regData = JSON.parse(regRes.body);
  assert(regData.user.role === 'USER', 'Role self-promotion to ADMIN strictly denied (assigned USER)');

  // 7. Product Detail Page (/product/[id])
  console.log('\n--- 7. Testing Product Detail Page ---');
  const detailRes = await fetchUrl('/product/jack-jones-12290084-mid-blue');
  assert(detailRes.status === 200, 'Product detail page returns HTTP 200');
  assert(detailRes.body.includes('Classic Mid Blue Regular Fit Shirt'), 'Detail page contains product title');
  assert(detailRes.body.includes('Verified Specifications'), 'Detail page contains specs table');

  // 8. Legal Pages (/privacy & /terms)
  console.log('\n--- 8. Testing Legal Pages ---');
  const privRes = await fetchUrl('/privacy');
  assert(privRes.status === 200, 'Privacy Policy returns HTTP 200');
  const termsRes = await fetchUrl('/terms');
  assert(termsRes.status === 200, 'Terms of Service returns HTTP 200');

  console.log('\n========================================================');
  console.log(`HTTP INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runHttpTests().catch((e) => {
  console.error('HTTP test error:', e);
  process.exit(1);
});
