'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, ArrowLeft, MailCheck, ShieldCheck, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'manual'>('verifying');
  const [message, setMessage] = useState('');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('manual');
      return;
    }

    async function performVerification() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! Your account is active.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email token. The link may have expired or was already used.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Failed to communicate with verification server.');
      }
    }

    performVerification();
  }, [token]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setStatus('verifying');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: manualToken.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully! Your account is active.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Invalid or expired verification token.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to communicate with verification server.');
    }
  };

  return (
    <div className="authCard glassPanel" style={{ textAlign: 'center' }}>
      <div className="authTop" style={{ justifyContent: 'flex-start' }}>
        <Link href="/" className="btn btnLight" style={{ padding: '6px 12px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to FashionFind
        </Link>
      </div>

      <div className="authHeader" style={{ marginTop: 20 }}>
        <div className="authIcon" style={{ margin: '0 auto 16px' }}>
          {status === 'verifying' ? (
            <Loader2 size={24} className="spin" />
          ) : status === 'success' ? (
            <CheckCircle2 size={24} color="#15803d" />
          ) : status === 'error' ? (
            <AlertCircle size={24} color="#b91c1c" />
          ) : (
            <MailCheck size={24} />
          )}
        </div>
        <h1>
          {status === 'verifying'
            ? 'Verifying Your Email…'
            : status === 'success'
            ? 'Email Verified'
            : status === 'error'
            ? 'Verification Notice'
            : 'Enter Verification Token'}
        </h1>
        <p>
          {status === 'verifying'
            ? 'Validating single-use cryptographic token with PostgreSQL 17 security records…'
            : status === 'success'
            ? message
            : status === 'error'
            ? message
            : 'Paste your email verification token below to verify your account.'}
        </p>
      </div>

      {status === 'manual' && (
        <form onSubmit={handleManualSubmit} className="authForm" style={{ marginTop: 20 }}>
          <div className="field">
            <input
              type="text"
              required
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste verification token here"
            />
          </div>
          <button className="btn btnDark authSubmit" type="submit">
            Verify Email
          </button>
        </form>
      )}

      {status === 'success' && (
        <div style={{ marginTop: 24 }}>
          <Link href="/account" className="btn btnDark" style={{ display: 'inline-flex', padding: '10px 24px' }}>
            Go to Your Account
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/auth" className="btn btnLight">
            Back to Sign In
          </Link>
          <button className="btn btnDark" onClick={() => setStatus('manual')}>
            Enter Token Manually
          </button>
        </div>
      )}

      <div className="authSecurityNote" style={{ marginTop: 32 }}>
        <ShieldCheck size={14} />
        <span>Single-use expiring verification token securely handled.</span>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="authPage">
      <Suspense fallback={<div className="glassPanel authCard">Loading verification…</div>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
