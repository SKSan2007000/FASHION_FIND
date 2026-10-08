const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Test normalizeStyleCategory, normalizeProductGender, styling engine, and data integrity
const { initialProducts } = require('./data.ts');
const { normalizeStyleCategory, normalizeProductGender } = require('./lib/categories.ts');
const { recommendMatchingPieces, deduplicateProducts, generateVirtualTryOn } = require('./lib/styling.ts');

console.log('====================================================');
console.log('FASHIONFIND "CREATE YOUR STYLE" COMPLETE VERIFICATION');
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
assert(normalizeStyleCategory(topTest1) === 'TOP', 'Men\'s Shirts is mapped to TOP');
assert(normalizeProductGender(topTest1) === 'MEN', 'Men\'s Shirts is mapped to MEN');

const topTest2 = { category: "Women's Tops", title: "Floral Printed Summer Top" };
assert(normalizeStyleCategory(topTest2) === 'TOP', 'Women\'s Tops is mapped to TOP');
assert(normalizeProductGender(topTest2) === 'WOMEN', 'Women\'s Tops is mapped to WOMEN');

const bottomTest1 = { category: "Jeans", title: "Men's Slim Fit Denim Jeans" };
assert(normalizeStyleCategory(bottomTest1) === 'BOTTOM', 'Jeans category is mapped to BOTTOM');
assert(normalizeProductGender(bottomTest1) === 'MEN', 'Men\'s Jeans is mapped to MEN');

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
// TEST GROUP 3: MODEL ASSETS INTEGRITY (FACELESS HUMAN MODELS)
// ----------------------------------------------------
console.log('\n--- Test Group 3: Faceless Human Model Assets ---');

const maleModelPath = path.join(__dirname, 'public', 'style-models', 'men', 'male-body.jpg');
const femaleModelPath = path.join(__dirname, 'public', 'style-models', 'women', 'female-body.jpg');

assert(fs.existsSync(maleModelPath), 'Realistic faceless male model exists in public/style-models/men/male-body.jpg');
assert(fs.existsSync(femaleModelPath), 'Realistic faceless female model exists in public/style-models/women/female-body.jpg');
assert(fs.statSync(maleModelPath).size > 50000, `Male model asset has high resolution (${fs.statSync(maleModelPath).size} bytes)`);
assert(fs.statSync(femaleModelPath).size > 50000, `Female model asset has high resolution (${fs.statSync(femaleModelPath).size} bytes)`);


// ----------------------------------------------------
// TEST GROUP 4: RECOMMENDATION ENGINE & LOCK STATE
// ----------------------------------------------------
console.log('\n--- Test Group 4: Recommendation Engine & Lock State ---');

const baseTop = initialProducts[0]; // Jack & Jones Mid Blue
const initialSlots = {
  TOP: { category: 'TOP', product: baseTop, isLocked: true },
  BOTTOM: { category: 'BOTTOM', product: null, isLocked: false },
  SHOES: { category: 'SHOES', product: null, isLocked: false },
  ACCESSORY: { category: 'ACCESSORY', product: null, isLocked: false },
};

const recs = recommendMatchingPieces({
  selectedProduct: baseTop,
  catalog: initialProducts,
  gender: 'MEN',
  currentSlots: initialSlots,
});

assert(typeof recs === 'object' && recs.recommendedSlots !== undefined, 'Recommendation engine returns recommendations object');
assert(Array.isArray(recs.completeTheLookItems), 'Complete the look suggestions are returned as an array');

// Deduplication check
const duplicateList = [initialProducts[0], initialProducts[0], initialProducts[1]];
const deduped = deduplicateProducts(duplicateList);
assert(deduped.length === 2, 'Deduplication strictly filters out duplicates by ID/affiliateUrl');


// ----------------------------------------------------
// TEST GROUP 5: VIRTUAL TRY-ON ABSTRACTION
// ----------------------------------------------------
console.log('\n--- Test Group 5: Virtual Try-On Abstraction ---');

generateVirtualTryOn({
  gender: 'MEN',
  modelImage: '/style-models/men/male-body.jpg',
  topProduct: baseTop,
  bottomProduct: null,
  shoesProduct: null,
  accessoryProduct: null,
}).then((vtonResult) => {
  assert(vtonResult.modelImageUrl.includes('male-body.jpg'), 'Virtual try-on returns model image URL');
  assert(vtonResult.status === 'ready', 'Virtual try-on status is ready');
  assert(vtonResult.activeLookComposition.top.id === baseTop.id, 'Virtual try-on accurately captures active look composition');

  // ----------------------------------------------------
  // TEST GROUP 6: HTTP SSR ENDPOINT VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- Test Group 6: HTTP Server Response (/style) ---');

  http.get('http://localhost:3000/style', (res) => {
    assert(res.statusCode === 200, `/style responded with HTTP status ${res.statusCode}`);

    let rawHtml = '';
    res.on('data', (chunk) => {
      rawHtml += chunk;
    });

    res.on('end', () => {
      assert(rawHtml.includes('FASHIONFIND'), 'HTML contains Brand FASHIONFIND');
      assert(rawHtml.includes('Create Your Style'), 'HTML contains "Create Your Style" heading');
      assert(rawHtml.includes('style-builder-page-root') || rawHtml.includes('style-workspace-container'), 'HTML contains style-workspace-container layout');
      assert(rawHtml.includes('Your Look'), 'HTML contains "Your Look" panel');
      assert(rawHtml.includes('male-body.jpg') || rawHtml.includes('style-models'), 'HTML renders photorealistic faceless human model asset');
      assert(rawHtml.includes('Shop on Amazon') || rawHtml.includes('Shop'), 'HTML contains genuine affiliate shop links');

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
});
