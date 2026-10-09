import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ArrowUpRight, User, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FashionFind — Curated Fashion & Smart Outfit Styling',
  description:
    'Discover genuine fashion finds, occasion-based outfit recommendations, and curated editorial styles with direct Amazon affiliate shopping links.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <header className="topbar">
          <div className="shell nav">
            <Link className="logo" href="/">
              FASHIONFIND<span className="dot">•</span>
            </Link>
            <nav className="navlinks">
              <Link href="/">Home</Link>
              <Link href="/?gender=MEN">Men</Link>
              <Link href="/?gender=WOMEN">Women</Link>
              <Link href="/style">Choose My Fashion</Link>
              <Link href="/#search">Search</Link>
            </nav>
            <div className="navright">
              <Link className="pill" href="/style">
                <Sparkles size={14} /> Choose My Fashion
              </Link>
              <Link className="btn btnLight" href="/auth" style={{ padding: '8px 14px', fontSize: 13 }}>
                <User size={14} /> Account
              </Link>
              <Link className="btn btnDark" href="/#collection">
                EXPLORE <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
