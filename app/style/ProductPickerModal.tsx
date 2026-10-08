'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Product } from '../../data';
import { StyleCategory, ProductGender, normalizeStyleCategory, normalizeProductGender } from '../../lib/categories';
import { deduplicateProducts } from '../../lib/styling';
import { Search, X, Filter, ExternalLink, Check, Shirt, Layers, Footprints, Watch } from 'lucide-react';

interface ProductPickerModalProps {
  isOpen: boolean;
  category: StyleCategory | null;
  gender: ProductGender;
  catalog: Product[];
  currentSelectedId?: string;
  onSelectProduct: (category: StyleCategory, product: Product) => void;
  onClose: () => void;
}

const CATEGORY_NAMES: Record<StyleCategory, string> = {
  TOP: 'Tops (Shirts, Polos & Layers)',
  BOTTOM: 'Bottoms (Trousers, Jeans & Pants)',
  SHOES: 'Footwear (Shoes, Sneakers & Loafers)',
  ACCESSORY: 'Accessories (Watches, Belts & Eyewear)',
};

export default function ProductPickerModal({
  isOpen,
  category,
  gender,
  catalog,
  currentSelectedId,
  onSelectProduct,
  onClose,
}: ProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedColor, setSelectedColor] = useState<string>('ALL');

  // Filter catalog strictly for active gender and active category
  const filteredProducts = useMemo(() => {
    if (!category) return [];

    const deduped = deduplicateProducts(catalog);

    return deduped.filter((p) => {
      // 1. Strict Gender Match
      const prodGender = normalizeProductGender(p);
      if (prodGender !== gender) return false;

      // 2. Strict Category Match
      const prodCat = normalizeStyleCategory(p);
      if (prodCat !== category) return false;

      // 3. Brand Filter
      if (selectedBrand !== 'ALL' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }

      // 4. Color Filter
      if (selectedColor !== 'ALL' && (!p.color || !p.color.toLowerCase().includes(selectedColor.toLowerCase()))) {
        return false;
      }

      // 5. Real Search Query Match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const specText = (p.specs || []).map((s) => `${s.label}:${s.value}`).join(' ').toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchBrand = p.brand.toLowerCase().includes(query);
        const matchColor = (p.color || '').toLowerCase().includes(query);
        const matchDesc = (p.description || '').toLowerCase().includes(query);
        const matchSpec = specText.includes(query);

        if (!matchTitle && !matchBrand && !matchColor && !matchDesc && !matchSpec) {
          return false;
        }
      }

      return true;
    });
  }, [catalog, category, gender, searchQuery, selectedBrand, selectedColor]);

  // Available brands in this specific category + gender
  const availableBrands = useMemo(() => {
    if (!category) return [];
    const brands = new Set<string>();
    for (const p of catalog) {
      if (normalizeProductGender(p) === gender && normalizeStyleCategory(p) === category && p.brand) {
        brands.add(p.brand);
      }
    }
    return Array.from(brands);
  }, [catalog, category, gender]);

  // Available colors in this specific category + gender
  const availableColors = useMemo(() => {
    if (!category) return [];
    const colors = new Set<string>();
    for (const p of catalog) {
      if (normalizeProductGender(p) === gender && normalizeStyleCategory(p) === category && p.color) {
        colors.add(p.color);
      }
    }
    return Array.from(colors);
  }, [catalog, category, gender]);

  if (!isOpen || !category) return null;

  return (
    <div className="picker-modal-overlay" onClick={onClose}>
      <div className="picker-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="picker-modal-header">
          <div>
            <div className="picker-eyebrow">
              {gender === 'WOMEN' ? "Women's Collection" : "Men's Collection"} • {category}
            </div>
            <h3 className="picker-title">Select {CATEGORY_NAMES[category]}</h3>
          </div>
          <button type="button" className="picker-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="picker-controls-bar">
          <div className="picker-search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder={`Search ${gender.toLowerCase()} ${category.toLowerCase()} by name, brand, color, or style...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="picker-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="picker-filter-chips">
            {/* Brand Filter */}
            {availableBrands.length > 1 && (
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="picker-select-filter"
              >
                <option value="ALL">All Brands</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {/* Color Filter */}
            {availableColors.length > 1 && (
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="picker-select-filter"
              >
                <option value="ALL">All Colours</option>
                {availableColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="picker-results-count">
          <span>{filteredProducts.length} authentic {category.toLowerCase()} products found in catalog</span>
        </div>

        {/* Product Grid */}
        <div className="picker-product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isSelected = product.id === currentSelectedId;
              return (
                <div
                  key={product.id}
                  className={`picker-product-card ${isSelected ? 'is-current-selection' : ''}`}
                >
                  <div className="picker-thumb-wrapper">
                    <Image
                      src={product.image || '/placeholder-product.png'}
                      alt={product.title}
                      width={180}
                      height={200}
                      className="picker-product-thumb"
                    />
                    {isSelected && (
                      <div className="current-selection-badge">
                        <Check size={13} />
                        <span>Active in Look</span>
                      </div>
                    )}
                  </div>

                  <div className="picker-card-details">
                    <span className="picker-brand">{product.brand}</span>
                    <h4 className="picker-name" title={product.title}>{product.title}</h4>

                    <div className="picker-tags-row">
                      {product.color && <span className="spec-tag">{product.color}</span>}
                      {product.fit && <span className="spec-tag">{product.fit}</span>}
                    </div>

                    <div className="picker-card-actions">
                      <button
                        type="button"
                        className={`btn-choose-product ${isSelected ? 'already-selected' : ''}`}
                        onClick={() => {
                          onSelectProduct(category, product);
                          onClose();
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select for Look'}
                      </button>

                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-picker-affiliate"
                        title="Shop on Amazon in new tab"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="picker-empty-state">
              <p className="picker-empty-title">
                No matching {category.toLowerCase()} is currently available in your FashionFind catalog.
              </p>
              <p className="picker-empty-sub">
                FashionFind only recommends genuine products added through your catalog/admin dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
