import { Product } from '../data';
import { StyleCategory, ProductGender, normalizeStyleCategory, normalizeProductGender } from './categories';

export interface StyleSlotState {
  category: StyleCategory;
  product: Product | null;
  isLocked: boolean; // true = user selected / locked; false = auto suggested
  suggestionReason?: string;
}

export interface OutfitState {
  gender: ProductGender;
  slots: Record<StyleCategory, StyleSlotState>;
}

export interface VirtualTryOnInput {
  gender: ProductGender;
  modelImage: string;
  topProduct: Product | null;
  bottomProduct: Product | null;
  shoesProduct: Product | null;
  accessoryProduct: Product | null;
}

export interface VirtualTryOnResult {
  modelImageUrl: string;
  isAiGenerated: boolean;
  provider: string;
  status: 'ready' | 'processing' | 'fallback';
  activeLookComposition: {
    top: Product | null;
    bottom: Product | null;
    shoes: Product | null;
    accessory: Product | null;
  };
  summaryText: string;
}

/**
 * Clean Virtual Try-On Abstraction Layer.
 * Ready for real AI Try-On service integration (e.g., Fashn.ai / Kolors / VTON API).
 * When no external API key is configured, provides a transparent, honest studio model view.
 */
export async function generateVirtualTryOn(
  params: VirtualTryOnInput
): Promise<VirtualTryOnResult> {
  const { gender, modelImage, topProduct, bottomProduct, shoesProduct, accessoryProduct } = params;

  // Selected pieces count
  const pieces = [topProduct, bottomProduct, shoesProduct, accessoryProduct].filter(Boolean);
  const topTitle = topProduct ? topProduct.brand + ' ' + topProduct.title : 'Top';
  const bottomTitle = bottomProduct ? bottomProduct.brand + ' ' + bottomProduct.title : 'Bottom';

  const summary = pieces.length > 0
    ? `Styled with ${[topTitle, bottomProduct ? bottomTitle : ''].filter(Boolean).join(' & ')}`
    : 'Select pieces from the catalog to build your look';

  return {
    modelImageUrl: modelImage || (gender === 'WOMEN' ? '/style-models/women/female-body.jpg' : '/style-models/men/male-body.jpg'),
    isAiGenerated: false,
    provider: 'FashionFind Studio Engine',
    status: 'ready',
    activeLookComposition: {
      top: topProduct,
      bottom: bottomProduct,
      shoes: shoesProduct,
      accessory: accessoryProduct,
    },
    summaryText: summary,
  };
}

/**
 * Deduplicates an array of products strictly by product.id and affiliateUrl.
 */
export function deduplicateProducts(products: Product[]): Product[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const results: Product[] = [];

  for (const p of products) {
    if (!p || !p.id) continue;
    if (seenIds.has(p.id)) continue;
    if (p.affiliateUrl && seenUrls.has(p.affiliateUrl)) continue;

    seenIds.add(p.id);
    if (p.affiliateUrl) seenUrls.add(p.affiliateUrl);
    results.push(p);
  }

  return results;
}

/**
 * Color harmony compatibility matrix
 */
const COLOR_HARMONY: Record<string, string[]> = {
  blue: ['black', 'navy', 'white', 'grey', 'gray', 'charcoal', 'beige', 'tan', 'brown'],
  'mid blue': ['black', 'navy', 'white', 'charcoal', 'grey', 'brown', 'tan'],
  black: ['black', 'white', 'grey', 'gray', 'charcoal', 'navy', 'beige', 'tan', 'brown', 'red'],
  white: ['black', 'blue', 'navy', 'grey', 'gray', 'charcoal', 'beige', 'tan', 'brown', 'olive', 'green'],
  grey: ['black', 'white', 'blue', 'navy', 'charcoal', 'burgundy'],
  gray: ['black', 'white', 'blue', 'navy', 'charcoal', 'burgundy'],
  brown: ['white', 'blue', 'navy', 'beige', 'tan', 'black'],
  beige: ['navy', 'blue', 'black', 'white', 'brown', 'olive'],
  tan: ['navy', 'blue', 'black', 'white', 'brown', 'charcoal'],
};

/**
 * Scores how well candidate product matches the target reference product.
 */
