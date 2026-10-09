import { Product, ProductGender } from '../data';
import { StyleCategory, normalizeStyleCategory, normalizeProductGender } from './categories';

export type OccasionType =
  | 'Casual'
  | 'Outing'
  | 'Birthday'
  | 'Date Night'
  | 'Party'
  | 'College'
  | 'Work'
  | 'Travel'
  | 'Brunch'
  | 'Wedding'
  | 'Festive'
  | 'Dinner';

export type StyleDirection = 'CASUAL' | 'FORMAL' | 'TRENDY';

export interface StylePreferenceInput {
  gender: 'MEN' | 'WOMEN';
  occasion: OccasionType;
  styleDirection: StyleDirection;
  preferredColor?: string;
  skinTone?: string;
  budget?: string;
  specificPreference?: string; // 'Shorts' | 'Jeans' | 'Trousers' | 'Sneakers' | 'Formal shoes'
}

export interface OutfitCombination {
  id: string;
  title: string;
  subtitle: string;
  styleDirection: StyleDirection;
  explanation: string;
  items: {
    category: StyleCategory;
    product: Product | null;
  }[];
  top: Product | null;
  bottom: Product | null;
  shoes: Product | null;
  accessory: Product | null;
  totalPriceText: string | null;
  isComplete: boolean;
  missingCategories: StyleCategory[];
}

export interface RecommendationResult {
  header: string; // e.g. "MEN · BIRTHDAY · CASUAL"
  gender: 'MEN' | 'WOMEN';
  occasion: OccasionType;
  styleDirection: StyleDirection;
  outfits: OutfitCombination[];
  catalogStatusMessage?: string;
}

export const OCCASIONS_DATA: {
  id: OccasionType;
  name: string;
  eyebrow: string;
  description: string;
  icon: string;
}[] = [
  { id: 'Casual', name: 'Casual', eyebrow: 'Everyday', description: 'Relaxed shirts, clean tees and effortless comfortable styling.', icon: 'Coffee' },
  { id: 'Outing', name: 'Outing', eyebrow: 'Friends & City', description: 'Effortless, sharp styles tailored for social plans and weekend meetups.', icon: 'Compass' },
  { id: 'Birthday', name: 'Birthday', eyebrow: 'Celebration', description: 'Celebrate in a standout look with polished layers and refined details.', icon: 'Sparkles' },
  { id: 'Date Night', name: 'Date Night', eyebrow: 'Evening Romance', description: 'Refined, subtle evening styles with sophisticated color palettes.', icon: 'Heart' },
  { id: 'Party', name: 'Party', eyebrow: 'Nightlife & Events', description: 'Fashion-forward, high-energy attire that commands attention.', icon: 'PartyPopper' },
  { id: 'College', name: 'College', eyebrow: 'Campus Daily', description: 'Youthful, breathable and versatile combinations for everyday campus life.', icon: 'GraduationCap' },
  { id: 'Work', name: 'Work', eyebrow: 'Office & Meetings', description: 'Polished professional outfits built for confidence and boardroom presence.', icon: 'Briefcase' },
  { id: 'Travel', name: 'Travel', eyebrow: 'Transit & Adventure', description: 'Comfortable, crease-resistant and practical combinations for transit.', icon: 'Plane' },
  { id: 'Brunch', name: 'Brunch', eyebrow: 'Daytime Social', description: 'Breezy, elevated daytime casuals in relaxed linens and light tones.', icon: 'Sun' },
  { id: 'Wedding', name: 'Wedding', eyebrow: 'Ceremony', description: 'Distinguished formal attire suitable for celebratory wedding occasions.', icon: 'Crown' },
  { id: 'Festive', name: 'Festive', eyebrow: 'Tradition & Joy', description: 'Vibrant, rich styles celebrating tradition, heritage and festivals.', icon: 'Flame' },
  { id: 'Dinner', name: 'Dinner', eyebrow: 'Evening Dining', description: 'Smart, sophisticated dining combinations for fine food and great company.', icon: 'Utensils' },
];

export const STYLE_DIRECTIONS: {
  id: StyleDirection;
  title: string;
  tagline: string;
  description: string;
}[] = [
  {
    id: 'CASUAL',
    title: 'Casual',
    tagline: 'Relaxed & Everyday',
    description: 'Relaxed shirts, T-shirts, jeans, shorts, comfortable footwear and everyday combinations.',
  },
  {
    id: 'FORMAL',
    title: 'Formal',
    tagline: 'Tailored & Sophisticated',
    description: 'Formal shirts, trousers, formal footwear and sophisticated tailored combinations.',
  },
  {
    id: 'TRENDY',
    title: 'Trendy / Party',
    tagline: 'Fashion-Forward & Bold',
    description: 'Fashion-forward shirts, distinctive cuts, sneakers or smart footwear, and optional accessories.',
  },
];

