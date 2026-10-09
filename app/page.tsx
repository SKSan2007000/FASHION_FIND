'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  Layers,
  Shirt,
  ShoppingBag,
  Star,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { initialProducts, Product } from '../data';
import { OCCASIONS_DATA } from '../lib/recommendations';
import { normalizeStyleCategory, normalizeProductGender } from '../lib/categories';

const CATEGORY_TABS = [
  { id: 'All', label: 'All Pieces' },
  { id: 'Men', label: "Men's Collection" },
  { id: 'Women', label: "Women's Collection" },
  { id: 'Shirts', label: 'Shirts & Tops' },
  { id: 'Shoes', label: 'Footwear' },
  { id: 'Accessories', label: 'Accessories' },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'MEN' | 'WOMEN'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Sync search param (e.g. ?gender=MEN)
  useEffect(() => {
    const g = searchParams.get('gender');
    if (g === 'MEN') {
      setSelectedGender('MEN');
      setActiveTab('Men');
    } else if (g === 'WOMEN') {
      setSelectedGender('WOMEN');
      setActiveTab('Women');
    }
  }, [searchParams]);

  // Load products from API / DB
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.products && data.products.length > 0) {
            setProducts(data.products);
          }
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setIsLoading(false);
      }

      // Record page visit
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('ff_visited')) {
        sessionStorage.setItem('ff_visited', '1');
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'visit', path: '/' }),
        }).catch(() => {});
      }
    }
    fetchCatalog();
  }, []);

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Gender filter
      const pGender = normalizeProductGender(p);
      if (selectedGender !== 'ALL') {
        if (pGender !== selectedGender && pGender !== 'UNISEX') return false;
      }

      // 2. Category Tab filter
      if (activeTab === 'Men' && pGender !== 'MEN' && pGender !== 'UNISEX') return false;
      if (activeTab === 'Women' && pGender !== 'WOMEN' && pGender !== 'UNISEX') return false;
      if (activeTab === 'Shirts') {
        const cat = normalizeStyleCategory(p);
        if (cat !== 'TOP') return false;
      }
      if (activeTab === 'Shoes') {
        const cat = normalizeStyleCategory(p);
        if (cat !== 'SHOES') return false;
      }
      if (activeTab === 'Accessories') {
        const cat = normalizeStyleCategory(p);
        if (cat !== 'ACCESSORY') return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        const matchesColor = p.color?.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesAsin = p.asin?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBrand && !matchesCategory && !matchesColor && !matchesDesc && !matchesAsin) {
          return false;
        }
      }

      // 4. Color filter
      if (selectedColor !== 'All') {
        if (!p.color || !p.color.toLowerCase().includes(selectedColor.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [products, activeTab, selectedGender, searchQuery, selectedColor]);

  // Extract unique colors for filter
  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((p) => {
      if (p.color) colors.add(p.color.trim());
    });
    return Array.from(colors);
  }, [products]);

  // Genuine Trending items (curated top items from catalog)
  const trendingProducts = useMemo(() => {
    return products.slice(0, 3);
  }, [products]);

  // Separate Men and Women products for dedicated sections
  const menProducts = useMemo(() => {
    return products.filter((p) => {
      const g = normalizeProductGender(p);
      return g === 'MEN' || g === 'UNISEX';
    });
  }, [products]);

  const womenProducts = useMemo(() => {
    return products.filter((p) => {
      const g = normalizeProductGender(p);
      return g === 'WOMEN' || g === 'UNISEX';
    });
  }, [products]);

  return (
    <main className="homePage">
      {/* 1. HERO SECTION */}
      <section className="heroSection">
        <div className="shell heroShell">
          <div className="heroContent">
            <div className="heroBadge">
              <Sparkles size={14} /> EDITORIAL FASHION DISCOVERY & STYLING
            </div>
            <h1 className="heroTitle">
              Discover Fashion <br />
              <span className="heroItalic">Worth Wearing.</span>
            </h1>
            <p className="heroLead">
              Curated Amazon finds, occasion-based styling intelligence, and verified wardrobe
              combinations. Shop genuine products with direct retailer links.
            </p>
            <div className="heroCTA">
              <Link href="/style" className="btn btnPrimaryHero">
                <Sparkles size={18} /> CHOOSE MY FASHION <ArrowRight size={18} />
              </Link>
              <a href="#collection" className="btn btnSecondaryHero">
                BROWSE CATALOG
              </a>
            </div>
          </div>

          <div className="heroFeaturedCard glassPanel">
            <div className="featuredCardHeader">
              <span className="featuredBadge">FEATURED STYLING FIND</span>
              <span className="featuredOccasion">Smart Casual · All-Season</span>
            </div>
            {products[0] && (
              <div className="featuredProductPreview">
                <div className="featuredImgWrap">
                  <img src={products[0].image} alt={products[0].title} />
                </div>
                <div className="featuredMeta">
                  <span className="featuredBrand">{products[0].brand}</span>
                  <h3>{products[0].title}</h3>
                  <p>{products[0].description}</p>
                  <div className="featuredPriceRow">
                    <span className="priceLabel">{products[0].price}</span>
                    <a
                      href={products[0].affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btnShop"
                    >
                      Shop on Amazon <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. CHOOSE MY FASHION ENTRY SECTION */}
      <section className="chooseEntrySection">
        <div className="shell">
          <div className="chooseEntryBanner glassPanel">
            <div className="chooseEntryText">
              <span className="eyebrow">
                <Sparkles size={14} /> SMART OUTFIT RECOMMENDATIONS
              </span>
              <h2>Where are you going? We&apos;ll find the pieces.</h2>
              <p>
                Select your gender, occasion, and styling direction. Our scoring engine pairs genuine
                catalog products into complete, cohesive looks.
              </p>
            </div>
            <div className="chooseEntryPills">
              {OCCASIONS_DATA.slice(0, 6).map((occ) => (
                <Link
                  key={occ.id}
                  href={`/style?occasion=${occ.id}`}
                  className="occasionPill"
                >
                  {occ.name}
                </Link>
              ))}
              <Link href="/style" className="btn btnDark chooseBtn">
                Start Styling <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRENDING NOW (Genuine Catalog Only) */}
      <section className="trendingSection">
        <div className="shell">
          <div className="sectionHeader">
            <div>
              <span className="eyebrow">
                <Star size={14} /> VERIFIED FINDS
              </span>
              <h2>Trending Now in Catalog</h2>
              <p>Editorially curated genuine pieces from our verified PostgreSQL catalog.</p>
            </div>
          </div>

          <div className="productGrid">
            {trendingProducts.map((product) => (
              <div key={product.id} className="productCard">
                <div className="productImageContainer">
                  <img src={product.image} alt={product.title} />
                  <span className="categoryBadge">{product.category}</span>
                </div>
                <div className="productCardContent">
                  <span className="productBrand">{product.brand}</span>
                  <h3 className="productTitle">
                    <Link href={`/product/${product.id}`}>{product.title}</Link>
                  </h3>
                  <p className="productDesc">{product.description}</p>
                  <div className="productCardFooter">
                    <span className="productPrice">{product.price}</span>
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btnShop"
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
                      Shop Now <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MAIN COLLECTION & REAL CATALOG SEARCH */}
      <section className="collectionSection" id="collection">
        <div className="shell">
          <div className="sectionHeader" id="search">
            <div>
              <span className="eyebrow">
                <Layers size={14} /> FULL DISCOVERY
              </span>
              <h2>Explore The Catalog</h2>
              <p>Search by title, brand, specifications, category, gender, or color.</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="searchFilterContainer">
            <div className="searchBar">
              <Search size={18} className="searchIcon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, brand, material, color, or ASIN..."
              />
              {searchQuery && (
                <button className="clearBtn" onClick={() => setSearchQuery('')}>
                  Clear
                </button>
              )}
            </div>

            {/* Faceted Filters */}
            <div className="filterRow">
              <div className="filterGroup">
                <span className="filterLabel">Gender:</span>
                <button
                  className={`filterChip ${selectedGender === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedGender('ALL')}
                >
                  All
                </button>
                <button
                  className={`filterChip ${selectedGender === 'MEN' ? 'active' : ''}`}
                  onClick={() => setSelectedGender('MEN')}
                >
                  Men
                </button>
                <button
                  className={`filterChip ${selectedGender === 'WOMEN' ? 'active' : ''}`}
                  onClick={() => setSelectedGender('WOMEN')}
                >
                  Women
                </button>
              </div>

              {availableColors.length > 0 && (
                <div className="filterGroup">
                  <span className="filterLabel">Color:</span>
                  <select
                    className="filterSelect"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    <option value="All">All Colors</option>
                    {availableColors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <div className="categoryTabs">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`categoryTab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="productGrid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="productCard">
                  <div className="productImageContainer">
                    <img src={product.image} alt={product.title} />
                    <span className="categoryBadge">{product.category}</span>
                  </div>
                  <div className="productCardContent">
                    <div className="productTopMeta">
                      <span className="productBrand">{product.brand}</span>
                      {product.color && <span className="productColorTag">{product.color}</span>}
                    </div>
                    <h3 className="productTitle">
                      <Link href={`/product/${product.id}`}>{product.title}</Link>
                    </h3>
                    <p className="productDesc">{product.description}</p>
                    <div className="productCardFooter">
                      <span className="productPrice">{product.price}</span>
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btnShop"
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
                        Shop Now <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <h3>No products found</h3>
              <p>Try adjusting your search query, gender filter, or category selection.</p>
              <button
                className="btn btnDark"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGender('ALL');
                  setActiveTab('All');
                  setSelectedColor('All');
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. AFFILIATE DISCLOSURE BANNER */}
      <section className="disclosureSection">
        <div className="shell">
          <div className="disclosureBanner">
            <ShieldCheck size={22} className="textMuted" style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
            <div className="disclosureText">
              <strong>Transparent Affiliate Disclosure</strong>
              <p>
                FashionFind may earn a commission from qualifying purchases made through affiliate links,
                at no additional cost to you. We only recommend genuine, verified pieces from our catalog.
                Product prices and availability are managed directly by Amazon and participating retailers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EDITORIAL FOOTER */}
      <footer className="siteFooter">
        <div className="shell footerShell">
          <div className="footerCol">
            <Link className="footerLogo" href="/">
              FASHIONFIND<span className="dot">•</span>
            </Link>
            <p className="footerAbout">
              Editorial fashion discovery, smart outfit recommendations, and curated Amazon finds
              powered by verified product metadata.
            </p>
            <span className="copyright">© 2026 FashionFind Inc. All rights reserved.</span>
          </div>

          <div className="footerCol">
            <h4>Styling & Discovery</h4>
            <Link href="/style">Choose My Fashion</Link>
            <Link href="/?gender=MEN">Men&apos;s Collection</Link>
            <Link href="/?gender=WOMEN">Women&apos;s Collection</Link>
            <Link href="/#search">Catalog Search</Link>
          </div>

          <div className="footerCol">
            <h4>Account & Security</h4>
            <Link href="/auth">Sign In / Register</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/admin">Admin Control Room</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="shell" style={{ padding: '60px 0', textAlign: 'center' }}>Loading FashionFind…</div>}>
      <HomeContent />
    </Suspense>
  );
}