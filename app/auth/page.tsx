'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LockKeyhole,
  ArrowLeft,
  UserPlus,
  LogIn,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Mail,
  ExternalLink,
} from 'lucide-react';

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedLink, setSimulatedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedLink(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter your email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Signed in successfully! Opening dashboard…');
      setTimeout(() => {
        const dest = data.user?.role === 'ADMIN' ? '/admin' : '/account';
        window.location.href = dest;
      }, 400);
    } catch (err) {
      setErrorMsg('Failed to communicate with authentication server.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedLink(null);
    setIsLoading(true);

    const cleanEmail = email.trim();

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and password confirmation do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password, confirmPassword, name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      if (data.emailResult?.previewUrl) {
        setSimulatedLink(data.emailResult.previewUrl);
      }

      setSuccessMsg('Account created successfully! Opening your account…');
      setTimeout(() => {
        window.location.href = '/account';
      }, 800);
    } catch (err) {
      setErrorMsg('Failed to communicate with authentication server.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedLink(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process request.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(data.message || 'Password reset request submitted.');
      if (data.emailResult?.previewUrl) {
        setSimulatedLink(data.emailResult.previewUrl);
      }
      setIsLoading(false);
    } catch (err) {
      setErrorMsg('Failed to communicate with authentication server.');
      setIsLoading(false);
    }
  };

  return (
    <main className="authPage">
      <div className="authCard glassPanel">
        <div className="authTop">
          <Link href="/" className="btn btnLight" style={{ padding: '6px 12px', fontSize: 13 }}>
            <ArrowLeft size={14} /> FashionFind
          </Link>
          <div className="authTabs">
            <button
              className={`authTab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setTab('signin');
                setErrorMsg('');
                setSuccessMsg('');
                setSimulatedLink(null);
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              className={`authTab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setErrorMsg('');
                setSuccessMsg('');
                setSimulatedLink(null);
              }}
            >
              <UserPlus size={14} /> Register
            </button>
            <button
              className={`authTab ${tab === 'forgot' ? 'active' : ''}`}
              onClick={() => {
                setTab('forgot');
                setErrorMsg('');
                setSuccessMsg('');
                setSimulatedLink(null);
              }}
            >
              <KeyRound size={14} /> Recovery
            </button>
          </div>
        </div>

        <div className="authHeader">
          <div className="authIcon">
            {tab === 'signin' ? (
              <LockKeyhole size={24} />
            ) : tab === 'register' ? (
              <UserPlus size={24} />
            ) : (
              <KeyRound size={24} />
            )}
          </div>
          <h1>
            {tab === 'signin'
              ? 'Welcome Back'
              : tab === 'register'
              ? 'Join FashionFind'
              : 'Recover Your Password'}
          </h1>
          <p>
            {tab === 'signin'
              ? 'Access your saved styling preferences and curated fashion finds.'
              : tab === 'register'
              ? 'Create your account to save personalized outfit styles and track your favorites.'
              : 'Enter your registered email address to receive a secure single-use reset link.'}
          </p>
        </div>

        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="authForm">
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button className="btn btnDark authSubmit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="authForm">
            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Password (minimum 8 characters)</label>
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
              <label>Confirm Password</label>
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
              {isLoading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="authForm">
            <div className="field">
              <label>Registered Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <button className="btn btnDark authSubmit" type="submit" disabled={isLoading}>
              {isLoading ? 'Sending Request…' : 'Send Reset Link'}
            </button>
          </form>
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

        {simulatedLink && (
          <div className="simulatedLinkNotice glassPanel" style={{ marginTop: 12, padding: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0b1329', marginBottom: 4 }}>
              <Mail size={15} /> Single-Use Link Generated:
            </div>
            <a
              href={simulatedLink}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0b1329', wordBreak: 'break-all', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Click here to proceed <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div className="authSecurityNote">
          <ShieldCheck size={14} />
          <span>PostgreSQL 17 backed encryption with bcrypt 12-round password hashing.</span>
        </div>
      </div>
    </main>
  );
}
