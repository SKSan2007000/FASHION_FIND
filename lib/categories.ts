import { Product } from '../data';

export type StyleCategory = 'TOP' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';

export interface CategoryInfo {
  id: StyleCategory;
  label: string;
  eyebrow: string;
  description: string;
  emptyLabel: string;
  required: boolean;
}

export const STYLE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'TOP',
    label: 'Top',
    eyebrow: 'Upper Body',
    description: 'Shirts, t-shirts, polos, kurtas & layers',
    emptyLabel: 'Choose a top to complete your look',
    required: true,
  },
  {
    id: 'BOTTOM',
    label: 'Bottom',
    eyebrow: 'Trousers & Denim',
    description: 'Jeans, chinos, trousers & shorts',
    emptyLabel: 'Choose bottoms to complete your look',
    required: true,
  },
  {
    id: 'SHOES',
    label: 'Shoes',
    eyebrow: 'Footwear',
    description: 'Sneakers, loafers, boots & sandals',
    emptyLabel: 'Choose shoes to complete your look',
    required: true,
  },
  {
    id: 'ACCESSORY',
    label: 'Accessory',
    eyebrow: 'Finishing Touches',
    description: 'Watches, belts, sunglasses & bags',
    emptyLabel: 'Accessory optional',
    required: false,
  },
];

/**
 * Normalizes any product into one of the four supported style-builder categories:
 * TOP, BOTTOM, SHOES, or ACCESSORY.
 * 
 * Strict categorization rules:
 * 1. Shoes/Footwear are identified first.
 * 2. Bottoms (jeans, pants, trousers, shorts, skirts, chinos) are identified next.
 *    IMPORTANT: A product classified as BOTTOM must NEVER appear in ACCESSORY.
 * 3. Accessories (watches, belts, sunglasses, bags, wallets, jewellery) are identified.
 * 4. Tops (shirts, t-shirts, polos, kurtas, jackets, hoodies) are identified.
 */
