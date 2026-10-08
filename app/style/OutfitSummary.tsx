'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Shirt,
  Footprints,
  Watch,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../../data';
import { StyleCategory, STYLE_CATEGORIES } from '../../lib/categories';

interface OutfitSummaryProps {
  topProduct: Product | null;
  bottomProduct: Product | null;
  shoesProduct: Product | null;
  accessoryProduct: Product | null;
  onOpenSelector: (category: StyleCategory) => void;
  onReset: () => void;
  onSurpriseMe: () => void;
}

export default function OutfitSummary({
  topProduct,
  bottomProduct,
  shoesProduct,
  accessoryProduct,
  onOpenSelector,
  onReset,
  onSurpriseMe,
}: OutfitSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  const selectedItems = [
    { category: 'TOP' as StyleCategory, label: 'Top', product: topProduct, shopLabel: 'Shop Top', icon: Shirt },
    { category: 'BOTTOM' as StyleCategory, label: 'Bottom', product: bottomProduct, shopLabel: 'Shop Bottom', icon: ShoppingBag },
    { category: 'SHOES' as StyleCategory, label: 'Shoes', product: shoesProduct, shopLabel: 'Shop Shoes', icon: Footprints },
    { category: 'ACCESSORY' as StyleCategory, label: 'Accessory', product: accessoryProduct, shopLabel: 'Shop Accessory', icon: Watch },
  ];

  const presentCount = selectedItems.filter((i) => Boolean(i.product)).length;

  const trackClick = (productId: string) => {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'affiliate_click', productId }),
      }).catch(() => {});
    } catch {}
  };

  const handleShopAll = () => {
    setIsShopModalOpen(true);
  };

  const openAllAffiliateTabs = () => {
    const activeProducts = [topProduct, bottomProduct, shoesProduct, accessoryProduct].filter(
      Boolean
    ) as Product[];

    activeProducts.forEach((p) => {
      trackClick(p.id);
      if (typeof window !== 'undefined') {
        window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer');
      }
    });
  };

  const handleCopyLook = () => {
    if (typeof window === 'undefined') return;
    const lookSummary = selectedItems
      .filter((i) => i.product)
      .map((i) => `${i.label}: ${i.product?.brand} - ${i.product?.title} (${i.product?.affiliateUrl})`)
      .join('\n');

    navigator.clipboard.writeText(`FashionFind Look:\n${lookSummary}\n\nBuilt on FashionFind`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="outfitSummarySection" id="complete-look" aria-label="Outfit Summary and Shopping">
      <div className="glassPanel summaryCard">
        {/* SECTION HEADER */}
        <div className="summaryHeader">
          <div>
            <span className="eyebrow">
              <Sparkles size={13} />
              Curated Ensemble
            </span>
            <h2 className="summaryTitle">
              Your Complete <em>Look</em>
            </h2>
            <p className="summarySubtitle">
              Every selected piece is linked directly to its official Amazon retailer.
            </p>
          </div>

          <div className="summaryActionsTop">
            <button
              type="button"
              className="btn btnLight btnSmall"
              onClick={onSurpriseMe}
              title="Generate a stylish random outfit"
            >
              <Sparkles size={14} />
              Surprise Me
            </button>
            <button
              type="button"
              className="btn btnLight btnSmall"
              onClick={onReset}
              title="Clear all selections and reset look"
            >
              <RefreshCw size={14} />
              Reset Look
            </button>
            <button
              type="button"
              className="btn btnLight btnSmall"
              onClick={handleCopyLook}
              title="Copy outfit details to clipboard"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied Look!' : 'Share Look'}
            </button>
          </div>
        </div>

        {/* 4-COLUMN SUMMARY GRID */}
        <div className="summaryItemsGrid">
          {selectedItems.map(({ category, label, product, shopLabel, icon: IconComponent }) => {
            if (product) {
              return (
                <article className="summaryItemCard" key={category}>
                  <div className="summaryItemThumbnail">
                    <Image
                      src={product.image}
                      alt={product.title}
                      width={120}
                      height={150}
                      className="summaryThumbnailImg"
                    />
                    <span className="summaryCategoryPill">
                      <IconComponent size={12} />
                      {label}
                    </span>
                  </div>

                  <div className="summaryItemDetails">
                    <span className="summaryBrand">{product.brand}</span>
                    <h4 className="summaryProductTitle" title={product.title}>
                      {product.title}
                    </h4>

                    <div className="summaryMetaChips">
                      {product.color && <span className="chip">{product.color}</span>}
                      {product.fit && <span className="chip">{product.fit}</span>}
                    </div>

                    <span className="summaryPrice">{product.price}</span>

                    <div className="summaryItemCardActions">
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        className="btn btnDark btnSmall shopItemBtn"
                        onClick={() => trackClick(product.id)}
                        aria-label={`Shop ${label}: ${product.title} on Amazon`}
                      >
                        {shopLabel}
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        className="btnChangePiece"
                        onClick={() => onOpenSelector(category)}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </article>
              );
            }

            // Empty state for item
            const isAccessory = category === 'ACCESSORY';
            return (
              <div
                className={`summaryItemCard summaryItemEmpty ${isAccessory ? 'isOptional' : ''}`}
                key={category}
                onClick={() => onOpenSelector(category)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onOpenSelector(category);
                  }
                }}
              >
                <div className="emptySlotContent">
                  <div className="emptySlotIcon">
                    <IconComponent size={24} />
                  </div>
                  <span className="summaryCategoryPill">{label}</span>
                  <h5>{isAccessory ? 'Accessory optional' : `Add ${label}`}</h5>
                  <p>
                    {isAccessory
                      ? 'Watches, belts & sunglasses'
                      : 'Choose a piece to complete your look.'}
                  </p>
                  <button type="button" className="btn btnLight btnSmall" style={{ marginTop: 8 }}>
                    <Plus size={13} /> Select {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PRIMARY SHOPPING BANNER */}
        <div className="summaryBottomCTA">
          <div className="ctaInfo">
            <h3>Ready to wear your signature look?</h3>
            <p>
              {presentCount === 4
                ? 'All 4 pieces selected. Shop the complete look on Amazon with verified affiliate links.'
                : presentCount >= 3
                ? 'Your top, bottom and shoes are selected! Shop your look or add an optional accessory.'
                : 'Select your pieces above to build a complete 1-click shoppable outfit.'}
            </p>
          </div>

          <div className="ctaButtonGroup">
            <button
              type="button"
              className="btn btnDark btnLarge shopLookMainBtn"
              onClick={handleShopAll}
              disabled={presentCount === 0}
            >
              <span>Shop This Look</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* SHOPPING MODAL / CHECKOUT LIST */}
      {isShopModalOpen && (
        <div
          className="modalBackdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShopModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-look-modal-title"
        >
          <div className="modalPanel glassPanel animateFadeUp" style={{ maxWidth: 620 }}>
            <div className="modalHeader">
              <div>
                <span className="eyebrow">
                  <ShoppingBag size={13} />
                  Amazon Affiliate Checkout
                </span>
                <h2 id="shop-look-modal-title">
                  Shop <em>This Look</em>
                </h2>
                <p className="modalSubtitle">
                  Open individual items or open all selected products directly on Amazon.
                </p>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setIsShopModalOpen(false)}
                aria-label="Close shop look modal"
              >
                ×
              </button>
            </div>

            <div className="shopModalItemList">
              {selectedItems
                .filter((i) => i.product)
                .map(({ category, label, product, icon: IconComponent }) => {
                  if (!product) return null;
                  return (
                    <div className="shopModalItem" key={category}>
                      <Image
                        src={product.image}
                        alt={product.title}
                        width={64}
                        height={78}
                        className="shopModalThumb"
                      />
                      <div className="shopModalItemInfo">
                        <span className="shopModalCategory">{label} · {product.brand}</span>
                        <h4 className="shopModalTitle">{product.title}</h4>
                        <span className="shopModalPrice">{product.price}</span>
                      </div>
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        className="btn btnDark btnSmall"
                        onClick={() => trackClick(product.id)}
                      >
                        Buy on Amazon
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  );
                })}
            </div>

            <div className="shopModalFooter">
              <button
                type="button"
                className="btn btnDark btnLarge"
                onClick={openAllAffiliateTabs}
                style={{ width: '100%' }}
              >
                <span>Open All {presentCount} Items in Amazon Tabs</span>
                <ExternalLink size={17} />
              </button>
              <p className="disclosureText">
                FashionFind participates in the Amazon Associates Program. As an Amazon Associate,
                we earn from qualifying purchases at no extra cost to you.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