export const COLOR_OPTIONS = [
  'No preference',
  'Black',
  'White',
  'Blue',
  'Grey',
  'Brown',
  'Beige',
  'Green',
  'Red',
  'Pink',
  'Multicolor',
];

export const SKIN_TONE_OPTIONS = [
  'Prefer not to say',
  'Fair / Light',
  'Medium / Olive',
  'Warm / Wheatish',
  'Deep / Rich',
];

/**
 * Deduplicate products strictly by ID and Affiliate URL.
 */
export function deduplicateProducts(products: Product[]): Product[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const result: Product[] = [];

  for (const p of products) {
    if (!p || !p.id) continue;
    if (seenIds.has(p.id)) continue;
    if (p.affiliateUrl && seenUrls.has(p.affiliateUrl)) continue;

    seenIds.add(p.id);
    if (p.affiliateUrl) seenUrls.add(p.affiliateUrl);
    result.push(p);
  }

  return result;
}

/**
 * Calculates a transparent scoring match for a product given user criteria.
 */
function scoreProduct(
  product: Product,
  category: StyleCategory,
  input: StylePreferenceInput
): number {
  let score = 50; // Base score

  const text = `${product.title} ${product.brand} ${product.description || ''} ${product.category} ${product.style || ''} ${product.occasion || ''} ${product.material || ''} ${product.color || ''}`.toLowerCase();

  // 1. Occasion scoring
  const occ = input.occasion.toLowerCase();
  if (product.occasion && product.occasion.toLowerCase().includes(occ)) {
    score += 30;
  }
  if (text.includes(occ)) {
    score += 15;
  }

  // 2. Style direction scoring
  if (input.styleDirection === 'CASUAL') {
    if (/\b(casual|regular|cotton|linen|relaxed|everyday|denim)\b/i.test(text)) score += 20;
    if (/\b(tuxedo|strict formal|business suit)\b/i.test(text)) score -= 15;
  } else if (input.styleDirection === 'FORMAL') {
    if (/\b(formal|slim fit|oxford|tuxedo|collared|dress|trousers|solid)\b/i.test(text)) score += 25;
    if (/\b(mandarin|graphic|casual tee|shorts)\b/i.test(text)) score -= 10;
  } else if (input.styleDirection === 'TRENDY') {
    if (/\b(modern|mandarin|contemporary|stylish|streetwear|party|black|printed)\b/i.test(text)) score += 25;
  }

  // 3. Preferred Color scoring
  if (input.preferredColor && input.preferredColor !== 'No preference') {
    const prefColor = input.preferredColor.toLowerCase();
    if (product.color && product.color.toLowerCase().includes(prefColor)) {
      score += 25;
    } else if (text.includes(prefColor)) {
      score += 15;
    }
  }

  // 4. Specific preference scoring (Shorts / Jeans / Trousers / Sneakers)
  if (input.specificPreference && input.specificPreference !== 'No preference') {
    const pref = input.specificPreference.toLowerCase();
    if (text.includes(pref)) {
      score += 30;
    }
  }

  return score;
}

/**
 * Generate occasion-adapted outfit titles and explanations based on genuine catalog matches.
 */
