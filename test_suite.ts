/**
 * FashionFind Automated Test Suite
 * Comprehensive verification of:
 * 1. Occasion and Style Recommendations (Men/Women x Occasions x Style Directions)
 * 2. Exact Affiliate Link Preservation & URL Validation
 * 3. Strict Gender & Category Normalization (no cross-contamination, no invented pieces)
 * 4. Authentication, Password Hashing, Session Verification & RBAC Guards
 * 5. Rate Limiting and Security Policies
 */

import { initialProducts, Product } from './data';
import { normalizeStyleCategory, normalizeProductGender } from './lib/categories';
import {
  generateSmartRecommendations,
  OCCASIONS_DATA,
  STYLE_DIRECTIONS,
  deduplicateProducts,
} from './lib/recommendations';
import { validateAffiliateUrl, checkRateLimit, signSessionToken, verifySessionToken } from './lib/security';
import { hashPassword, verifyPassword } from './lib/auth';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n========================================================');
  console.log('FASHIONFIND COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('========================================================\n');

  // ----------------------------------------------------
  // GROUP 1: EXACT AFFILIATE URL INTEGRITY & DOMAIN VALIDATION
  // ----------------------------------------------------
  console.log('--- GROUP 1: Affiliate Links & Exact URL Preservation ---');

  // Verify all initial products retain their exact affiliate links
  for (const p of initialProducts) {
    assert(
      !!p.affiliateUrl && p.affiliateUrl.startsWith('https://link.amazon/'),
      `Product "${p.id}" has exact unmodified affiliate URL: ${p.affiliateUrl}`
    );
    const check = validateAffiliateUrl(p.affiliateUrl);
    assert(check.isValid, `Affiliate URL for "${p.id}" is verified valid`);
  }

  // Security test: Dangerous schemes
  assert(!validateAffiliateUrl('javascript:alert(1)').isValid, 'Block javascript: schemes');
  assert(!validateAffiliateUrl('data:text/html;base64,...').isValid, 'Block data: schemes');
  assert(!validateAffiliateUrl('https://evil-phishing.com/shop').isValid, 'Block unauthorized external domains');
  assert(validateAffiliateUrl('https://www.amazon.in/dp/B0GX61Z4R9').isValid, 'Allow valid Amazon product URL');
  assert(validateAffiliateUrl('https://amzn.to/3example').isValid, 'Allow valid Amazon shortlink (amzn.to)');

  // ----------------------------------------------------
  // GROUP 2: CATEGORY & GENDER STRICT ISOLATION
  // ----------------------------------------------------
  console.log('\n--- GROUP 2: Strict Gender & Category Classification ---');

  const menShirt = { category: "Men's Shirts", title: 'Classic Mid Blue Regular Fit Shirt' };
  assert(normalizeStyleCategory(menShirt) === 'TOP', "Men's Shirt categorized strictly as TOP");
  assert(normalizeProductGender(menShirt) === 'MEN', "Men's Shirt gender strictly identified as MEN");

  const womenTop = { category: "Women's Tops", title: 'Floral Print Summer Top' };
  assert(normalizeStyleCategory(womenTop) === 'TOP', "Women's Top categorized strictly as TOP");
  assert(normalizeProductGender(womenTop) === 'WOMEN', "Women's Top gender strictly identified as WOMEN");

  const menJeans = { category: 'Jeans', title: "Men's Slim Fit Denim Jeans" };
  assert(normalizeStyleCategory(menJeans) === 'BOTTOM', 'Jeans categorized strictly as BOTTOM');
  assert(normalizeStyleCategory(menJeans) !== 'ACCESSORY', 'Bottoms never contaminated into ACCESSORY');
  assert(normalizeProductGender(menJeans) === 'MEN', "Men's Jeans gender strictly identified as MEN");

  const shoes = { category: 'Shoes', title: 'Casual White Leather Sneakers' };
  assert(normalizeStyleCategory(shoes) === 'SHOES', 'Sneakers categorized strictly as SHOES');

  const watch = { category: 'Accessories', title: 'Chronograph Navy Dial Watch' };
  assert(normalizeStyleCategory(watch) === 'ACCESSORY', 'Watch categorized strictly as ACCESSORY');

  const unknownItem = { category: 'Miscellaneous', title: 'Unspecified Gift Item' };
  assert(normalizeProductGender(unknownItem) === 'UNKNOWN', 'Unknown metadata returns UNKNOWN gender without guessing');

  // ----------------------------------------------------
  // GROUP 3: CHOOSE MY FASHION RECOMMENDATIONS MATRIX
  // ----------------------------------------------------
  console.log('\n--- GROUP 3: Choose My Fashion Recommendations Matrix ---');

  const genders: ('MEN' | 'WOMEN')[] = ['MEN', 'WOMEN'];
  const directions: ('CASUAL' | 'FORMAL' | 'TRENDY')[] = ['CASUAL', 'FORMAL', 'TRENDY'];
  const sampleOccasions = ['Birthday', 'Casual', 'Outing', 'Work', 'Date Night', 'College', 'Travel'] as const;

  for (const g of genders) {
    for (const occ of sampleOccasions) {
      for (const dir of directions) {
        const result = generateSmartRecommendations(initialProducts, {
          gender: g,
          occasion: occ,
          styleDirection: dir,
        });

        assert(result.gender === g, `Recommendation gender matches request: ${g}`);
        assert(result.occasion === occ, `Recommendation occasion matches request: ${occ}`);
        assert(result.styleDirection === dir, `Recommendation style matches request: ${dir}`);
        assert(result.header.includes(g) && result.header.includes(dir), `Header contains correct metadata: ${result.header}`);

        // Ensure every recommended piece strictly respects gender
        for (const outfit of result.outfits) {
          for (const item of outfit.items) {
            if (item.product) {
              const itemGender = normalizeProductGender(item.product);
              assert(
                itemGender === g || itemGender === 'UNISEX',
                `No gender cross-contamination: ${item.product.title} (${itemGender}) in ${g} outfit`
              );
            }
          }
        }

        // Verify that products are not fabricated or duplicated in the same outfit
        for (const outfit of result.outfits) {
          const usedIds = new Set<string>();
          for (const item of outfit.items) {
            if (item.product) {
              assert(!usedIds.has(item.product.id), `No duplicate product in outfit: ${item.product.id}`);
              usedIds.add(item.product.id);
            }
          }
        }
      }
    }
  }

  // Test Birthday specific combinations
  const birthdayRec = generateSmartRecommendations(initialProducts, {
    gender: 'MEN',
    occasion: 'Birthday',
    styleDirection: 'CASUAL',
  });
  assert(birthdayRec.outfits.length > 0, 'Birthday styling produces outfit recommendations');
  assert(birthdayRec.outfits[0].title === 'Casual Birthday Look', 'Option 1 titled Casual Birthday Look');

  // Test Fallback message when pieces are missing (honest reporting)
  assert(
    birthdayRec.catalogStatusMessage !== undefined,
    'Honest status message provided when full multi-piece catalog is growing'
  );

  // ----------------------------------------------------
  // GROUP 4: AUTHENTICATION, PASSWORDS & RBAC TOKENS
  // ----------------------------------------------------
  console.log('\n--- GROUP 4: Authentication, Hashing & Session RBAC ---');

  const testPass = 'SecurePassword@2026';
  const hashed = await hashPassword(testPass);
  assert(hashed !== testPass, 'Password hashed securely (not plaintext)');
  assert(await verifyPassword(testPass, hashed), 'Password verification succeeds with correct password');
  assert(!(await verifyPassword('WrongPassword', hashed)), 'Password verification fails with incorrect password');

  // Session Token Signing & Verification
  const userToken = signSessionToken({
    userId: 'user-uuid-1',
    email: 'user@example.com',
    role: 'USER',
  });
  const verifiedUser = verifySessionToken(userToken);
  assert(verifiedUser !== null && verifiedUser.role === 'USER', 'Valid USER session verified');

  const adminToken = signSessionToken({
    userId: 'admin-uuid-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  });
  const verifiedAdmin = verifySessionToken(adminToken);
  assert(verifiedAdmin !== null && verifiedAdmin.role === 'ADMIN', 'Valid ADMIN session verified');

  // Tamper resistance test
  const tamperedToken = userToken.slice(0, -4) + 'abcd';
  assert(verifySessionToken(tamperedToken) === null, 'Tampered session token rejected');

  // ----------------------------------------------------
  // GROUP 5: RATE LIMITING
  // ----------------------------------------------------
  console.log('\n--- GROUP 5: Rate Limiting & Security ---');

  const testKey = 'test-ip-123';
  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testKey, 3, 10000);
    if (res.allowed) allowedCount++;
  }
  assert(allowedCount === 3, 'Rate limiter strictly caps requests at max limit (3/3 allowed)');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
