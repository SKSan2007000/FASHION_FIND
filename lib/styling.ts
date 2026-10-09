/**
 * FashionFind Styling and Recommendation Helpers
 * Occasion-based matching, color harmony, and outfit assembly.
 * 3D/Virtual try-on has been completely removed in accordance with production specifications.
 */

export * from './categories';
export * from './recommendations';

import { Product } from '../data';

/**
 * Color harmony compatibility reference
 */
export const COLOR_HARMONY_MAP: Record<string, string[]> = {
  blue: ['black', 'navy', 'white', 'grey', 'charcoal', 'beige', 'tan', 'brown'],
  'mid blue': ['black', 'navy', 'white', 'charcoal', 'grey', 'brown', 'tan'],
  black: ['black', 'white', 'grey', 'charcoal', 'navy', 'beige', 'tan', 'brown', 'red'],
  white: ['black', 'navy', 'blue', 'grey', 'olive', 'brown', 'beige', 'tan', 'charcoal', 'green'],
  grey: ['black', 'white', 'navy', 'blue', 'charcoal', 'burgundy'],
  brown: ['beige', 'tan', 'white', 'navy', 'blue', 'cream'],
  beige: ['brown', 'tan', 'white', 'navy', 'blue', 'black', 'olive'],
  green: ['white', 'black', 'beige', 'brown', 'tan', 'navy', 'grey'],
};

/**
 * Check if two colors form a harmonious pairing.
 */
export function areColorsHarmonious(colorA: string | undefined, colorB: string | undefined): boolean {
  if (!colorA || !colorB) return true; // Neutral fallback
  const a = colorA.toLowerCase().trim();
  const b = colorB.toLowerCase().trim();
  if (a === b) return true;

  const compatible = COLOR_HARMONY_MAP[a];
  if (compatible && compatible.some((c) => b.includes(c))) {
    return true;
  }
  return false;
}
