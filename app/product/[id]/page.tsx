'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldCheck, Sparkles, Tag, Check, Info } from 'lucide-react';
import { initialProducts, Product } from '../../../data';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [id, setId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then(async (resolved) => {
      setId(resolved.id);
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.products) {
            const found = data.products.find((p: Product) => p.id === resolved.id);
            if (found) {
              setProduct(found);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch product from API:', err);
      }

      // Fallback
      const fallback = initialProducts.find((p) => p.id === resolved.id) || null;
      setProduct(fallback);
      setIsLoading(false);

      // Record product view event
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product_view', productId: resolved.id }),
      }).catch(() => {});
    });
  }, [params]);

  if (isLoading || !id) {
    return (
      <main className="detail">
        <div className="shell">
          <div className="glassPanel accountLoading">Loading product details…</div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="detail">
        <div className="shell">
          <Link href="/" className="btn btnLight" style={{ marginBottom: 20 }}>
            <ArrowLeft size={15} /> Back to Catalog
          </Link>
          <div className="glassPanel emptyState">
            <h2>Product Not Found</h2>
            <p>The requested fashion find is unavailable or has been unpublished from the catalog.</p>
            <Link href="/" className="btn btnDark" style={{ marginTop: 16 }}>
              Browse Catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="detail">
      <div className="shell">
        <div className="detailNavRow">
          <Link href="/" className="btn btnLight">
            <ArrowLeft size={15} /> Back to Catalog
          </Link>
          <Link href="/style" className="btn btnLight">
            <Sparkles size={15} /> Style with this Item
          </Link>
        </div>

        <div className="detailGrid" style={{ marginTop: 24 }}>
          {/* Product Image */}
          <div className="detailImageWrap glassPanel">
            <img src={product.image} alt={product.title} className="detailMainImg" />
          </div>

          {/* Product Info & Purchase Action */}
          <div className="detailMetaSection">
            <div className="brandEyebrow">
              {product.brand} · {product.category} ({product.gender || 'MEN'})
            </div>
            <h1 className="detailTitleHeading">{product.title}</h1>

            <div className="detailPriceRow">
              <span className="detailPriceText">{product.price}</span>
              <span className="curatedBadge">
                <ShieldCheck size={14} /> Verified Catalog Find
              </span>
            </div>

            <p className="detailLead">{product.description}</p>

            {/* Direct Affiliate Shop Button */}
            <div className="detailActions">
              {product.affiliateUrl ? (
                <a
                  className="btn btnPrimaryHero"
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch('/api/track', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'affiliate_click',
                        productId: product.id,
                      }),
                    }).catch(() => {});
                  }}
                >
                  Shop on Amazon <ExternalLink size={16} />
                </a>
              ) : (
                <span className="btn btnDisabled">Direct Link Unavailable</span>
              )}
            </div>

            {/* Specifications Box */}
            <div className="glassPanel detailSpecsBox" style={{ marginTop: 28 }}>
              <div className="detailTitle">
                <h3>Verified Specifications</h3>
                {product.asin && <span className="asinBadge">ASIN: {product.asin}</span>}
              </div>

              <div className="specTable">
                {product.color && (
                  <div className="specRow">
                    <span>Colour</span>
                    <b>{product.color}</b>
                  </div>
                )}
                {product.fit && (
                  <div className="specRow">
                    <span>Fit Type</span>
                    <b>{product.fit}</b>
                  </div>
                )}
                {product.material && (
                  <div className="specRow">
                    <span>Material</span>
                    <b>{product.material}</b>
                  </div>
                )}
                {product.neck && (
                  <div className="specRow">
                    <span>Neck Style</span>
                    <b>{product.neck}</b>
                  </div>
                )}
                {product.sleeve && (
                  <div className="specRow">
                    <span>Sleeve Type</span>
                    <b>{product.sleeve}</b>
                  </div>
                )}
                {product.care && (
                  <div className="specRow">
                    <span>Care Instructions</span>
                    <b>{product.care}</b>
                  </div>
                )}
                {product.closure && (
                  <div className="specRow">
                    <span>Closure Type</span>
                    <b>{product.closure}</b>
                  </div>
                )}
                {product.country && (
                  <div className="specRow">
                    <span>Country of Origin</span>
                    <b>{product.country}</b>
                  </div>
                )}
                {(product.specs || []).map((s, i) => (
                  <div className="specRow" key={`${s.label}-${i}`}>
                    <span>{s.label}</span>
                    <b>{s.value}</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Retailer Disclaimer */}
            <div className="retailerDisclaimer">
              <Info size={16} />
              <span>
                FashionFind is an affiliate discovery engine. Product pricing, sizing availability, delivery, and stock
                are managed by Amazon and the respective merchant.
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
