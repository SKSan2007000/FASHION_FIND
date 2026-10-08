'use client';

import React from 'react';
import Image from 'next/image';
import { ProductGender, StyleCategory } from '../../lib/categories';
import { StyleSlotState } from '../../lib/styling';
import { ExternalLink, Lock, Sparkles, CheckCircle2, Shirt, Layers, Footprints, Watch } from 'lucide-react';

interface OutfitModelViewProps {
  gender: ProductGender;
  slots: Record<StyleCategory, StyleSlotState>;
  onSelectCategory: (category: StyleCategory) => void;
}

const CATEGORY_ICONS: Record<StyleCategory, React.ReactNode> = {
  TOP: <Shirt size={14} />,
  BOTTOM: <Layers size={14} />,
  SHOES: <Footprints size={14} />,
  ACCESSORY: <Watch size={14} />,
};

export default function OutfitModelView({
  gender,
  slots,
  onSelectCategory,
}: OutfitModelViewProps) {
  const modelSrc =
    gender === 'WOMEN'
      ? '/style-models/women/female-body.jpg'
      : '/style-models/men/male-body.jpg';

  const selectedCount = Object.values(slots).filter((s) => s.product !== null).length;
  const topItem = slots.TOP.product;
  const bottomItem = slots.BOTTOM.product;
  const shoesItem = slots.SHOES.product;
  const accessoryItem = slots.ACCESSORY.product;

  return (
    <div className="outfit-model-hero-card">
      {/* Studio Header Banner */}
      <div className="model-view-topbar">
        <div className="model-view-badge">
          <span className="live-dot" />
          <span className="badge-text">
            {gender === 'WOMEN' ? "Women's Studio Editorial" : "Men's Studio Editorial"}
          </span>
        </div>
        <div className="model-view-info-pill">
          <Sparkles size={13} className="text-amber-400" />
          <span>Faceless Human Model View</span>
        </div>
      </div>

      {/* Main Faceless Human Model Container */}
      <div className="model-stage-wrapper">
        <div className="model-image-frame">
          <Image
            src={modelSrc}
            alt={`${gender === 'WOMEN' ? 'Female' : 'Male'} fashion model body framed from neck to feet`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="model-hero-img"
          />

          <div className="model-editorial-vignette" />

          {/* Interactive Outfit Tag Overlay */}
          <div className="model-overlay-tags">
            {/* Top Tag */}
            {topItem && (
              <button
                type="button"
                className="outfit-pin-tag tag-top"
                onClick={() => onSelectCategory('TOP')}
                title={`Top: ${topItem.title}`}
              >
                <span className="pin-icon">{CATEGORY_ICONS.TOP}</span>
                <div className="pin-details">
                  <span className="pin-category">TOP</span>
                  <span className="pin-title">{topItem.brand} — {topItem.color || 'Solid'}</span>
                </div>
                {slots.TOP.isLocked ? (
                  <Lock size={12} className="pin-lock locked" />
                ) : (
                  <Sparkles size={12} className="pin-lock auto" />
                )}
              </button>
            )}

            {/* Bottom Tag */}
            {bottomItem && (
              <button
                type="button"
                className="outfit-pin-tag tag-bottom"
                onClick={() => onSelectCategory('BOTTOM')}
                title={`Bottom: ${bottomItem.title}`}
              >
                <span className="pin-icon">{CATEGORY_ICONS.BOTTOM}</span>
                <div className="pin-details">
                  <span className="pin-category">BOTTOM</span>
                  <span className="pin-title">{bottomItem.brand} — {bottomItem.color || 'Standard'}</span>
                </div>
                {slots.BOTTOM.isLocked ? (
                  <Lock size={12} className="pin-lock locked" />
                ) : (
                  <Sparkles size={12} className="pin-lock auto" />
                )}
              </button>
            )}

            {/* Shoes Tag */}
            {shoesItem && (
              <button
                type="button"
                className="outfit-pin-tag tag-shoes"
                onClick={() => onSelectCategory('SHOES')}
                title={`Shoes: ${shoesItem.title}`}
              >
                <span className="pin-icon">{CATEGORY_ICONS.SHOES}</span>
                <div className="pin-details">
                  <span className="pin-category">SHOES</span>
                  <span className="pin-title">{shoesItem.brand}</span>
                </div>
                {slots.SHOES.isLocked ? (
                  <Lock size={12} className="pin-lock locked" />
                ) : (
                  <Sparkles size={12} className="pin-lock auto" />
                )}
              </button>
            )}

            {/* Accessory Tag */}
            {accessoryItem && (
              <button
                type="button"
                className="outfit-pin-tag tag-accessory"
                onClick={() => onSelectCategory('ACCESSORY')}
                title={`Accessory: ${accessoryItem.title}`}
              >
                <span className="pin-icon">{CATEGORY_ICONS.ACCESSORY}</span>
                <div className="pin-details">
                  <span className="pin-category">ACCESSORY</span>
                  <span className="pin-title">{accessoryItem.brand}</span>
                </div>
                {slots.ACCESSORY.isLocked ? (
                  <Lock size={12} className="pin-lock locked" />
                ) : (
                  <Sparkles size={12} className="pin-lock auto" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Floating Active Look Drawer on Mobile/Desktop bottom */}
        <div className="model-stage-footer">
          <div className="look-composition-chips">
            {(['TOP', 'BOTTOM', 'SHOES', 'ACCESSORY'] as StyleCategory[]).map((cat) => {
              const slot = slots[cat];
              const p = slot.product;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`composition-chip ${p ? 'has-item' : 'empty'} ${slot.isLocked ? 'locked' : 'unlocked'}`}
                  onClick={() => onSelectCategory(cat)}
                >
                  <span className="chip-cat-icon">{CATEGORY_ICONS[cat]}</span>
                  <div className="chip-text">
                    <span className="chip-category">{cat}</span>
                    <span className="chip-name">{p ? p.brand : 'Not Selected'}</span>
                  </div>
                  {p && (
                    <span className="chip-status-dot" title={slot.isLocked ? 'Your selection' : 'Auto suggested'} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="tryon-status-bar">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="tryon-status-text">
              {selectedCount > 0
                ? `${selectedCount} pieces styled from genuine FashionFind catalog`
                : 'Choose a piece below to generate your complete look'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
