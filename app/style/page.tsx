'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Sparkles,
  Shirt,
  ShoppingBag,
  Footprints,
  Watch,
  Plus,
  ArrowRight,
  RefreshCw,
  Wand2,
  CheckCircle2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { initialProducts, Product } from '../../data';
import { supabase } from '../../lib/supabase';
import {
  normalizeStyleCategory,
  StyleCategory,
  STYLE_CATEGORIES,
} from '../../lib/categories';
import OutfitModelViewer from './OutfitModelViewer';
import ProductSelectModal from './ProductSelectModal';
import OutfitSummary from './OutfitSummary';

const CATEGORY_ICONS: Record<StyleCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  TOP: Shirt,
  BOTTOM: ShoppingBag,
  SHOES: Footprints,
  ACCESSORY: Watch,
};

export default function StylePage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [topId, setTopId] = useState<string>('jack-jones-12290084-mid-blue');
  const [bottomId, setBottomId] = useState<string>('levis-511-slim-fit-dark-indigo');
  const [shoesId, setShoesId] = useState<string>('nike-court-vision-low-white');
  const [accessoryId, setAccessoryId] = useState<string>('fossil-grant-chronograph-watch');

  // Modal selector state
  const [activeModalCategory, setActiveModalCategory] = useState<StyleCategory | null>(null);

  // Load catalog from Supabase or localStorage
  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

          if (!error && data?.length && mounted) {
            const map = new Map<string, Product>();
            [...initialProducts, ...(data as Product[])].forEach((p) => map.set(p.id, p));
            setProducts([...map.values()]);
          }
        } catch (err) {
          console.error('Failed to load Supabase products:', err);
        }
      } else {
        try {
          const stored = localStorage.getItem('fashionfind-products');
          if (stored && mounted) {
            const parsed = JSON.parse(stored) as Product[];
            const map = new Map<string, Product>();
            [...initialProducts, ...parsed].forEach((p) => map.set(p.id, p));
            setProducts([...map.values()]);
          }
        } catch (err) {
          console.error('Failed to load local products:', err);
        }
      }
    };

    loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter products by normalized style categories
  const topProducts = useMemo(
    () => products.filter((p) => normalizeStyleCategory(p) === 'TOP'),
    [products]
  );
  const bottomProducts = useMemo(
    () => products.filter((p) => normalizeStyleCategory(p) === 'BOTTOM'),
    [products]
  );
  const shoesProducts = useMemo(
    () => products.filter((p) => normalizeStyleCategory(p) === 'SHOES'),
    [products]
  );
  const accessoryProducts = useMemo(
    () => products.filter((p) => normalizeStyleCategory(p) === 'ACCESSORY'),
    [products]
  );

  // Selected product instances
  const selectedTop = useMemo(
    () => products.find((p) => p.id === topId && normalizeStyleCategory(p) === 'TOP') || null,
    [products, topId]
  );
  const selectedBottom = useMemo(
    () => products.find((p) => p.id === bottomId && normalizeStyleCategory(p) === 'BOTTOM') || null,
    [products, bottomId]
  );
  const selectedShoes = useMemo(
    () => products.find((p) => p.id === shoesId && normalizeStyleCategory(p) === 'SHOES') || null,
    [products, shoesId]
  );
  const selectedAccessory = useMemo(
    () =>
      products.find((p) => p.id === accessoryId && normalizeStyleCategory(p) === 'ACCESSORY') || null,
    [products, accessoryId]
  );

  // Handler for opening selector modal
  const handleOpenSelector = useCallback((cat: StyleCategory) => {
    setActiveModalCategory(cat);
  }, []);

  // Handler for product selection
  const handleSelectProduct = useCallback(
    (productId: string) => {
      if (!activeModalCategory) return;
      switch (activeModalCategory) {
        case 'TOP':
          setTopId(productId);
          break;
        case 'BOTTOM':
          setBottomId(productId);
          break;
        case 'SHOES':
          setShoesId(productId);
          break;
        case 'ACCESSORY':
          setAccessoryId(productId);
          break;
      }
    },
    [activeModalCategory]
  );

  // Handler for clearing selection
  const handleDeselectProduct = useCallback(() => {
    if (!activeModalCategory) return;
    switch (activeModalCategory) {
      case 'TOP':
        setTopId('');
        break;
      case 'BOTTOM':
        setBottomId('');
        break;
      case 'SHOES':
        setShoesId('');
        break;
      case 'ACCESSORY':
        setAccessoryId('');
        break;
    }
  }, [activeModalCategory]);

  // Reset look handler
  const handleResetLook = useCallback(() => {
    setTopId('');
    setBottomId('');
    setShoesId('');
    setAccessoryId('');
  }, []);

  // Surprise Me (Random look generator strictly respecting normalized categories)
  const handleSurpriseMe = useCallback(() => {
    if (topProducts.length > 0) {
      const randTop = topProducts[Math.floor(Math.random() * topProducts.length)];
      setTopId(randTop.id);
    }
    if (bottomProducts.length > 0) {
      const randBottom = bottomProducts[Math.floor(Math.random() * bottomProducts.length)];
      setBottomId(randBottom.id);
    }
    if (shoesProducts.length > 0) {
      const randShoes = shoesProducts[Math.floor(Math.random() * shoesProducts.length)];
      setShoesId(randShoes.id);
    }
    if (accessoryProducts.length > 0) {
      // 80% chance to include accessory
      if (Math.random() > 0.2) {
        const randAcc = accessoryProducts[Math.floor(Math.random() * accessoryProducts.length)];
        setAccessoryId(randAcc.id);
      } else {
        setAccessoryId('');
      }
    }
  }, [topProducts, bottomProducts, shoesProducts, accessoryProducts]);

  // Active modal products list
  const modalProducts = useMemo(() => {
    switch (activeModalCategory) {
      case 'TOP':
        return topProducts;
      case 'BOTTOM':
        return bottomProducts;
      case 'SHOES':
        return shoesProducts;
      case 'ACCESSORY':
        return accessoryProducts;
      default:
        return [];
    }
  }, [activeModalCategory, topProducts, bottomProducts, shoesProducts, accessoryProducts]);

  // Active selected ID in modal
  const modalSelectedId = useMemo(() => {
    switch (activeModalCategory) {
      case 'TOP':
        return topId;
      case 'BOTTOM':
        return bottomId;
      case 'SHOES':
        return shoesId;
      case 'ACCESSORY':
        return accessoryId;
      default:
        return null;
    }
  }, [activeModalCategory, topId, bottomId, shoesId, accessoryId]);

  // Selector cards configuration
  const selectorCards = [
    {
      category: 'TOP' as StyleCategory,
      title: 'Top',
      eyebrow: 'Upper Body',
      product: selectedTop,
      count: topProducts.length,
      emptyPrompt: 'Choose a top to complete your look.',
      icon: Shirt,
    },
    {
      category: 'BOTTOM' as StyleCategory,
      title: 'Bottom',
      eyebrow: 'Trousers & Denim',
      product: selectedBottom,
      count: bottomProducts.length,
      emptyPrompt: 'Choose bottoms to complete your look.',
      icon: ShoppingBag,
    },
    {
      category: 'SHOES' as StyleCategory,
      title: 'Shoes',
      eyebrow: 'Footwear',
      product: selectedShoes,
      count: shoesProducts.length,
      emptyPrompt: 'Choose shoes to complete your look.',
      icon: Footprints,
    },
    {
      category: 'ACCESSORY' as StyleCategory,
      title: 'Accessory',
      eyebrow: 'Finishing Touch',
      product: selectedAccessory,
      count: accessoryProducts.length,
      emptyPrompt: 'Accessory optional',
      icon: Watch,
    },
  ];

  return (
    <main className="stylePageRoot">
      <div className="styleContainer">
        {/* TOP NAVIGATION BREADCRUMB */}
        <div className="styleNavRow">
          <Link href="/" className="btn btnLight btnBack">
            <ArrowLeft size={16} />
            <span>Back to Collection</span>
          </Link>

          <div className="styleQuickActions">
            <button
              type="button"
              className="btn btnLight btnSmall"
              onClick={handleSurpriseMe}
              title="Generate a random coordinated outfit"
            >
              <Wand2 size={14} />
              <span>Surprise Me</span>
            </button>
            <button
              type="button"
              className="btn btnLight btnSmall"
              onClick={handleResetLook}
              title="Clear all selections"
            >
              <RefreshCw size={14} />
              <span>Reset Look</span>
            </button>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className="styleHeroSection">
          <span className="eyebrow">
            <Sparkles size={13} />
            Fashion Studio
          </span>
          <h1 className="styleHeroHeading">
            Create Your <em>Style.</em>
          </h1>
          <p className="styleHeroSubtitle">
            Build a complete look from pieces you love. Explore how tops, bottoms, shoes and
            accessories harmonize together on a 360° rotatable fashion model.
          </p>
        </section>

        {/* 4-COLUMN SELECTOR GRID */}
        <section className="selectorSection" aria-label="Outfit Pieces Selector">
          <div className="selectorGridHeader">
            <h3>
              <Layers size={18} />
              <span>Choose Your 4 Wardrobe Pieces</span>
            </h3>
            <span className="selectorHint">Click any card to explore available styles</span>
          </div>

          <div className="styleSelectorGrid">
            {selectorCards.map(({ category, title, eyebrow, product, count, emptyPrompt, icon: IconComponent }) => {
              const isSelected = Boolean(product);

              return (
                <div
                  key={category}
                  className={`selectorCard glassPanel ${isSelected ? 'hasProduct' : 'isEmpty'}`}
                  onClick={() => handleOpenSelector(category)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenSelector(category);
                    }
                  }}
                  aria-label={`${title} selector: ${product ? product.title : emptyPrompt}`}
                >
                  {/* CARD TOP HEADER */}
                  <div className="selectorCardHeader">
                    <div className="selectorCategoryLabel">
                      <IconComponent size={15} className="categoryIcon" />
                      <div>
                        <span className="categoryEyebrow">{eyebrow}</span>
                        <h4>{title}</h4>
                      </div>
                    </div>
                    <span className="itemCountBadge">{count} styles</span>
                  </div>

                  {/* CARD BODY CONTENT */}
                  {product ? (
                    <div className="selectorCardContent">
                      <div className="selectorImageWrapper">
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={260}
                          height={300}
                          className="selectorProductImg"
                        />
                        <span className="selectedCheckBadge">
                          <CheckCircle2 size={13} />
                          <span>Selected</span>
                        </span>
                      </div>

                      <div className="selectorProductDetails">
                        <span className="selectorBrand">{product.brand}</span>
                        <h5 className="selectorTitle" title={product.title}>
                          {product.title}
                        </h5>

                        <div className="selectorMetaRow">
                          {product.color && <span className="chip">{product.color}</span>}
                          {product.fit && <span className="chip">{product.fit}</span>}
                        </div>

                        <div className="selectorCardFooter">
                          <span className="selectorPrice">{product.price}</span>
                          <span className="btnChangePieceInline">
                            Change <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="selectorCardEmpty">
                      <div className="emptyIconCircle">
                        <IconComponent size={26} />
                      </div>
                      <span className="emptyPromptText">{emptyPrompt}</span>
                      <button type="button" className="btn btnDark btnSmall selectPieceBtn">
                        <Plus size={14} />
                        <span>Select {title}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ROTATABLE MODEL VIEWER */}
        <section className="modelSection" aria-label="360 Degree Rotatable Model Preview">
          <OutfitModelViewer
            topProduct={selectedTop}
            bottomProduct={selectedBottom}
            shoesProduct={selectedShoes}
            accessoryProduct={selectedAccessory}
            onOpenSelector={handleOpenSelector}
          />
        </section>

        {/* OUTFIT SUMMARY & AMAZON AFFILIATE ACTIONS */}
        <OutfitSummary
          topProduct={selectedTop}
          bottomProduct={selectedBottom}
          shoesProduct={selectedShoes}
          accessoryProduct={selectedAccessory}
          onOpenSelector={handleOpenSelector}
          onReset={handleResetLook}
          onSurpriseMe={handleSurpriseMe}
        />
      </div>

      {/* PRODUCT SELECTION MODAL */}
      <ProductSelectModal
        isOpen={activeModalCategory !== null}
        category={activeModalCategory}
        products={modalProducts}
        selectedId={modalSelectedId}
        onSelect={handleSelectProduct}
        onDeselect={handleDeselectProduct}
        onClose={() => setActiveModalCategory(null)}
      />
    </main>
  );
}