function generateCombinationMeta(
  optionIndex: number,
  occasion: OccasionType,
  styleDirection: StyleDirection,
  top: Product | null,
  bottom: Product | null,
  shoes: Product | null,
  accessory: Product | null
): { title: string; subtitle: string; explanation: string } {
  let title = '';
  let subtitle = '';

  if (occasion === 'Birthday') {
    title = optionIndex === 0 ? 'Casual Birthday Look' : 'Smart Birthday Look';
    subtitle = optionIndex === 0 ? 'Relaxed & Standout' : 'Refined & Polished';
  } else if (occasion === 'Outing') {
    title = optionIndex === 0 ? 'Relaxed Outing Style' : 'Trendy Streetwear';
    subtitle = optionIndex === 0 ? 'Effortless Comfort' : 'City-Ready Edge';
  } else if (occasion === 'Work') {
    title = optionIndex === 0 ? 'Polished Executive' : 'Smart Casual Workwear';
    subtitle = optionIndex === 0 ? 'Structured & Professional' : 'Modern Workplace';
  } else if (occasion === 'Date Night') {
    title = optionIndex === 0 ? 'Refined Evening' : 'Smart Casual Romance';
    subtitle = optionIndex === 0 ? 'Sophisticated Mood' : 'Relaxed Intimacy';
  } else if (occasion === 'College') {
    title = optionIndex === 0 ? 'Campus Everyday' : 'Trendy Youthful';
    subtitle = optionIndex === 0 ? 'Easy Comfort' : 'Fashion Forward';
  } else if (occasion === 'Travel') {
    title = optionIndex === 0 ? 'Comfort Transit' : 'Smart Travel Look';
    subtitle = optionIndex === 0 ? 'All-Day Mobility' : 'Polished Explorer';
  } else if (occasion === 'Party') {
    title = optionIndex === 0 ? 'Nightlife Statement' : 'Sleek Party Vibe';
    subtitle = optionIndex === 0 ? 'Bold & Confident' : 'Modern Elegance';
  } else if (occasion === 'Brunch') {
    title = optionIndex === 0 ? 'Sunlit Casual' : 'Elevated Brunch';
    subtitle = optionIndex === 0 ? 'Breezy Linen' : 'Smart Daywear';
  } else if (occasion === 'Wedding') {
    title = optionIndex === 0 ? 'Ceremonial Formal' : 'Distinguished Celebration';
    subtitle = optionIndex === 0 ? 'Classic Elegance' : 'Contemporary Grace';
  } else if (occasion === 'Festive') {
    title = optionIndex === 0 ? 'Festive Radiance' : 'Celebration Elegance';
    subtitle = optionIndex === 0 ? 'Rich Tones' : 'Timeless Charm';
  } else if (occasion === 'Dinner') {
    title = optionIndex === 0 ? 'Fine Dining Refinement' : 'Bistro Smart Casual';
    subtitle = optionIndex === 0 ? 'Tailored Sharpness' : 'Relaxed Sophistication';
  } else {
    title = optionIndex === 0 ? 'Classic Everyday' : 'Elevated Casual';
    subtitle = optionIndex === 0 ? 'Versatile Core' : 'Contemporary Style';
  }

  // Construct truthful explanation based on actual catalog pieces
  const pieces: string[] = [];
  if (top) pieces.push(`${top.brand} ${top.color || ''} ${top.title}`.trim());
  if (bottom) pieces.push(`${bottom.brand} ${bottom.title}`.trim());
  if (shoes) pieces.push(`${shoes.brand} ${shoes.title}`.trim());
  if (accessory) pieces.push(`${accessory.brand} ${accessory.title}`.trim());

  let explanation = '';
  if (pieces.length >= 2) {
    explanation = `Paired ${pieces[0]} with ${pieces.slice(1).join(' and ')} for a coordinated ${occasion.toLowerCase()} aesthetic.`;
  } else if (top) {
    explanation = `Featuring the ${top.brand} ${top.title} with clean ${top.color ? `${top.color} tone` : 'styling'} suited for ${occasion.toLowerCase()} wear.`;
  } else {
    explanation = `Curated from verified catalog pieces to match your ${styleDirection.toLowerCase()} ${occasion.toLowerCase()} preference.`;
  }

  return { title, subtitle, explanation };
}

/**
 * Main Smart Recommendation Engine.
 * Filters catalog strictly by gender, classifies into categories, scores items,
 * and builds up to TWO distinct outfit combinations from genuine catalog products only.
 */
