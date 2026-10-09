'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  LogOut,
  Plus,
  Trash2,
  Upload,
  Package,
  Users,
  Eye,
  MousePointerClick,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Activity,
  Calendar,
  Lock,
} from 'lucide-react';
import { initialProducts, Product, AuditLog } from '../../data';
import { parseAmazonSpec } from '../../lib/parser';
import { AnalyticsSummary } from '../../lib/db';
import { validateAffiliateUrl } from '../../lib/security';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add Product Form
  const [image, setImage] = useState('');
  const [specText, setSpecText] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [genderInput, setGenderInput] = useState<'MEN' | 'WOMEN' | 'UNISEX'>('MEN');
  const [formMsg, setFormMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function initAdmin() {
      try {
        // 1. Verify authenticated session & ADMIN role
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();

        if (!meData.authenticated || meData.user?.role !== 'ADMIN') {
          router.push('/auth');
          return;
        }

        setAuthed(true);

        // 2. Fetch admin products
        const prodRes = await fetch('/api/admin/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.products) setProducts(prodData.products);
        }

        // 3. Fetch analytics summary
        const anaRes = await fetch('/api/admin/analytics');
        if (anaRes.ok) {
          const anaData = await anaRes.json();
          if (anaData.analytics) setAnalytics(anaData.analytics);
        }

        // 4. Fetch audit logs
        const auditRes = await fetch('/api/admin/audit-logs');
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.logs) setAuditLogs(auditData.logs);
        }
      } catch (err) {
        console.error('Admin init error:', err);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    }

    initAdmin();
  }, [router]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImage(data.url);
        setFormMsg({ text: 'Image uploaded successfully.', type: 'success' });
      } else {
        setFormMsg({ text: data.error || 'Failed to upload image.', type: 'error' });
      }
    } catch (e) {
      setFormMsg({ text: 'Image upload failed.', type: 'error' });
    }
  };

  const handleAddProduct = async () => {
    setFormMsg(null);
    if (!image || !specText.trim() || !affiliateUrl.trim()) {
      setFormMsg({
        text: 'Please upload an image, paste Amazon specifications, and enter the affiliate link.',
        type: 'error',
      });
      return;
    }

    // Client validation of affiliate link
    const urlCheck = validateAffiliateUrl(affiliateUrl);
    if (!urlCheck.isValid) {
      setFormMsg({ text: urlCheck.error || 'Invalid affiliate URL.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const parsed = parseAmazonSpec(specText, urlCheck.normalizedUrl || affiliateUrl, image);
      if (!parsed.title || !parsed.brand) {
        setFormMsg({
          text: 'Could not parse product details. Please ensure the full specification text is provided.',
          type: 'error',
        });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...parsed,
        gender: genderInput,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormMsg({ text: data.error || 'Failed to publish product.', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      setProducts([data.product, ...products]);
      setImage('');
      setSpecText('');
      setAffiliateUrl('');
      setFormMsg({
        text: `Product "${data.product.title}" published successfully under ${data.product.category}.`,
        type: 'success',
      });
    } catch (err) {
      setFormMsg({ text: 'Server error while publishing product.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProducts(products.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, published: !product.published }),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(products.map((p) => (p.id === product.id ? data.product : p)));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
  };

  if (loading || !authed) {
    return (
      <main className="admin">
        <div className="shell">
          <div className="glassPanel accountLoading">Verifying administrator credentials…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin">
      <div className="shell">
        {/* Top bar */}
        <div className="adminTop">
          <Link href="/" className="btn btnLight">
            <ArrowLeft size={15} /> View Site
          </Link>
          <div className="adminTopRight">
            <Link href="/style" className="btn btnLight">
              <Sparkles size={15} /> Choose My Fashion
            </Link>
            <button className="btn btnLight" onClick={handleSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="sectionHead" style={{ marginTop: 24 }}>
          <div>
            <span className="eyebrow">
              <BarChart3 size={13} /> CONTROL ROOM & AUDIT
            </span>
            <h2>FashionFind Admin Dashboard</h2>
            <p>
              Genuine catalog management, server-side RBAC, and real-time site analytics.
            </p>
          </div>
        </div>

        {/* Analytics Metric Grid */}
        <div className="metricGrid">
          <div className="metric glassPanel">
            <Eye size={22} className="metricIcon" />
            <strong>{analytics?.totalVisits ?? 0}</strong>
            <span>Recorded Visits</span>
          </div>
          <div className="metric glassPanel">
            <Users size={22} className="metricIcon" />
            <strong>{analytics?.totalUsers ?? 0}</strong>
            <span>Registered Users</span>
          </div>
          <div className="metric glassPanel">
            <MousePointerClick size={22} className="metricIcon" />
            <strong>{analytics?.totalAffiliateClicks ?? 0}</strong>
            <span>Affiliate Clicks</span>
          </div>
          <div className="metric glassPanel">
            <Package size={22} className="metricIcon" />
            <strong>{products.length}</strong>
            <span>Catalog Items</span>
          </div>
        </div>

        {/* 2-Column Grid: Add Product & Live Catalog */}
        <div className="adminGrid" style={{ marginTop: 24 }}>
          {/* Add Product Box */}
          <div className="glassPanel">
            <div className="panelHeader">
              <h3>
                <Plus size={18} /> Add Catalog Product
              </h3>
              <p className="muted">
                Paste Amazon specifications and affiliate URL. Metadata and category fields are
                extracted automatically.
              </p>
            </div>

            <div className="threeInputs">
              {/* 1. Image Upload */}
              <label className="uploadBox">
                <Upload size={20} />
                <b>1. Product Image</b>
                <span>{image ? 'Image ready — click to replace' : 'Upload JPG / PNG / WEBP'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
                {image && <img src={image} alt="Preview" className="imgPreviewThumb" />}
              </label>

              {/* 2. Amazon Specs */}
              <label className="uploadBox">
                <Upload size={20} />
                <b>2. Amazon Specifications</b>
                <span>{specText ? 'Specifications entered' : 'Upload .txt or paste below'}</span>
                <textarea
                  value={specText}
                  onChange={(e) => setSpecText(e.target.value)}
                  placeholder="Paste the Amazon Style / Item details / Features & Specs text here…"
                />
              </label>

              {/* 3. Affiliate Link */}
              <label className="uploadBox">
                <Package size={20} />
                <b>3. Amazon Affiliate Link</b>
                <span>Verified Amazon associate URL</span>
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://link.amazon/... or https://www.amazon.in/dp/..."
                />
              </label>

              {/* Gender selector for product */}
              <div className="genderSelectField">
                <label>Target Gender:</label>
                <select
                  value={genderInput}
                  onChange={(e) => setGenderInput(e.target.value as any)}
                  className="adminSelect"
                >
                  <option value="MEN">Men</option>
                  <option value="WOMEN">Women</option>
                  <option value="UNISEX">Unisex</option>
                </select>
              </div>
            </div>

            <button
              className="btn btnDark publishBtn"
              onClick={handleAddProduct}
              disabled={isSubmitting}
            >
              <Plus size={16} /> {isSubmitting ? 'Parsing & Publishing…' : 'Parse & Publish Product'}
            </button>

            {formMsg && (
              <div className={`notice ${formMsg.type === 'error' ? 'noticeError' : 'noticeSuccess'}`}>
                {formMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                <span>{formMsg.text}</span>
              </div>
            )}
          </div>

          {/* Live Catalog Table */}
          <div className="glassPanel">
            <div className="panelHeader">
              <h3>Live Catalog ({products.length})</h3>
              <p>Manage genuine products and publication visibility.</p>
            </div>

            <div className="adminProductList">
              {products.map((p) => (
                <div key={p.id} className="adminProductRow">
                  <div className="adminProductThumb">
                    <img src={p.image} alt="" />
                  </div>
                  <div className="adminProductMeta">
                    <b>{p.title}</b>
                    <span>
                      {p.brand} · {p.category} ({p.gender || 'MEN'})
                    </span>
                    <small>ASIN: {p.asin || 'N/A'}</small>
                  </div>
                  <div className="adminProductActions">
                    <button
                      className={`btn ${p.published !== false ? 'btnPublished' : 'btnUnpublished'}`}
                      onClick={() => handleTogglePublish(p)}
                      title="Toggle visibility"
                    >
                      {p.published !== false ? 'Live' : 'Draft'}
                    </button>
                    <Link href={`/product/${p.id}`} target="_blank" className="iconBtn">
                      <ExternalLink size={15} />
                    </Link>
                    <button className="iconBtn deleteBtn" onClick={() => handleDeleteProduct(p.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Audit Log Table */}
        <div className="glassPanel auditLogSection" style={{ marginTop: 24 }}>
          <div className="panelHeader">
            <h3>
              <Activity size={18} /> Security & Administrative Audit Logs
            </h3>
            <p>Immutable server-side recorded events, logins, and mutations.</p>
          </div>

          {auditLogs.length > 0 ? (
            <div className="auditTableWrap">
              <table className="auditTable">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Outcome</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.slice(0, 15).map((log, i) => (
                    <tr key={log.id || i}>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}</td>
                      <td>
                        <code>{log.action}</code>
                      </td>
                      <td>{log.actor_email || 'System / Anonymous'}</td>
                      <td>
                        <span
                          className={`outcomeBadge ${log.outcome === 'SUCCESS' ? 'badgeSuccess' : 'badgeDenied'}`}
                        >
                          {log.outcome}
                        </span>
                      </td>
                      <td>{log.target_resource || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="noAuditLogs">No audit logs recorded yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
