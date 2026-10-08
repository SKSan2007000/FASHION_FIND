'use client';

import React from 'react';
import Image from 'next/image';
import { STYLE_CATEGORIES, StyleCategory, ProductGender } from '../../lib/categories';
import { StyleSlotState } from '../../lib/styling';
import { Lock, Unlock, ExternalLink, RefreshCw, Shirt, Layers, Footprints, Watch, Plus, Check } from 'lucide-react';

interface CategoryStepSelectorProps {
  gender: ProductGender;
  slots: Record<StyleCategory, StyleSlotState>;
  onOpenPicker: (category: StyleCategory) => void;
  onToggleLock: (category: StyleCategory) => void;
  onClearSlot: (category: StyleCategory) => void;
}

const STEP_NUMBERS: Record<StyleCategory, string> = {
  TOP: 'STEP 2',
  BOTTOM: 'STEP 3',
  SHOES: 'STEP 4',
  ACCESSORY: 'STEP 5 (OPTIONAL)',
};

const CATEGORY_ICONS: Record<StyleCategory, React.ReactNode> = {
  TOP: <Shirt size={18} />,
  BOTTOM: <Layers size={18} />,
  SHOES: <Footprints size={18} />,
  ACCESSORY: <Watch size={18} />,
};

export default function CategoryStepSelector({
  gender,
  slots,
  onOpenPicker,
  onToggleLock,
  onClearSlot,
}: CategoryStepSelectorProps) {
  return (
    <div className="category-steps-wrapper">
      <div className="category-steps-header">
        <h3 className="section-title">Build Your Outfit</h3>
        <p className="section-subtitle">
          Select or customize each slot. Locked items are preserved while auto-suggestions adapt to your choices.
        </p>
      </div>

      <div className="category-steps-list">
        {STYLE_CATEGORIES.map((catInfo) => {
          const cat = catInfo.id;
          const slot = slots[cat];
          const product = slot.product;
          const stepNum = STEP_NUMBERS[cat];
          const icon = CATEGORY_ICONS[cat];

          return (
            <div
              key={cat}
              className={`category-step-card ${product ? 'has-product' : 'empty'} ${slot.isLocked ? 'is-locked' : 'is-suggested'}`}
            >
              {/* Step Card Header */}
              <div className="step-card-header">
                <div className="step-header-left">
                  <span className="step-num-badge">{stepNum}</span>
                  <div className="step-cat-heading">
                    <span className="step-icon">{icon}</span>
                    <h4 className="step-title">{catInfo.label}</h4>
                  </div>
                </div>

                <div className="step-header-right">
                  {product && (
                    <button
                      type="button"
                      className={`lock-toggle-button ${slot.isLocked ? 'locked' : 'unlocked'}`}
                      onClick={() => onToggleLock(cat)}
                      title={slot.isLocked ? 'User locked piece (click to unlock)' : 'Auto suggested piece (click to lock)'}
                    >
                      {slot.isLocked ? (
                        <>
                          <Lock size={13} />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={13} />
                          <span>Auto Suggested</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Step Card Content */}
              {product ? (
                <div className="step-product-content">
                  <div className="step-product-thumb-frame">
                    <Image
                      src={product.image || '/placeholder-product.png'}
                      alt={product.title}
                      width={100}
                      height={100}
                      className="step-product-thumb-img"
                    />
                  </div>

                  <div className="step-product-info">
                    <div className="product-brand-line">{product.brand}</div>
                    <div className="product-title-line" title={product.title}>{product.title}</div>

                    <div className="product-meta-badges">
                      {product.color && <span className="meta-badge color">{product.color}</span>}
                      {product.fit && <span className="meta-badge fit">{product.fit}</span>}
                      <span className="meta-badge catalog">Catalog Item</span>
                    </div>

                    {slot.suggestionReason && !slot.isLocked && (
                      <div className="recommendation-explanation-note">
                        {slot.suggestionReason}
                      </div>
                    )}

                    {/* Step Action Buttons */}
                    <div className="step-product-actions">
                      {/* Change / Browse Catalog */}
                      <button
                        type="button"
                        className="btn-step-action change-btn"
                        onClick={() => onOpenPicker(cat)}
                      >
                        <RefreshCw size={13} />
                        <span>Change</span>
                      </button>

                      {/* Direct Affiliate Shop Button */}
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-step-action shop-affiliate-btn"
                      >
                        <span>Shop on Amazon</span>
                        <ExternalLink size={13} />
                      </a>

                      {/* Optional Remove button for accessory */}
                      {cat === 'ACCESSORY' && (
                        <button
                          type="button"
                          className="btn-step-action remove-btn"
                          onClick={() => onClearSlot(cat)}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="step-empty-content">
                  <p className="empty-message-text">
                    {cat === 'ACCESSORY'
                      ? 'No accessory selected. Optional finishing touch.'
                      : `No matching ${cat.toLowerCase()} is currently available in your FashionFind catalog.`}
                  </p>
                  <button
                    type="button"
                    className="btn-browse-catalog"
                    onClick={() => onOpenPicker(cat)}
                  >
                    <Plus size={15} />
                    <span>Select {catInfo.label} from Catalog</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
