import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="legalPage">
      <div className="shell">
        <Link href="/" className="btn btnLight" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back to FashionFind
        </Link>

        <div className="glassPanel legalContent">
          <div className="legalHeader">
            <span className="eyebrow">
              <ShieldCheck size={14} /> PRIVACY & DATA TRANSPARENCY
            </span>
            <h1>Privacy Policy</h1>
            <p className="muted">Last updated: October 2026</p>
          </div>

          <div className="legalBody">
            <section>
              <h2>1. Overview</h2>
              <p>
                FashionFind (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and personal data.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website
                and use our fashion discovery and recommendation services.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              <p>
                We only collect data necessary to provide our styling recommendation services and maintain application security:
              </p>
              <ul>
                <li>
                  <strong>Account Information:</strong> When you register an account, we collect your email address, optional name, and a
                  securely hashed version of your password (via bcrypt). We never store plaintext passwords.
                </li>
                <li>
                  <strong>Styling Preferences:</strong> When you use Choose My Fashion or save preferences, you may optionally provide
                  preferred gender, occasions, style directions, colors, and budget ranges.
                </li>
                <li>
                  <strong>Optional Skin-Tone Data:</strong> Any self-described skin-tone selection is completely voluntary, used solely
                  for harmonious color coordination suggestions, and is never used to exclude or rank products or users.
                </li>
                <li>
                  <strong>Anonymous Usage Data:</strong> We record aggregate metrics such as page views and product affiliate clicks to
                  improve catalog curation without tracking individual across third-party sites.
                </li>
              </ul>
            </section>

            <section>
              <h2>3. Affiliate Links and Retailer Partners</h2>
              <p>
                FashionFind is an affiliate discovery platform. When you click &quot;Shop on Amazon&quot; or &quot;Shop Now&quot;, you are redirected
                directly to the merchant&apos;s website via verified affiliate URLs. FashionFind may earn a commission from qualifying
                purchases at no additional cost to you. We do not collect payment details or process transactions.
              </p>
            </section>

            <section>
              <h2>4. Security and Retention</h2>
              <p>
                We implement industry-standard security measures including server-side session encryption (HMAC-SHA256), bcrypt
                password hashing, strict role-based access control (RBAC), and parameterized database queries to protect against unauthorized access.
              </p>
            </section>

            <section>
              <h2>5. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your account information and saved preferences at any time from your Account
                dashboard or by contacting our team.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
