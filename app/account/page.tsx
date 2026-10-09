'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Sparkles,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Bookmark,
  CheckCircle,
  AlertCircle,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { UserPreferences } from '../../data';

export default function AccountPage() {
  const [userData, setUserData] = useState<{
    id: string;
    email: string;
    name?: string | null;
    role: string;
    email_verified?: boolean;
  } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadAccount() {
      try {
        const meRes = await fetch('/api/auth/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        const meData = await meRes.json();

        if (!meRes.ok || !meData.authenticated || !meData.user) {
          window.location.href = '/auth';
          return;
        }

        setUserData(meData.user);

        // Fetch user preferences
        const prefRes = await fetch('/api/preferences', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          if (prefData.preferences) {
            setPreferences(prefData.preferences);
          }
        }
      } catch (err) {
        console.error('Account load error:', err);
        window.location.href = '/auth';
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/';
  };

  const handleResendVerification = async () => {
    if (!userData?.email) return;
    setResendStatus('Sending verification link…');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendStatus('Verification dispatch processed. Please check your inbox or server logs.');
      } else {
        setResendStatus(data.error || 'Failed to resend verification.');
      }
    } catch (e) {
      setResendStatus('Failed to communicate with server.');
    }
  };

  if (isLoading) {
    return (
      <main className="accountPage">
        <div className="shell">
          <div className="glassPanel accountLoading">Loading account details…</div>
        </div>
      </main>
    );
  }

  if (!userData) return null;

  return (
    <main className="accountPage">
      <div className="shell">
        <div className="accountTopRow">
          <Link href="/" className="btn btnLight">
            <ArrowLeft size={15} /> Back to FashionFind
          </Link>
          <div className="accountActions">
            {userData.role === 'ADMIN' && (
              <Link href="/admin" className="btn btnDark">
                <ShieldCheck size={15} /> Admin Control Room
              </Link>
            )}
            <button className="btn btnLight" onClick={handleSignOut}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>

        <div className="accountGrid">
          {/* User Profile Card */}
          <div className="glassPanel accountProfileCard">
            <div className="profileAvatar">
              <User size={32} />
            </div>
            <div className="profileMeta">
              <h2>{userData.name || 'Fashion Explorer'}</h2>
              <span className="profileEmail">{userData.email}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <span className={`roleBadge ${userData.role === 'ADMIN' ? 'adminRole' : 'userRole'}`}>
                  {userData.role} ACCOUNT
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: userData.email_verified ? '#15803d' : '#854d0e',
                    background: userData.email_verified ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  {userData.email_verified ? (
                    <>
                      <CheckCircle size={12} color="#15803d" /> Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} color="#854d0e" /> Verification Pending
                    </>
                  )}
                </span>
              </div>

              {!userData.email_verified && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={handleResendVerification}
                    className="btn btnLight"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    <Mail size={13} /> Resend Verification
                  </button>
                  {resendStatus && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{resendStatus}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Saved Styling Preferences */}
          <div className="glassPanel accountPrefsCard">
            <div className="prefsCardHeader">
              <div>
                <span className="eyebrow">
                  <Bookmark size={14} /> YOUR SAVED TASTE
                </span>
                <h3>Saved Styling Preferences</h3>
              </div>
              <Link href="/style" className="btn btnDark" style={{ padding: '8px 14px', fontSize: 13 }}>
                <Sparkles size={14} /> Style Me Now
              </Link>
            </div>

            {preferences ? (
              <div className="savedPrefsDetails">
                <div className="prefItem">
                  <span className="prefItemLabel">Styling For:</span>
                  <strong>{preferences.gender || 'Not specified'}</strong>
                </div>
                <div className="prefItem">
                  <span className="prefItemLabel">Favorite Occasion:</span>
                  <strong>{preferences.occasion || 'Not specified'}</strong>
                </div>
                <div className="prefItem">
                  <span className="prefItemLabel">Preferred Aesthetic:</span>
                  <strong>{preferences.style_direction || 'Not specified'}</strong>
                </div>
                <div className="prefItem">
                  <span className="prefItemLabel">Preferred Color:</span>
                  <strong>{preferences.preferred_color || 'No preference'}</strong>
                </div>
                <div className="prefItem">
                  <span className="prefItemLabel">Budget Preference:</span>
                  <strong>{preferences.budget || 'Any budget'}</strong>
                </div>
                {preferences.skin_tone && (
                  <div className="prefItem">
                    <span className="prefItemLabel">Skin Tone Palette Advice:</span>
                    <strong>{preferences.skin_tone}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="noPrefsPlaceholder">
                <Sparkles size={24} className="textMuted" />
                <p>You have not saved any styling preferences yet.</p>
                <Link href="/style" className="btn btnDark">
                  Choose My Fashion to set your taste
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
