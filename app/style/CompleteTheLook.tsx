'use client';

import React from 'react';
import Image from 'next/image';
import { Product } from '../../data';
import { StyleCategory } from '../../lib/categories';
import { Sparkles, Plus, ExternalLink, Check } from 'lucide-react';

interface CompleteTheLookProps {
  items: { product: Product; category: StyleCategory; reason: string }[];
  onAddPiece: (category: StyleCategory, product: Product) => void;
  activeProductIds: Set<string>;
}

export default function CompleteTheLook({
  items,
  onAddPiece,
  activeProductIds,
}: CompleteTheLookProps) {
  if (items.length === 0) return null;

  return (
    <div className="complete-the-look-wrapper">
      <div className="complete-look-header">
        <div className="complete-look-title-wrap">
          <Sparkles size={18} className="text-amber-400" />
          <h3 className="complete-look-title">Complete The Look</h3>
        </div>
        <span className="complete-look-badge">Catalog Matches</span>
      </div>

      <p className="complete-look-desc">
        Curated pieces matched from your FashionFind catalog to complement your current selections.
      </p>

      <div className="complete-look-grid">
        {items.map(({ product, category, reason }) => {
          const isAlreadyInLook = activeProductIds.has(product.id);

          return (
            <div key={product.id} className="recommendation-card">
              <div className="rec-card-thumb-frame">
                <Image
                  src={product.image || '/placeholder-product.png'}
                  alt={product.title}
                  width={120}
                  height={140}
                  className="rec-card-thumb-img"
                />
                <span className="rec-category-tag">{category}</span>
              </div>

              <div className="rec-card-content">
                <span className="rec-brand">{product.brand}</span>
                <h4 className="rec-title" title={product.title}>{product.title}</h4>
                <p className="rec-reason">{reason}</p>

                <div className="rec-card-actions">
                  <button
                    type="button"
                    className={`btn-add-to-look ${isAlreadyInLook ? 'is-active' : ''}`}
                    onClick={() => onAddPiece(category, product)}
                    disabled={isAlreadyInLook}
                  >
                    {isAlreadyInLook ? (
                      <>
                        <Check size={13} />
                        <span>In Your Look</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Add to Look</span>
                      </>
                    )}
                  </button>

                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-shop-affiliate-direct"
                    title="Shop on Amazon in new tab"
                  >
                    <span>Shop</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
