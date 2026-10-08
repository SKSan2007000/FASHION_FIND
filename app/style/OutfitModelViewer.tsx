'use client';

import React from 'react';
import Image from 'next/image';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shirt,
  ShoppingBag,
  Footprints,
  Watch,
  Layers,
} from 'lucide-react';
import { Product } from '../../data';
import { StyleCategory } from '../../lib/categories';

interface OutfitModelViewerProps {
  topProduct: Product | null;
  bottomProduct: Product | null;
  shoesProduct: Product | null;
  accessoryProduct: Product | null;
  onOpenSelector: (category: StyleCategory) => void;
}

export default function OutfitModelViewer({
  topProduct,
  bottomProduct,
  shoesProduct,
  accessoryProduct,
  onOpenSelector,
}: OutfitModelViewerProps) {
  const selectedCount = [topProduct, bottomProduct, shoesProduct, accessoryProduct].filter(Boolean).length;
  const hasCoreOutfit = Boolean(topProduct && bottomProduct && shoesProduct);

  const trackAffiliateClick = (productId: string) => {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'affiliate_click', productId }),
      }).catch(() => {});
    } catch {}
  };

  return (
    <div
      className="modelViewerSection glassPanel"
      role="region"
      aria-label="Editorial fashion model outfit preview"
    >
      {/* SECTION HEADER */}
      <div className="modelViewerHeader">
        <div className="modelViewerTitleGroup">
          <span className="eyebrow">
            <Sparkles size={13} />
            Fashion Studio Editorial
          </span>
          <h2>
            Your <em>Look.</em>
          </h2>
          <p className="modelViewerSubtitle">
            See your selected outfit together. Build and explore complete styles with genuine curated pieces.
          </p>
        </div>

        <div className="modelStatusPill">
          {hasCoreOutfit ? (
            <span className="statusTag complete">
              <CheckCircle2 size={14} />
              Complete Look ({selectedCount}/4 pieces)
            </span>
          ) : (
            <span className="statusTag inProgress">
              <AlertCircle size={14} />
              {selectedCount === 0
                ? 'Choose pieces below to build a look'
                : `${selectedCount} of 3 required pieces selected`}
            </span>
          )}
        </div>
      </div>

      {/* EDITORIAL MODEL STAGE & SELECTED PIECES SUMMARY */}
      <div className="editorialStageGrid">
        {/* REAL PHOTOREALISTIC HUMAN MODEL DISPLAY */}
        <div className="modelPhotoFrame">
          <div className="modelImageContainer">
            <Image
              src="/style-model/male-front.jpg"
              alt="FashionFind Editorial Model"
              width={700}
              height={980}
              className="editorialModelImg"
              priority
            />
            <div className="modelPhotoBadge">
              <b>FashionFind Studio</b>
              <span>Editorial Catalogue Lookbook</span>
            </div>
          </div>
        </div>

        {/* SIDEBAR: SELECTED LOOK DETAILS */}
        <div className="ensembleSidebar">
          <div className="ensembleHeader">
            <span className="sidebarEyebrow">
              <Layers size={14} />
              Active Selections
            </span>
            <h3>Ensemble Breakdown</h3>
            <p className="sidebarDesc">
              Pieces currently included in your signature look.
            </p>
          </div>

          <div className="selectedPiecesList">
            {/* TOP */}
            <div className={`selectedPieceRow ${topProduct ? 'active' : 'empty'}`}>
              <div className="pieceCategoryBadge">
                <Shirt size={14} />
                <span>TOP</span>
              </div>
              {topProduct ? (
                <div className="pieceRowContent">
                  <div className="pieceThumbWrap">
                    <Image
                      src={topProduct.image}
                      alt={topProduct.title}
                      width={60}
                      height={74}
                      className="pieceThumb"
                    />
                  </div>
                  <div className="pieceInfo">
                    <span className="pieceBrand">{topProduct.brand}</span>
                    <h5 className="pieceTitle">{topProduct.title}</h5>
                    <div className="pieceMeta">
                      {topProduct.color && <span className="chip">{topProduct.color}</span>}
                      <span className="piecePrice">{topProduct.price}</span>
                    </div>
                  </div>
                  <a
                    href={topProduct.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn btnDark btnSmall pieceShopBtn"
                    onClick={() => trackAffiliateClick(topProduct.id)}
                    aria-label={`Shop Top: ${topProduct.title} on Amazon`}
                  >
                    Shop Top <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div className="pieceEmptyContent">
                  <span className="emptyText">No top selected</span>
                  <button
                    type="button"
                    className="btn btnLight btnSmall"
                    onClick={() => onOpenSelector('TOP')}
                  >
                    Select Top
                  </button>
                </div>
              )}
            </div>

            {/* BOTTOM */}
            <div className={`selectedPieceRow ${bottomProduct ? 'active' : 'empty'}`}>
              <div className="pieceCategoryBadge">
                <ShoppingBag size={14} />
                <span>BOTTOM</span>
              </div>
              {bottomProduct ? (
                <div className="pieceRowContent">
                  <div className="pieceThumbWrap">
                    <Image
                      src={bottomProduct.image}
                      alt={bottomProduct.title}
                      width={60}
                      height={74}
                      className="pieceThumb"
                    />
                  </div>
                  <div className="pieceInfo">
                    <span className="pieceBrand">{bottomProduct.brand}</span>
                    <h5 className="pieceTitle">{bottomProduct.title}</h5>
                    <div className="pieceMeta">
                      {bottomProduct.color && <span className="chip">{bottomProduct.color}</span>}
                      <span className="piecePrice">{bottomProduct.price}</span>
                    </div>
                  </div>
                  <a
                    href={bottomProduct.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn btnDark btnSmall pieceShopBtn"
                    onClick={() => trackAffiliateClick(bottomProduct.id)}
                    aria-label={`Shop Bottom: ${bottomProduct.title} on Amazon`}
                  >
                    Shop Bottom <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div className="pieceEmptyContent">
                  <span className="emptyText">No bottom selected</span>
                  <button
                    type="button"
                    className="btn btnLight btnSmall"
                    onClick={() => onOpenSelector('BOTTOM')}
                  >
                    Select Bottom
                  </button>
                </div>
              )}
            </div>

            {/* SHOES */}
            <div className={`selectedPieceRow ${shoesProduct ? 'active' : 'empty'}`}>
              <div className="pieceCategoryBadge">
                <Footprints size={14} />
                <span>SHOES</span>
              </div>
              {shoesProduct ? (
                <div className="pieceRowContent">
                  <div className="pieceThumbWrap">
                    <Image
                      src={shoesProduct.image}
                      alt={shoesProduct.title}
                      width={60}
                      height={74}
                      className="pieceThumb"
                    />
                  </div>
                  <div className="pieceInfo">
                    <span className="pieceBrand">{shoesProduct.brand}</span>
                    <h5 className="pieceTitle">{shoesProduct.title}</h5>
                    <div className="pieceMeta">
                      {shoesProduct.color && <span className="chip">{shoesProduct.color}</span>}
                      <span className="piecePrice">{shoesProduct.price}</span>
                    </div>
                  </div>
                  <a
                    href={shoesProduct.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn btnDark btnSmall pieceShopBtn"
                    onClick={() => trackAffiliateClick(shoesProduct.id)}
                    aria-label={`Shop Shoes: ${shoesProduct.title} on Amazon`}
                  >
                    Shop Shoes <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div className="pieceEmptyContent">
                  <span className="emptyText">No shoes selected</span>
                  <button
                    type="button"
                    className="btn btnLight btnSmall"
                    onClick={() => onOpenSelector('SHOES')}
                  >
                    Select Shoes
                  </button>
                </div>
              )}
            </div>

            {/* ACCESSORY */}
            <div className={`selectedPieceRow ${accessoryProduct ? 'active' : 'empty'}`}>
              <div className="pieceCategoryBadge">
                <Watch size={14} />
                <span>ACCESSORY</span>
              </div>
              {accessoryProduct ? (
                <div className="pieceRowContent">
                  <div className="pieceThumbWrap">
                    <Image
                      src={accessoryProduct.image}
                      alt={accessoryProduct.title}
                      width={60}
                      height={74}
                      className="pieceThumb"
                    />
                  </div>
                  <div className="pieceInfo">
                    <span className="pieceBrand">{accessoryProduct.brand}</span>
                    <h5 className="pieceTitle">{accessoryProduct.title}</h5>
                    <div className="pieceMeta">
                      {accessoryProduct.color && <span className="chip">{accessoryProduct.color}</span>}
                      <span className="piecePrice">{accessoryProduct.price}</span>
                    </div>
                  </div>
                  <a
                    href={accessoryProduct.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn btnDark btnSmall pieceShopBtn"
                    onClick={() => trackAffiliateClick(accessoryProduct.id)}
                    aria-label={`Shop Accessory: ${accessoryProduct.title} on Amazon`}
                  >
                    Shop Accessory <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div className="pieceEmptyContent">
                  <span className="emptyText">Accessory optional</span>
                  <button
                    type="button"
                    className="btn btnLight btnSmall"
                    onClick={() => onOpenSelector('ACCESSORY')}
                  >
                    Add Accessory
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
