const http = require('http');

// 1. Test normalizeStyleCategory and data integrity
const { initialProducts } = require('./data.ts');
const { normalizeStyleCategory } = require('./lib/categories.ts');

console.log('====================================================');
console.log('FASHIONFIND "CREATE MY STYLE" VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${message}`);
  }
}

// ----------------------------------------------------
// TEST GROUP 1: CATEGORY NORMALIZATION & CROSS-CONTAMINATION
// ----------------------------------------------------
console.log('--- Test Group 1: Category Normalization ---');

const topTest1 = { category: "Men's Shirts", title: "Classic Mid Blue Regular Fit Shirt" };
assert(normalizeStyleCategory(topTest1) === 'TOP', 'Men\'s Shirts is mapped to TOP');

const topTest2 = { category: "Women's Tops", title: "Floral Printed Summer Top" };
assert(normalizeStyleCategory(topTest2) === 'TOP', 'Women\'s Tops is mapped to TOP');

const topTest3 = { category: "Men", title: "HIGHLANDER Solid Mandarin Collar Shirt" };
assert(normalizeStyleCategory(topTest3) === 'TOP', 'Mandarin Collar Shirt with "Men" category is mapped to TOP');

const bottomTest1 = { category: "Jeans", title: "Levi's 511 Slim Fit Stretch Denim Jeans" };
assert(normalizeStyleCategory(bottomTest1) === 'BOTTOM', 'Jeans category is mapped to BOTTOM');

const bottomTest2 = { category: "Accessories", title: "Flying Machine Washed Denim Jeans" };
assert(normalizeStyleCategory(bottomTest2) === 'BOTTOM', 'CRITICAL: Denim Jeans with "Accessories" category is strictly corrected to BOTTOM');

const bottomTest3 = { category: "Men", title: "Classic Khaki Casual Chino Pants" };
assert(normalizeStyleCategory(bottomTest3) === 'BOTTOM', 'Chino Pants with "Men" category is mapped to BOTTOM');

const shoeTest1 = { category: "Shoes", title: "Nike Court Vision Low Leather Casual Sneakers" };
assert(normalizeStyleCategory(shoeTest1) === 'SHOES', 'Shoes category is mapped to SHOES');

const shoeTest2 = { category: "Men", title: "Red Tape Handcrafted Genuine Leather Moccasin Loafers" };
assert(normalizeStyleCategory(shoeTest2) === 'SHOES', 'Loafers with "Men" category is mapped to SHOES');

const accTest1 = { category: "Accessories", title: "Fossil Grant Chronograph Navy Blue Dial Leather Watch" };
assert(normalizeStyleCategory(accTest1) === 'ACCESSORY', 'Accessories category is mapped to ACCESSORY');

const accTest2 = { category: "Accessories", title: "Ray-Ban Classic Aviator Sunglasses" };
assert(normalizeStyleCategory(accTest2) === 'ACCESSORY', 'Aviator Sunglasses is mapped to ACCESSORY');

// Verify Bottom never contaminates Accessory
assert(normalizeStyleCategory({ title: "Men's Slim Jeans", category: "Accessories" }) !== 'ACCESSORY', 'Jeans NEVER classified as ACCESSORY');
assert(normalizeStyleCategory({ title: "Black Leather Belt", category: "Accessories" }) !== 'BOTTOM', 'Belt NEVER classified as BOTTOM');


// ----------------------------------------------------
// TEST GROUP 2: CATALOG DATA & AFFILIATE URL INTEGRITY
// ----------------------------------------------------
console.log('\n--- Test Group 2: Catalog Data & Affiliate Links ---');

const categoriesFound = new Set();

initialProducts.forEach((p) => {
  const normCat = normalizeStyleCategory(p);
  categoriesFound.add(normCat);

  assert(Boolean(p.id && p.title && p.brand), `Product ${p.id} has ID, title, and brand`);
  assert(Boolean(p.image && p.image.startsWith('/')), `Product ${p.id} has valid image path (${p.image})`);
  assert(
    Boolean(p.affiliateUrl && p.affiliateUrl.startsWith('https://')),
    `Product ${p.id} has valid affiliateUrl (${p.affiliateUrl})`
  );
  assert(normCat !== null, `Product ${p.id} (${p.title}) has valid normalized category: ${normCat}`);
});

assert(categoriesFound.has('TOP'), 'Catalog contains TOP products');
assert(categoriesFound.has('BOTTOM'), 'Catalog contains BOTTOM products');
assert(categoriesFound.has('SHOES'), 'Catalog contains SHOES products');
assert(categoriesFound.has('ACCESSORY'), 'Catalog contains ACCESSORY products');


// ----------------------------------------------------
// TEST GROUP 3: HTTP SSR ENDPOINT VERIFICATION
// ----------------------------------------------------
console.log('\n--- Test Group 3: HTTP Server Response (/style) ---');

http.get('http://localhost:3000/style', (res) => {
  assert(res.statusCode === 200, `/style responded with HTTP status ${res.statusCode}`);

  let rawHtml = '';
  res.on('data', (chunk) => {
    rawHtml += chunk;
  });

  res.on('end', () => {
    assert(rawHtml.includes('FASHIONFIND'), 'HTML contains Brand FASHIONFIND');
    assert(rawHtml.includes('Create Your Style') || rawHtml.includes('Create Your'), 'HTML contains "Create Your Style" heading');
    assert(rawHtml.includes('stylePageRoot') || rawHtml.includes('styleContainer'), 'HTML contains styleContainer layout wrapper');
    assert(rawHtml.includes('Your Look') || rawHtml.includes('Your Complete'), 'HTML contains preview and summary sections');

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('====================================================');
    if (totalTests === passedTests) {
      console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Request failed:', err.message);
  process.exit(1);
});
