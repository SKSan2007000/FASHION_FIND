'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import { initialProducts, Product } from '../data';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      /*
       * Load products from Supabase when configured.
       * If Supabase is unavailable, fall back to localStorage.
       */
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

          if (!error && data?.length && mounted) {
            const map = new Map<string, Product>();

            [...initialProducts, ...(data as Product[])].forEach((product) => {
              map.set(product.id, product);
            });

            setProducts([...map.values()]);
          }
        } catch (error) {
          console.error('Failed to load Supabase products:', error);
        }
      } else {
        try {
          const storedProducts = localStorage.getItem(
            'fashionfind-products'
          );

          if (storedProducts && mounted) {
            const parsedProducts = JSON.parse(storedProducts) as Product[];

            const map = new Map<string, Product>();

            [...initialProducts, ...parsedProducts].forEach((product) => {
              map.set(product.id, product);
            });

            setProducts([...map.values()]);
          }
        } catch (error) {
          console.error('Failed to load local products:', error);
        }
      }

      /*
       * Record one visit per browser session.
       */
      try {
        if (!sessionStorage.getItem('ff-visit-recorded')) {
          sessionStorage.setItem('ff-visit-recorded', '1');

          if (!supabase) {
            const currentVisits = Number(
              localStorage.getItem('ff-visits') || '0'
            );

            localStorage.setItem(
              'ff-visits',
              String(currentVisits + 1)
            );
          }

          try {
            await fetch('/api/track', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                type: 'visit',
              }),
            });
          } catch (error) {
            console.error('Visit tracking failed:', error);
          }
        }
      } catch (error) {
        console.error('Session tracking failed:', error);
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return products.filter((product) => {
      const matchesCategory =
        category === 'All' ||
        product.category === category ||
        (category === 'Men' &&
          product.category.toLowerCase().includes('men')) ||
        (category === 'Women' &&
          product.category.toLowerCase().includes('women')) ||
        (category === 'Trending' &&
          product.specs?.some((spec) =>
            /rank|reviews/i.test(spec.label)
          )) ||
        (category === 'Deals' &&
          product.price !== 'See latest price on Amazon');

      const searchableText = `
        ${product.title}
        ${product.brand}
        ${product.category}
        ${product.description}
        ${product.color || ''}
        ${product.fit || ''}
        ${product.material || ''}
      `.toLowerCase();

      return (
        matchesCategory &&
        searchableText.includes(normalizedQuery)
      );
    });
  }, [products, query, category]);

  const categories = [
    'All',
    'Men',
    'Women',
    'Shoes',
    'Accessories',
    'Trending',
    'Deals',
  ];

  const heroProduct = products[0] || initialProducts[0];

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="shell heroGrid">
          <div>
            <span className="eyebrow">
              ● Curated for your style
            </span>

            <h1>
              Find Your Next <em>Favorite Look.</em>
            </h1>

            <p>
              Discover fashion worth wearing. Explore curated styles,
              build complete looks and shop with confidence.
            </p>

            <div className="actions">
              <a
                className="btn btnDark"
                href="#collection"
              >
                Explore Fashion
                <ArrowRight size={16} />
              </a>

              <Link
                className="btn btnLight"
                href="/style"
              >
                <Wand2 size={16} />
                Create My Style
              </Link>
            </div>

            <div className="stats">
              <div>
                <strong>{products.length}+</strong>
                <span>Curated picks</span>
              </div>

              <div>
                <strong>24/7</strong>
                <span>Style discovery</span>
              </div>

              <div>
                <strong>1-click</strong>
                <span>Amazon shopping</span>
              </div>
            </div>
          </div>

          <div className="heroCard">
            <Image
              src={heroProduct.image}
              alt={heroProduct.title}
              width={659}
              height={879}
              priority
            />

            <div className="floating">
              <b>Editor's Pick</b>
              <br />
              <span>
                {heroProduct.color || 'Signature'} •{' '}
                {heroProduct.fit || 'Curated Fit'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT COLLECTION */}
      <section
        className="section"
        id="collection"
      >
        <div className="shell">
          <div className="sectionHead">
            <div>
              <h2>Freshly curated</h2>
              <p>
                Everyday pieces, organized by category and
                ready to discover.
              </p>
            </div>

            <div className="glassPanel searchPanel">
              <SlidersHorizontal size={15} />

              <input
                aria-label="Search products"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search finds..."
              />
            </div>
          </div>

          {/* CATEGORY FILTERS */}
          <div className="categoryRow">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`cat ${
                  category === item ? 'active' : ''
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* PRODUCTS */}
          <div
            className="grid"
            style={{ marginTop: 20 }}
          >
            {filtered.map((product) => (
              <article
                className="card"
                key={product.id}
              >
                <Link
                  href={`/product/${product.id}`}
                >
                  <div className="imageBox">
                    <span className="badge">
                      CURATED FIND
                    </span>

                    <Image
                      src={product.image}
                      alt={product.title}
                      width={659}
                      height={879}
                    />
                  </div>

                  <div className="cardBody">
                    <div className="brand">
                      {product.brand} · {product.category}
                    </div>

                    <h3>{product.title}</h3>

                    <p className="desc">
                      {product.description}
                    </p>

                    <div className="meta">
                      {product.color && (
                        <span className="chip">
                          {product.color}
                        </span>
                      )}

                      {product.fit && (
                        <span className="chip">
                          {product.fit}
                        </span>
                      )}

                      {product.material && (
                        <span className="chip">
                          {product.material.split(',')[0]}
                        </span>
                      )}
                    </div>

                    <div className="cardBottom">
                      <span className="price">
                        {product.price}
                      </span>

                      <span className="amazon">
                        View on Amazon →
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {!filtered.length && (
            <div className="empty">
              No curated finds match your search yet.
            </div>
          )}
        </div>
      </section>

      {/* CREATE MY STYLE */}
      <section className="section styleBanner">
        <div className="shell">
          <div className="glassPanel stylePromo">
            <div>
              <span className="eyebrow">
                <Sparkles size={13} />
                Fashion Studio
              </span>

              <h2>
                Build a look, not just a cart.
              </h2>

              <p>
                Choose a top, bottom, shoes and
                accessories. FashionFind turns your
                selections into a shoppable outfit.
              </p>
            </div>

            <Link
              className="btn btnDark"
              href="/style"
            >
              Create My Style
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="shell footerGrid">
          <div>
            <b>
              FASHIONFIND
              <span className="dot">•</span>
            </b>

            <p>
              Discover fashion worth wearing.
            </p>
          </div>

          <div className="disclosure">
            FashionFind participates in the Amazon
            Associates Program. As an Amazon Associate
            I earn from qualifying purchases. Product
            information, prices, stock and availability
            may change on the retailer&apos;s website.
          </div>

          <Link href="/admin">
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}