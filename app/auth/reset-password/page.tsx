'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockKeyhole, KeyRound, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Password reset token is missing.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to reset password.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Password has been reset successfully! You may now log in.');
      setIsLoading(false);
      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (err) {
      setErrorMsg('Failed to communicate with password reset service.');
      setIsLoading(false);
    }
  };

  return (
    <div className="authCard glassPanel">
      <div className="authTop">
        <Link href="/auth" className="btn btnLight" style={{ padding: '6px 12px', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>

      <div className="authHeader">
        <div className="authIcon">
          <KeyRound size={24} />
        </div>
        <h1>Create New Password</h1>
        <p>Enter your new password below to recover your account access.</p>
      </div>

      {!successMsg ? (
        <form onSubmit={handleSubmit} className="authForm">
          {!tokenFromUrl && (
            <div className="field">
              <label>Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email or server log"
              />
            </div>
          )}

          <div className="field">
            <label>New Password (minimum 8 characters)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label>Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button className="btn btnDark authSubmit" type="submit" disabled={isLoading}>
            {isLoading ? 'Updating Password…' : 'Update Password'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/auth" className="btn btnDark" style={{ display: 'inline-flex', padding: '10px 24px' }}>
            Go to Sign In
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="authNotice error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="authNotice success">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="authSecurityNote">
        <ShieldCheck size={14} />
        <span>Single-use SHA-256 hashed cryptographic recovery token.</span>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="authPage">
      <Suspense fallback={<div className="glassPanel authCard">Loading recovery form…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