export function normalizeStyleCategory(
  product: Partial<Product> | null | undefined
): StyleCategory | null {
  if (!product) return null;

  const category = (product.category || '').toLowerCase().trim();
  const title = (product.title || '').toLowerCase().trim();
  const description = (product.description || '').toLowerCase().trim();
  const style = (product.style || '').toLowerCase().trim();
  const neck = (product.neck || '').toLowerCase().trim();
  const sleeve = (product.sleeve || '').toLowerCase().trim();

  // Extract specs values if present
  const specText = (product.specs || [])
    .map((s) => `${s.label}:${s.value}`)
    .join(' ')
    .toLowerCase();

  const allText = `${category} ${title} ${description} ${style} ${neck} ${sleeve} ${specText}`;

  // ----------------------------------------------------
  // RULE 1: SHOES / FOOTWEAR
  // ----------------------------------------------------
  if (
    /^(shoes|footwear|sneakers|sandals|loafers|boots|heels|flats|moccasins)$/i.test(category) ||
    /\b(shoes|footwear|sneakers|sneaker|loafers|loafer|boots|boot|sandals|sandal|slippers|slipper|oxford|derby|moccasin|moccasins|trainers|trainer|slip-on|flip-flop|heels|flats)\b/i.test(category) ||
    /\b(sneakers|sneaker|loafers|loafer|boots|boot|sandals|sandal|running shoes|leather shoes|casual shoes|formal shoes|oxford shoes|derby shoes|moccasins|derbys|oxfords)\b/i.test(title)
  ) {
    return 'SHOES';
  }

  // ----------------------------------------------------
  // RULE 2: BOTTOM (CRITICAL: Jeans/Pants must NEVER be Accessory)
  // ----------------------------------------------------
  if (
    /^(bottom|bottoms|jeans|pants|trousers|shorts|skirts|chinos|joggers|cargos|men's jeans|women's jeans|denim)$/i.test(category) ||
    /\b(jeans|jean|pants|pant|trousers|trouser|shorts|short|bottom|bottoms|skirt|skirts|cargo|cargos|chino|chinos|jogger|joggers|leggings|legging|trackpant|trackpants|denim pant)\b/i.test(category) ||
    /\b(jeans|jean|pants|pant|trousers|trouser|shorts|short|skirt|skirts|cargo pants|chino pants|joggers|track pants|denim jeans|slim jeans|regular jeans|tapered jeans|slim fit jeans)\b/i.test(title)
  ) {
    return 'BOTTOM';
  }

  // ----------------------------------------------------
  // RULE 3: ACCESSORY
  // ----------------------------------------------------
  if (
    /^(accessories|accessory|watch|watches|belt|belts|sunglasses|eyewear|wallet|wallets|bag|bags|jewellery|jewelry)$/i.test(category) ||
    /\b(accessory|accessories|watch|watches|belt|belts|sunglasses|sunglass|eyewear|shades|wallet|wallets|bag|bags|backpack|handbag|jewellery|jewelry|bracelet|necklace|ring|earring|earrings|cap|caps|hat|hats|scarf|tie|cufflinks|pocket square)\b/i.test(category) ||
    /\b(chronograph watch|analog watch|digital watch|leather belt|reversible belt|aviator sunglasses|polarized sunglasses|leather wallet|crossbody bag|tote bag|backpack|cufflinks|pendant|bracelet)\b/i.test(title)
  ) {
    return 'ACCESSORY';
  }

  // ----------------------------------------------------
  // RULE 4: TOP
  // ----------------------------------------------------
  if (
    /^(men's shirts|women's tops|shirts|shirt|top|tops|t-shirts|tshirt|t-shirt|polo|polos|kurtas|kurta|kurti|hoodies|hoodie|jackets|jacket|sweaters|sweater|sweatshirts|sweatshirt)$/i.test(category) ||
    /\b(shirt|shirts|t-shirt|t-shirts|tshirt|tshirts|top|tops|kurta|kurtas|kurti|kurtis|polo|polos|hoodie|hoodies|jacket|jackets|sweater|sweaters|sweatshirt|sweatshirts|blazer|blazers|cardigan|cardigans|tee|tees|vest|waistcoat)\b/i.test(category) ||
    /\b(shirt|shirts|t-shirt|t-shirts|tshirt|tshirts|top|tops|kurta|kurtas|kurti|kurtis|polo|polos|hoodie|hoodies|jacket|jackets|sweater|sweaters|sweatshirt|sweatshirts|blazer|blazers|cardigan|cardigans|tee|tees)\b/i.test(title)
  ) {
    return 'TOP';
  }

  // ----------------------------------------------------
  // SECONDARY FALLBACK: Broader contextual matching
  // (Order strictly preserved: SHOES -> BOTTOM -> ACCESSORY -> TOP)
  // ----------------------------------------------------
  if (/\b(sneaker|loafer|boots|shoes|footwear|sandal|oxford)\b/i.test(allText)) {
    return 'SHOES';
  }
  if (/\b(jeans|trouser|pants|shorts|chino|cargo|bottom|skirt)\b/i.test(allText)) {
    return 'BOTTOM';
  }
  if (/\b(watch|sunglass|belt|wallet|handbag|backpack|jewellery|jewelry)\b/i.test(allText)) {
    return 'ACCESSORY';
  }
  if (/\b(shirt|t-shirt|tshirt|polo|kurta|jacket|hoodie|sweater|top)\b/i.test(allText)) {
    return 'TOP';
  }

  return null;
}

export type ProductGender = 'MEN' | 'WOMEN';

/**
 * Normalizes product gender based on category, title, description, and specs.
 */
export function normalizeProductGender(
  product: Partial<Product> | null | undefined
): ProductGender {
  if (!product) return 'MEN';

  const category = (product.category || '').toLowerCase();
  const title = (product.title || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const specs = (product.specs || []).map((s) => `${s.label}:${s.value}`).join(' ').toLowerCase();
  const allText = `${category} ${title} ${description} ${specs}`;

  if (/\b(women|women's|woman|ladies|lady|female|girls|girl|kurti|saree|lehenga|skirt|blouse)\b/i.test(allText)) {
    return 'WOMEN';
  }

  return 'MEN';
}
