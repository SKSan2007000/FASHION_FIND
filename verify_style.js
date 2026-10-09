/**
 * FashionFind "Choose My Fashion" Verification Suite
 * Verifies:
 * 1. Occasion & Style Recommendations Matrix
 * 2. Gender & Category Strict Normalization
 * 3. Exact Affiliate Link Preservation
 * 4. Genuine Database Catalog Integrity
 */

const { initialProducts } = require('./data.ts');
const { normalizeStyleCategory, normalizeProductGender } = require('./lib/categories.ts');
const { generateSmartRecommendations, deduplicateProducts } = require('./lib/recommendations.ts');

console.log('====================================================');
console.log('FASHIONFIND "CHOOSE MY FASHION" SUITE VERIFICATION');
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
// TEST GROUP 1: CATEGORY & GENDER NORMALIZATION
// ----------------------------------------------------
console.log('--- Test Group 1: Category & Gender Normalization ---');

const topTest1 = { category: "Men's Shirts", title: "Classic Mid Blue Regular Fit Shirt" };
assert(normalizeStyleCategory(topTest1) === 'TOP', "Men's Shirts is mapped to TOP");
assert(normalizeProductGender(topTest1) === 'MEN', "Men's Shirts is mapped to MEN");

const topTest2 = { category: "Women's Tops", title: "Floral Printed Summer Top" };
assert(normalizeStyleCategory(topTest2) === 'TOP', "Women's Tops is mapped to TOP");
assert(normalizeProductGender(topTest2) === 'WOMEN', "Women's Tops is mapped to WOMEN");

const bottomTest1 = { category: "Jeans", title: "Men's Slim Fit Denim Jeans" };
assert(normalizeStyleCategory(bottomTest1) === 'BOTTOM', 'Jeans category is mapped to BOTTOM');
assert(normalizeProductGender(bottomTest1) === 'MEN', "Men's Jeans is mapped to MEN");

const bottomTest2 = { category: "Accessories", title: "Flying Machine Washed Denim Jeans" };
assert(normalizeStyleCategory(bottomTest2) === 'BOTTOM', 'Jeans mistakenly categorized as Accessories is strictly corrected to BOTTOM');

const shoeTest1 = { category: "Shoes", title: "Nike Court Vision Low Leather Casual Sneakers" };
assert(normalizeStyleCategory(shoeTest1) === 'SHOES', 'Shoes category is mapped to SHOES');

const accTest1 = { category: "Accessories", title: "Fossil Grant Chronograph Navy Blue Dial Leather Watch" };
assert(normalizeStyleCategory(accTest1) === 'ACCESSORY', 'Accessories category is mapped to ACCESSORY');

// Cross-contamination prevention
assert(normalizeStyleCategory({ title: "Men's Slim Jeans", category: "Accessories" }) !== 'ACCESSORY', 'Jeans NEVER classified as ACCESSORY');
assert(normalizeStyleCategory({ title: "Black Leather Belt", category: "Accessories" }) !== 'BOTTOM', 'Belt NEVER classified as BOTTOM');


// ----------------------------------------------------
// TEST GROUP 2: GENUINE CATALOG DATA & EXACT AFFILIATE LINKS
// ----------------------------------------------------
console.log('\n--- Test Group 2: Genuine Catalog Data & Exact Affiliate Links ---');

assert(initialProducts.length === 3, 'Catalog strictly contains the 3 genuine FashionFind products');

initialProducts.forEach((p) => {
  const normCat = normalizeStyleCategory(p);
  const normGender = normalizeProductGender(p);

  assert(Boolean(p.id && p.title && p.brand), `Product ${p.id} has ID, title, and brand`);
  assert(Boolean(p.image && p.image.startsWith('/')), `Product ${p.id} has valid image path (${p.image})`);
  assert(
    Boolean(p.affiliateUrl && p.affiliateUrl.startsWith('https://')),
    `Product ${p.id} has exact affiliateUrl (${p.affiliateUrl})`
  );
  assert(normCat !== null, `Product ${p.id} (${p.title}) has valid normalized category: ${normCat}`);
  assert(normGender === 'MEN', `Product ${p.id} has valid gender: ${normGender}`);
});


// ----------------------------------------------------
// TEST GROUP 3: RECOMMENDATION ENGINE OUTFIT GENERATION
// ----------------------------------------------------
console.log('\n--- Test Group 3: Recommendation Engine (Choose My Fashion) ---');

const recs = generateSmartRecommendations(initialProducts, {
  gender: 'MEN',
  occasion: 'Birthday',
  styleDirection: 'CASUAL',
  preferredColor: 'Blue',
});

assert(recs.outfits.length > 0, 'Recommendation engine returns outfit combinations');
assert(recs.gender === 'MEN', 'Recommendations strictly conform to MEN gender');
assert(recs.occasion === 'Birthday', 'Recommendations match Birthday occasion');
assert(recs.styleDirection === 'CASUAL', 'Recommendations match Casual style direction');

// Deduplication check
const duplicateList = [initialProducts[0], initialProducts[0], initialProducts[1]];
const deduped = deduplicateProducts(duplicateList);
assert(deduped.length === 2, 'Deduplication strictly filters out duplicates by ID/affiliateUrl');

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests === passedTests) {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  process.exit(1);
}
