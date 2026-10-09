import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="legalPage">
      <div className="shell">
        <Link href="/" className="btn btnLight" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back to FashionFind
        </Link>

        <div className="glassPanel legalContent">
          <div className="legalHeader">
            <span className="eyebrow">
              <ShieldCheck size={14} /> TERMS & CONDITIONS
            </span>
            <h1>Terms of Service</h1>
            <p className="muted">Last updated: October 2026</p>
          </div>

          <div className="legalBody">
            <section>
              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing or using FashionFind, you agree to be bound by these Terms of Service. If you do not agree, please do not use
                our discovery and recommendation tools.
              </p>
            </section>

            <section>
              <h2>2. Nature of Service</h2>
              <p>
                FashionFind provides curated fashion discovery, occasion-based styling advice, and links to genuine products available on
                third-party shopping platforms such as Amazon. FashionFind does not manufacture, stock, sell, or ship products directly.
              </p>
            </section>

            <section>
              <h2>3. Product Prices and Retailer Disclaimers</h2>
              <p>
                All product prices, availability, sizes, delivery terms, and customer reviews are provided by third-party retailers and may
                change at any time. FashionFind makes reasonable efforts to present verified product information, but we do not guarantee the
                accuracy or availability of items on external merchant sites.
              </p>
            </section>

            <section>
              <h2>4. User Accounts and Acceptable Use</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your
                account. You agree not to exploit our recommendation engine or API endpoints through automated scraping, brute-force attacks, or
                unauthorized administrative access.
              </p>
            </section>

            <section>
              <h2>5. Limitation of Liability</h2>
              <p>
                FashionFind and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of
                the service or purchases made through external affiliate links.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