export function generateSmartRecommendations(
  catalog: Product[],
  input: StylePreferenceInput
): RecommendationResult {
  const deduped = deduplicateProducts(catalog);

  // 1. Strict Gender Filter: Never mix Men & Women products; exclude UNKNOWN gender
  const genderCatalog = deduped.filter((p) => {
    const g = normalizeProductGender(p);
    return g === input.gender || g === 'UNISEX';
  });

  // 2. Separate into Category Pools
  const tops = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'TOP');
  const bottoms = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'BOTTOM');
  const shoes = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'SHOES');
  const accessories = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'ACCESSORY');

  // 3. Rank each category pool by transparent scoring
  const rankedTops = [...tops].sort((a, b) => scoreProduct(b, 'TOP', input) - scoreProduct(a, 'TOP', input));
  const rankedBottoms = [...bottoms].sort((a, b) => scoreProduct(b, 'BOTTOM', input) - scoreProduct(a, 'BOTTOM', input));
  const rankedShoes = [...shoes].sort((a, b) => scoreProduct(b, 'SHOES', input) - scoreProduct(a, 'SHOES', input));
  const rankedAccessories = [...accessories].sort((a, b) => scoreProduct(b, 'ACCESSORY', input) - scoreProduct(a, 'ACCESSORY', input));

  const usedProductIds = new Set<string>();
  const outfits: OutfitCombination[] = [];

  // 4. Build Outfit Combination 1
  const top1 = rankedTops.find((p) => !usedProductIds.has(p.id)) || rankedTops[0] || null;
  if (top1) usedProductIds.add(top1.id);

  const bottom1 = rankedBottoms.find((p) => !usedProductIds.has(p.id)) || rankedBottoms[0] || null;
  if (bottom1) usedProductIds.add(bottom1.id);

  const shoes1 = rankedShoes.find((p) => !usedProductIds.has(p.id)) || rankedShoes[0] || null;
  if (shoes1) usedProductIds.add(shoes1.id);

  const acc1 = rankedAccessories.find((p) => !usedProductIds.has(p.id)) || rankedAccessories[0] || null;
  if (acc1) usedProductIds.add(acc1.id);

  if (top1 || bottom1 || shoes1 || acc1) {
    const meta1 = generateCombinationMeta(0, input.occasion, input.styleDirection, top1, bottom1, shoes1, acc1);
    const missing: StyleCategory[] = [];
    if (!top1) missing.push('TOP');
    if (!bottom1) missing.push('BOTTOM');
    if (!shoes1) missing.push('SHOES');

    outfits.push({
      id: 'outfit-option-1',
      title: meta1.title,
      subtitle: meta1.subtitle,
      styleDirection: input.styleDirection,
      explanation: meta1.explanation,
      items: [
        { category: 'TOP', product: top1 },
        { category: 'BOTTOM', product: bottom1 },
        { category: 'SHOES', product: shoes1 },
        { category: 'ACCESSORY', product: acc1 },
      ],
      top: top1,
      bottom: bottom1,
      shoes: shoes1,
      accessory: acc1,
      totalPriceText: null, // Only calculated if verified numeric prices exist
      isComplete: missing.length === 0,
      missingCategories: missing,
    });
  }

  // 5. Build Outfit Combination 2 (Must use distinct pieces if available)
  const top2 = rankedTops.find((p) => !usedProductIds.has(p.id)) || null;
  if (top2) usedProductIds.add(top2.id);

  const bottom2 = rankedBottoms.find((p) => !usedProductIds.has(p.id)) || null;
  if (bottom2) usedProductIds.add(bottom2.id);

  const shoes2 = rankedShoes.find((p) => !usedProductIds.has(p.id)) || null;
  if (shoes2) usedProductIds.add(shoes2.id);

  const acc2 = rankedAccessories.find((p) => !usedProductIds.has(p.id)) || null;
  if (acc2) usedProductIds.add(acc2.id);

  if (top2 || bottom2 || shoes2 || acc2) {
    const meta2 = generateCombinationMeta(1, input.occasion, input.styleDirection, top2, bottom2, shoes2, acc2);
    const missing2: StyleCategory[] = [];
    if (!top2) missing2.push('TOP');
    if (!bottom2) missing2.push('BOTTOM');
    if (!shoes2) missing2.push('SHOES');

    outfits.push({
      id: 'outfit-option-2',
      title: meta2.title,
      subtitle: meta2.subtitle,
      styleDirection: input.styleDirection,
      explanation: meta2.explanation,
      items: [
        { category: 'TOP', product: top2 },
        { category: 'BOTTOM', product: bottom2 },
        { category: 'SHOES', product: shoes2 },
        { category: 'ACCESSORY', product: acc2 },
      ],
      top: top2,
      bottom: bottom2,
      shoes: shoes2,
      accessory: acc2,
      totalPriceText: null,
      isComplete: missing2.length === 0,
      missingCategories: missing2,
    });
  }

  let statusMsg: string | undefined;
  if (outfits.length === 0 || outfits.some((o) => !o.isComplete)) {
    statusMsg = 'Your FashionFind catalog is still growing. Here are the best available matches.';
  }

  const header = `${input.gender} · ${input.occasion.toUpperCase()} · ${input.styleDirection}`;

  return {
    header,
    gender: input.gender,
    occasion: input.occasion,
    styleDirection: input.styleDirection,
    outfits,
    catalogStatusMessage: statusMsg,
  };
}