function scoreProductCompatibility(reference: Product, candidate: Product): number {
  let score = 50; // base score for same gender & correct category

  const refColor = (reference.color || '').toLowerCase().trim();
  const candColor = (candidate.color || '').toLowerCase().trim();
  const refStyle = (reference.style || '').toLowerCase();
  const candStyle = (candidate.style || '').toLowerCase();
  const refFit = (reference.fit || '').toLowerCase();
  const candFit = (candidate.fit || '').toLowerCase();

  // Color compatibility
  if (refColor && candColor) {
    const compatibleColors = COLOR_HARMONY[refColor] || ['black', 'white', 'grey', 'navy'];
    if (compatibleColors.some((c) => candColor.includes(c))) {
      score += 30;
    }
  }

  // Style / Fit compatibility (e.g. Classic / Modern / Regular Fit / Slim Fit)
  if (refFit && candFit && refFit === candFit) {
    score += 10;
  }
  if (refStyle && candStyle && (refStyle.includes(candStyle) || candStyle.includes(refStyle))) {
    score += 10;
  }

  // Brand synergy
  if (reference.brand && candidate.brand && reference.brand.toLowerCase() === candidate.brand.toLowerCase()) {
    score += 5;
  }

  return score;
}

/**
 * Intelligent recommendation engine that analyzes ONLY existing catalog products.
 * Never invents, hallucinates, or generates fake products.
 */
export function recommendMatchingPieces(options: {
  selectedProduct: Product | null;
  catalog: Product[];
  gender: ProductGender;
  currentSlots: Record<StyleCategory, StyleSlotState>;
}): {
  recommendedSlots: Partial<Record<StyleCategory, { product: Product; reason: string }>>;
  completeTheLookItems: { product: Product; category: StyleCategory; reason: string }[];
} {
  const { selectedProduct, catalog, gender, currentSlots } = options;
  const dedupedCatalog = deduplicateProducts(catalog);

  // Filter catalog strictly for current gender
  const genderCatalog = dedupedCatalog.filter((p) => {
    return normalizeProductGender(p) === gender;
  });

  const categories: StyleCategory[] = ['TOP', 'BOTTOM', 'SHOES', 'ACCESSORY'];
  const recommendedSlots: Partial<Record<StyleCategory, { product: Product; reason: string }>> = {};
  const completeTheLookItems: { product: Product; category: StyleCategory; reason: string }[] = [];

  for (const cat of categories) {
    const slotState = currentSlots[cat];

    // If slot is already locked by user, skip auto-recommending for that slot
    if (slotState?.isLocked && slotState.product) {
      continue;
    }

    // Find genuine catalog products belonging to this category
    const matchingProducts = genderCatalog.filter((p) => {
      if (selectedProduct && p.id === selectedProduct.id) return false;
      return normalizeStyleCategory(p) === cat;
    });

    if (matchingProducts.length === 0) {
      // No genuine product available in catalog - honest state
      continue;
    }

    // Score products
    if (selectedProduct) {
      const scored = matchingProducts.map((p) => ({
        product: p,
        score: scoreProductCompatibility(selectedProduct, p),
      }));

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0].product;

      const reason = `Matched from your FashionFind catalog to complement your ${selectedProduct.title}.`;
      recommendedSlots[cat] = { product: best, reason };

      // Add remaining matching items to "Complete the Look" suggestions
      for (const item of scored.slice(1, 3)) {
        completeTheLookItems.push({
          product: item.product,
          category: cat,
          reason: `Alternative ${cat.toLowerCase()} from ${item.product.brand}.`,
        });
      }
    } else {
      // No reference selected yet, pick top catalog product for this slot
      const first = matchingProducts[0];
      recommendedSlots[cat] = {
        product: first,
        reason: 'Curated staple from your FashionFind catalog.',
      };
    }
  }

  // Also populate Complete The Look with any other complementary items from the catalog
  for (const cat of categories) {
    const matching = genderCatalog.filter((p) => {
      if (selectedProduct && p.id === selectedProduct.id) return false;
      const isAlreadyInSlot = Object.values(recommendedSlots).some((r) => r?.product.id === p.id);
      const isAlreadyLocked = Object.values(currentSlots).some((s) => s.product?.id === p.id);
      return normalizeStyleCategory(p) === cat && !isAlreadyInSlot && !isAlreadyLocked;
    });

    for (const p of matching) {
      if (!completeTheLookItems.some((item) => item.product.id === p.id)) {
        completeTheLookItems.push({
          product: p,
          category: cat,
          reason: `Suggested ${cat.toLowerCase()} addition from your catalog.`,
        });
      }
    }
  }

  return {
    recommendedSlots,
    completeTheLookItems,
  };
}
