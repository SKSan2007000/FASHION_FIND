'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { initialProducts, Product } from '../../data';
import { supabase } from '../../lib/supabase';
import { StyleCategory, ProductGender, normalizeStyleCategory, normalizeProductGender } from '../../lib/categories';
import { StyleSlotState, OutfitState, recommendMatchingPieces, deduplicateProducts, generateVirtualTryOn } from '../../lib/styling';

import GenderSelector from './GenderSelector';
import OutfitModelView from './OutfitModelView';
import CategoryStepSelector from './CategoryStepSelector';
import OutfitSummary from './OutfitSummary';
import CompleteTheLook from './CompleteTheLook';
import ProductPickerModal from './ProductPickerModal';

import { Sparkles, ArrowLeft, RotateCcw, ShieldCheck, Shirt, AlertCircle } from 'lucide-react';

const INITIAL_SLOTS: Record<StyleCategory, StyleSlotState> = {
  TOP: { category: 'TOP', product: null, isLocked: false },
  BOTTOM: { category: 'BOTTOM', product: null, isLocked: false },
  SHOES: { category: 'SHOES', product: null, isLocked: false },
  ACCESSORY: { category: 'ACCESSORY', product: null, isLocked: false },
};

export default function CreateStylePage() {
  const [catalog, setCatalog] = useState<Product[]>(initialProducts);
  const [gender, setGender] = useState<ProductGender>('MEN');
  const [slots, setSlots] = useState<Record<StyleCategory, StyleSlotState>>(() => {
    const defaultTop = initialProducts[0] || null;
    return {
      TOP: { category: 'TOP', product: defaultTop, isLocked: true },
      BOTTOM: { category: 'BOTTOM', product: null, isLocked: false },
      SHOES: { category: 'SHOES', product: null, isLocked: false },
      ACCESSORY: { category: 'ACCESSORY', product: null, isLocked: false },
    };
  });
  const [activePickerCategory, setActivePickerCategory] = useState<StyleCategory | null>(null);
  const [completeLookSuggestions, setCompleteLookSuggestions] = useState<
    { product: Product; category: StyleCategory; reason: string }[]
  >([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  // 1. Load genuine catalog from Supabase or localStorage or fallback to initialProducts
  useEffect(() => {
    async function loadCatalog() {
      setIsCatalogLoading(true);
      try {
        let products: Product[] = [];

        // Check Supabase if configured
        if (supabase) {
          const { data, error } = await supabase.from('products').select('*');
          if (!error && data && data.length > 0) {
            products = data as Product[];
          }
        }

        // Check localStorage admin products
        if (products.length === 0 && typeof window !== 'undefined') {
          const stored = localStorage.getItem('fashionfind_products');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
              }
            } catch (e) {
              console.error('Failed to parse localStorage products', e);
            }
          }
        }

        // Fallback to genuine initialProducts
        if (products.length === 0) {
          products = initialProducts;
        }

        const deduped = deduplicateProducts(products);
        setCatalog(deduped);
      } catch (err) {
        console.error('Catalog load error', err);
        setCatalog(deduplicateProducts(initialProducts));
      } finally {
        setIsCatalogLoading(false);
      }
    }

    loadCatalog();
  }, []);

  // 2. Initialize or Update Outfit when Catalog or Gender changes
  useEffect(() => {
    if (catalog.length === 0) return;

    // Filter catalog for current gender
    const genderCatalog = catalog.filter((p) => normalizeProductGender(p) === gender);

    // Find default Top for this gender
    const tops = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'TOP');
    const defaultTop = tops.length > 0 ? tops[0] : null;

    const newSlots: Record<StyleCategory, StyleSlotState> = {
      TOP: {
        category: 'TOP',
        product: defaultTop,
        isLocked: true, // Default top is the user's primary selection anchor
      },
      BOTTOM: { category: 'BOTTOM', product: null, isLocked: false },
      SHOES: { category: 'SHOES', product: null, isLocked: false },
      ACCESSORY: { category: 'ACCESSORY', product: null, isLocked: false },
    };

    if (defaultTop) {
      const recs = recommendMatchingPieces({
        selectedProduct: defaultTop,
        catalog,
        gender,
        currentSlots: newSlots,
      });

      for (const [cat, rec] of Object.entries(recs.recommendedSlots)) {
        if (rec) {
          newSlots[cat as StyleCategory] = {
            category: cat as StyleCategory,
            product: rec.product,
            isLocked: false,
            suggestionReason: rec.reason,
          };
        }
      }

      setCompleteLookSuggestions(recs.completeTheLookItems);
    } else {
      setCompleteLookSuggestions([]);
    }

    setSlots(newSlots);
  }, [catalog, gender]);

  // 3. User Selects a Product for a specific category slot
  const handleSelectProduct = useCallback(
    (cat: StyleCategory, product: Product) => {
      setSlots((prev) => {
        const updated: Record<StyleCategory, StyleSlotState> = {
          ...prev,
          [cat]: {
            category: cat,
            product,
            isLocked: true, // Manual selection = LOCKED
            suggestionReason: undefined,
          },
        };

        // Recalculate recommendations for remaining UNLOCKED slots
        const recs = recommendMatchingPieces({
          selectedProduct: product,
          catalog,
          gender,
          currentSlots: updated,
        });

        for (const [categoryKey, rec] of Object.entries(recs.recommendedSlots)) {
          const k = categoryKey as StyleCategory;
          // Only update if not locked
          if (!updated[k].isLocked && rec) {
            updated[k] = {
              category: k,
              product: rec.product,
              isLocked: false,
              suggestionReason: rec.reason,
            };
          }
        }

        setCompleteLookSuggestions(recs.completeTheLookItems);
        return updated;
      });
    },
    [catalog, gender]
  );

  // 4. Toggle Lock on a slot
  const handleToggleLock = useCallback(
    (cat: StyleCategory) => {
      setSlots((prev) => {
        const currentSlot = prev[cat];
        if (!currentSlot.product) return prev;

        const nextLocked = !currentSlot.isLocked;
        const updated = {
          ...prev,
          [cat]: {
            ...currentSlot,
            isLocked: nextLocked,
          },
        };

        // If newly unlocked, recalculate it based on active locked top/reference
        if (!nextLocked) {
          const anchorProduct = prev.TOP.product || Object.values(prev).find((s) => s.isLocked && s.product)?.product || null;
          const recs = recommendMatchingPieces({
            selectedProduct: anchorProduct,
            catalog,
            gender,
            currentSlots: updated,
          });

          if (recs.recommendedSlots[cat]) {
            updated[cat] = {
              category: cat,
              product: recs.recommendedSlots[cat]!.product,
              isLocked: false,
              suggestionReason: recs.recommendedSlots[cat]!.reason,
            };
          }
          setCompleteLookSuggestions(recs.completeTheLookItems);
        }

        return updated;
      });
    },
    [catalog, gender]
  );

  // 5. Clear a slot
  const handleClearSlot = useCallback(
    (cat: StyleCategory) => {
      setSlots((prev) => ({
        ...prev,
        [cat]: {
          category: cat,
          product: null,
          isLocked: false,
        },
      }));
    },
    []
  );

  // 6. Reset entire look
  const handleResetOutfit = useCallback(() => {
    const genderCatalog = catalog.filter((p) => normalizeProductGender(p) === gender);
    const tops = genderCatalog.filter((p) => normalizeStyleCategory(p) === 'TOP');
    const defaultTop = tops.length > 0 ? tops[0] : null;

    const newSlots: Record<StyleCategory, StyleSlotState> = {
      TOP: { category: 'TOP', product: defaultTop, isLocked: true },
      BOTTOM: { category: 'BOTTOM', product: null, isLocked: false },
      SHOES: { category: 'SHOES', product: null, isLocked: false },
      ACCESSORY: { category: 'ACCESSORY', product: null, isLocked: false },
    };

    if (defaultTop) {
      const recs = recommendMatchingPieces({
        selectedProduct: defaultTop,
        catalog,
        gender,
        currentSlots: newSlots,
      });

      for (const [cat, rec] of Object.entries(recs.recommendedSlots)) {
        if (rec) {
          newSlots[cat as StyleCategory] = {
            category: cat as StyleCategory,
            product: rec.product,
            isLocked: false,
            suggestionReason: rec.reason,
          };
        }
      }
      setCompleteLookSuggestions(recs.completeTheLookItems);
    }
    setSlots(newSlots);
  }, [catalog, gender]);

  // Set of actively selected product IDs for duplicate badge check
  const activeProductIds = useMemo(() => {
    const set = new Set<string>();
    for (const slot of Object.values(slots)) {
      if (slot.product?.id) {
        set.add(slot.product.id);
      }
    }
    return set;
  }, [slots]);

  return (
    <div className="style-builder-page-root">
      {/* Editorial Navigation Topbar */}
      <header className="style-page-header">
        <div className="header-inner-container">
          <div className="header-left">
            <Link href="/" className="btn-back-home">
              <ArrowLeft size={16} />
              <span>Back to Catalog</span>
            </Link>
            <div className="header-brand-title">
              <span className="brand-badge">FASHIONFIND STUDIO</span>
              <h1 className="page-main-heading">Create Your Style</h1>
            </div>
          </div>

          <div className="header-right">
            <button
              type="button"
              className="btn-reset-look"
              onClick={handleResetOutfit}
              title="Reset outfit to default recommendations"
            >
              <RotateCcw size={14} />
              <span>Reset Look</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <main className="style-workspace-container">
        {/* LEFT COLUMN: Large Faceless Human Model Hero View */}
        <section className="style-column-left" aria-label="Human Outfit Model Preview">
          <div className="sticky-model-column">
            <OutfitModelView
              gender={gender}
              slots={slots}
              onSelectCategory={(cat) => setActivePickerCategory(cat)}
            />
          </div>
        </section>

        {/* RIGHT COLUMN: Style Builder Controls, Steps, Your Look, Recommendations */}
        <section className="style-column-right" aria-label="Outfit Builder Controls">
          {/* Step 1: Gender Collection Selector */}
          <GenderSelector
            gender={gender}
            onChange={(g) => setGender(g)}
          />

          {/* Steps 2-5: Category Step Selection */}
          <CategoryStepSelector
            gender={gender}
            slots={slots}
            onOpenPicker={(cat) => setActivePickerCategory(cat)}
            onToggleLock={handleToggleLock}
            onClearSlot={handleClearSlot}
          />

          {/* Complete The Look Suggestions */}
          <CompleteTheLook
            items={completeLookSuggestions}
            onAddPiece={handleSelectProduct}
            activeProductIds={activeProductIds}
          />

          {/* Your Look & Shop This Look Panel */}
          <OutfitSummary
            gender={gender}
            slots={slots}
            onToggleLock={handleToggleLock}
            onOpenPicker={(cat) => setActivePickerCategory(cat)}
          />
        </section>
      </main>

      {/* Real Catalog Search & Product Picker Modal */}
      <ProductPickerModal
        isOpen={activePickerCategory !== null}
        category={activePickerCategory}
        gender={gender}
        catalog={catalog}
        currentSelectedId={activePickerCategory ? slots[activePickerCategory]?.product?.id : undefined}
        onSelectProduct={handleSelectProduct}
        onClose={() => setActivePickerCategory(null)}
      />
    </div>
  );
}
