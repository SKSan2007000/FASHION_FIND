'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LockKeyhole, ArrowLeft, UserPlus, LogIn, ShieldCheck, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Signed in successfully! Redirecting…');
      setTimeout(() => {
        if (data.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/account');
        }
      }, 500);
    } catch (err) {
      setErrorMsg('Failed to communicate with authentication server.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Account created successfully! Redirecting…');
      setTimeout(() => {
        router.push('/account');
      }, 500);
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
              }}
            >
              <UserPlus size={14} /> Create Account
            </button>
          </div>
        </div>

        <div className="authHeader">
          <div className="authIcon">
            <LockKeyhole size={24} />
          </div>
          <h1>{tab === 'signin' ? 'Welcome Back' : 'Join FashionFind'}</h1>
          <p>
            {tab === 'signin'
              ? 'Access your saved styling preferences and curated fashion finds.'
              : 'Save personalized outfit combinations and tailor your shopping experience.'}
          </p>
        </div>

        {tab === 'signin' ? (
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
              <label>Password</label>
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
        ) : (
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
              <label>Password (min 8 characters)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button className="btn btnDark authSubmit" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Account…' : 'Create Account'}
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

        <div className="authSecurityNote">
          <ShieldCheck size={14} />
          <span>Server-side encrypted authentication with bcrypt password security.</span>
        </div>
      </div>
    </main>
  );
}
