'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Search,
  Check,
  ExternalLink,
  Shirt,
  ShoppingBag,
  Footprints,
  Watch,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { Product } from '../../data';
import { StyleCategory, STYLE_CATEGORIES } from '../../lib/categories';

interface ProductSelectModalProps {
  isOpen: boolean;
  category: StyleCategory | null;
  products: Product[];
  selectedId: string | null;
  onSelect: (productId: string) => void;
  onDeselect: () => void;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<StyleCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  TOP: Shirt,
  BOTTOM: ShoppingBag,
  SHOES: Footprints,
  ACCESSORY: Watch,
};

export default function ProductSelectModal({
  isOpen,
  category,
  products,
  selectedId,
  onSelect,
  onDeselect,
  onClose,
}: ProductSelectModalProps) {
  const [query, setQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  // Reset filters when opened for a different category
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedBrand('All');
    }
  }, [isOpen, category]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique brands for filtering
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filter products by search and brand
  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.color && p.color.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      return matchesBrand && matchesQuery;
    });
  }, [products, query, selectedBrand]);

  if (!isOpen || !category) return null;

  const categoryMeta = STYLE_CATEGORIES.find((c) => c.id === category);
  const IconComponent = CATEGORY_ICONS[category];

  return (
    <div
      className="modalBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-category-title"
    >
      <div className="modalPanel glassPanel animateFadeUp">
        {/* MODAL HEADER */}
        <div className="modalHeader">
          <div className="modalHeaderLeft">
            <span className="categoryBadge">
              <IconComponent size={15} />
              {categoryMeta?.eyebrow || category}
            </span>
            <h2 id="modal-category-title">
              Select Your <em>{categoryMeta?.label || category}</em>
            </h2>
            <p className="modalSubtitle">
              {categoryMeta?.description} · {products.length} {products.length === 1 ? 'item' : 'items'} available
            </p>
          </div>

          <div className="modalHeaderRight">
            {selectedId && (
              <button
                type="button"
                className="btn btnLight btnSmall"
                onClick={() => {
                  onDeselect();
                  onClose();
                }}
              >
                Clear Selection
              </button>
            )}
            <button
              type="button"
              className="modalCloseBtn"
              onClick={onClose}
              aria-label="Close product selection panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SEARCH & BRAND FILTERS */}
        <div className="modalFilterBar">
          <div className="modalSearchBox">
            <Search size={16} className="modalSearchIcon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${categoryMeta?.label.toLowerCase()} by brand, color, or style...`}
              aria-label={`Search ${categoryMeta?.label} products`}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="clearSearchBtn"
                onClick={() => setQuery('')}
                aria-label="Clear search text"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {brands.length > 2 && (
            <div className="modalBrandChips">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`brandChip ${selectedBrand === b ? 'active' : ''}`}
                  onClick={() => setSelectedBrand(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT GRID */}
        <div className="modalProductList">
          {filteredProducts.length > 0 ? (
            <div className="modalProductGrid">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedId;

                return (
                  <article
                    key={p.id}
                    className={`modalProductCard ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onSelect(p.id);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(p.id);
                        onClose();
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    <div className="modalProductImgWrapper">
                      <Image
                        src={p.image}
                        alt={p.title}
                        width={300}
                        height={360}
                        className="modalProductImg"
                      />
                      {isSelected && (
                        <div className="selectedBadge">
                          <Check size={14} />
                          <span>Selected</span>
                        </div>
                      )}
                    </div>

                    <div className="modalProductInfo">
                      <div className="modalProductBrand">{p.brand}</div>
                      <h4 className="modalProductTitle">{p.title}</h4>

                      <div className="modalProductTags">
                        {p.color && <span className="productTag">{p.color}</span>}
                        {p.fit && <span className="productTag">{p.fit}</span>}
                      </div>

                      <div className="modalProductFooter">
                        <span className="modalProductPrice">{p.price}</span>
                        <button
                          type="button"
                          className={`btn ${isSelected ? 'btnDark' : 'btnLight'} btnSmall`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(p.id);
                            onClose();
                          }}
                        >
                          {isSelected ? 'Keep Piece' : 'Choose Piece'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="modalEmptyState">
              <Sparkles size={32} className="textMuted" />
              <h3>No {categoryMeta?.label.toLowerCase()} finds match your search</h3>
              <p>Try searching for a different color, brand or keyword.</p>
              {query && (
                <button
                  type="button"
                  className="btn btnLight btnSmall"
                  onClick={() => setQuery('')}
                  style={{ marginTop: 12 }}
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
