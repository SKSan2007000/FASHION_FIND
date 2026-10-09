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
  Sliders,
  Calendar,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { UserPreferences } from '../../data';

export default function AccountPage() {
  const [userData, setUserData] = useState<{
    id: string;
    email: string;
    name?: string | null;
    role: string;
  } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadAccount() {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();

        if (!meData.authenticated || !meData.user) {
          router.push('/auth');
          return;
        }

        setUserData(meData.user);

        // Fetch user preferences
        const prefRes = await fetch('/api/preferences');
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          if (prefData.preferences) {
            setPreferences(prefData.preferences);
          }
        }
      } catch (err) {
        console.error('Account load error:', err);
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
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
              <span className={`roleBadge ${userData.role === 'ADMIN' ? 'adminRole' : 'userRole'}`}>
                {userData.role} ACCOUNT
              </span>
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
