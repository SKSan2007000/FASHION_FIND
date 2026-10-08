'use client';

import React from 'react';
import Image from 'next/image';
import { StyleCategory, ProductGender, STYLE_CATEGORIES } from '../../lib/categories';
import { StyleSlotState } from '../../lib/styling';
import { ExternalLink, Lock, Unlock, ShoppingBag, ArrowUpRight, Shirt, Layers, Footprints, Watch } from 'lucide-react';

interface OutfitSummaryProps {
  gender: ProductGender;
  slots: Record<StyleCategory, StyleSlotState>;
  onToggleLock: (category: StyleCategory) => void;
  onOpenPicker: (category: StyleCategory) => void;
}

const CATEGORY_ICONS: Record<StyleCategory, React.ReactNode> = {
  TOP: <Shirt size={15} />,
  BOTTOM: <Layers size={15} />,
  SHOES: <Footprints size={15} />,
  ACCESSORY: <Watch size={15} />,
};

export default function OutfitSummary({
  gender,
  slots,
  onToggleLock,
  onOpenPicker,
}: OutfitSummaryProps) {
  const activeEntries = Object.entries(slots).filter(([_, slot]) => slot.product !== null) as [StyleCategory, StyleSlotState][];

  return (
    <div className="outfit-summary-panel">
      <div className="outfit-summary-header">
        <div className="summary-title-wrap">
          <ShoppingBag size={20} className="text-amber-400" />
          <h3 className="summary-title">Your Look</h3>
        </div>
        <span className="summary-pieces-count">
          {activeEntries.length} of 4 items selected
        </span>
      </div>

      {/* Itemized breakdown cards */}
      <div className="summary-pieces-list">
        {STYLE_CATEGORIES.map((catInfo) => {
          const cat = catInfo.id;
          const slot = slots[cat];
          const product = slot.product;

          return (
            <div key={cat} className={`summary-piece-row ${product ? 'is-active' : 'is-empty'}`}>
              <div className="piece-row-cat-col">
                <span className="piece-icon">{CATEGORY_ICONS[cat]}</span>
                <span className="piece-cat-name">{catInfo.label}</span>
              </div>

              {product ? (
                <div className="piece-row-details">
                  <div className="piece-thumb-box">
                    <Image
                      src={product.image || '/placeholder-product.png'}
                      alt={product.title}
                      width={50}
                      height={50}
                      className="piece-thumb-img"
                    />
                  </div>

                  <div className="piece-text-col">
                    <span className="piece-brand">{product.brand}</span>
                    <h5 className="piece-title" title={product.title}>{product.title}</h5>
                    <div className="piece-status-tags">
                      {slot.isLocked ? (
                        <span className="status-badge user-locked">
                          <Lock size={10} />
                          <span>Your Selection</span>
                        </span>
                      ) : (
                        <span className="status-badge auto-match">
                          <Unlock size={10} />
                          <span>Auto Matched</span>
                        </span>
                      )}
                      {product.color && <span className="status-badge color-pill">{product.color}</span>}
                    </div>
                  </div>

                  <div className="piece-action-col">
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-summary-shop"
                      title="Shop on Amazon"
                    >
                      <span>Shop</span>
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="piece-row-empty">
                  <span className="empty-slot-text">
                    {cat === 'ACCESSORY' ? 'Not selected (optional)' : 'Not available yet'}
                  </span>
                  <button
                    type="button"
                    className="btn-select-slot-quick"
                    onClick={() => onOpenPicker(cat)}
                  >
                    Select
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SHOP THIS LOOK (Itemized direct affiliate section) */}
      {activeEntries.length > 0 && (
        <div className="shop-this-look-section">
          <div className="shop-look-title-bar">
            <h4 className="shop-look-heading">SHOP THIS LOOK</h4>
            <span className="shop-look-sub">Individual verified Amazon affiliate links</span>
          </div>

          <div className="shop-look-buttons-grid">
            {activeEntries.map(([cat, slot]) => {
              const p = slot.product!;
              return (
                <a
                  key={p.id}
                  href={p.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shop-individual-link-card"
                >
                  <div className="shop-link-left">
                    <span className="shop-link-cat">{cat}</span>
                    <span className="shop-link-title">{p.brand} — {p.title}</span>
                  </div>
                  <span className="shop-link-btn">
                    <span>Shop on Amazon</span>
                    <ExternalLink size={13} />
                  </span>
                </a>
              );
            })}
          </div>

          <p className="shop-look-disclaimer">
            Every product link directs to its exact official Amazon listing. FashionFind earns a commission through verified qualifying purchases at no additional cost to you.
          </p>
        </div>
      )}
    </div>
  );
}
