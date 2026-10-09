'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Heart,
  Sliders,
  Bookmark,
  Info,
  ChevronRight,
  Shirt,
  Calendar,
  Layers,
  Palette,
  DollarSign,
  Coffee,
  Compass,
  PartyPopper,
  GraduationCap,
  Briefcase,
  Plane,
  Sun,
  Crown,
  Flame,
  Utensils,
} from 'lucide-react';
import { initialProducts, Product, ProductGender } from '../../data';
import {
  OCCASIONS_DATA,
  STYLE_DIRECTIONS,
  COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
  OccasionType,
  StyleDirection,
  OutfitCombination,
  RecommendationResult,
  generateSmartRecommendations,
} from '../../lib/recommendations';
import { normalizeProductGender } from '../../lib/categories';

// Map icon names to Lucide icons
const OCCASION_ICONS: Record<string, React.ElementType> = {
  Coffee,
  Compass,
  Sparkles,
  Heart,
  PartyPopper,
  GraduationCap,
  Briefcase,
  Plane,
  Sun,
  Crown,
  Flame,
  Utensils,
};

const SPECIFIC_PREFERENCES = [
  'No preference',
  'Shorts',
  'Jeans',
  'Trousers',
  'Sneakers',
  'Formal shoes',
];

const BUDGET_OPTIONS = [
  'Any budget',
  'Under ₹1,500',
  '₹1,500 – ₹3,000',
  '₹3,000 – ₹6,000',
  'Above ₹6,000',
];

export default function ChooseMyFashionPage() {
  const [catalog, setCatalog] = useState<Product[]>(initialProducts);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  // Flow State
  const [step, setStep] = useState<number>(1);
  const [gender, setGender] = useState<'MEN' | 'WOMEN'>('MEN');
  const [occasion, setOccasion] = useState<OccasionType>('Birthday');
  const [styleDirection, setStyleDirection] = useState<StyleDirection>('CASUAL');
  const [preferredColor, setPreferredColor] = useState<string>('No preference');
  const [skinTone, setSkinTone] = useState<string>('Prefer not to say');
  const [budget, setBudget] = useState<string>('Any budget');
  const [specificPreference, setSpecificPreference] = useState<string>('No preference');

  // Recommendation Results
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const wizardRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live catalog from database
  useEffect(() => {
    async function loadCatalog() {
      try {
        setIsCatalogLoading(true);
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.products && data.products.length > 0) {
            setCatalog(data.products);
          }
        }
      } catch (err) {
        console.error('Failed to load products from API, using fallback data', err);
      } finally {
        setIsCatalogLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // 2. Generate Recommendations
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Direct client calculation using verified catalog or call recommendation API
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          occasion,
          styleDirection,
          preferredColor,
          skinTone,
          budget,
          specificPreference,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
        if (data.outfits && data.outfits.length > 0) {
          setSelectedOutfitId(data.outfits[0].id);
        }
      } else {
        // Fallback to local recommendation engine
        const fallback = generateSmartRecommendations(catalog, {
          gender,
          occasion,
          styleDirection,
          preferredColor,
          skinTone,
          budget,
          specificPreference,
        });
        setRecommendations(fallback);
        if (fallback.outfits && fallback.outfits.length > 0) {
          setSelectedOutfitId(fallback.outfits[0].id);
        }
      }

      setStep(5); // Show results view
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      const fallback = generateSmartRecommendations(catalog, {
        gender,
        occasion,
        styleDirection,
        preferredColor,
        skinTone,
        budget,
        specificPreference,
      });
      setRecommendations(fallback);
      if (fallback.outfits.length > 0) {
        setSelectedOutfitId(fallback.outfits[0].id);
      }
      setStep(5);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Save preferences to user account
  const handleSavePreferences = async () => {
    setSaveStatus('Saving...');
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          occasion,
          styleDirection,
          preferredColor,
          budget,
          skinTone: skinTone !== 'Prefer not to say' ? skinTone : undefined,
        }),
      });

      if (res.ok) {
        setSaveStatus('Preferences saved to your account!');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus('Sign in to save preferences to your account.');
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch (e) {
      setSaveStatus('Sign in to save preferences.');
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  const selectedOutfit = recommendations?.outfits.find((o) => o.id === selectedOutfitId);

  return (
    <main className="chooseFashionPage">
      {/* Editorial Hero Section */}
      <section className="chooseHero">
        <div className="shell">
          <div className="chooseHeroContent">
            <div className="eyebrowBadge">
              <Sparkles size={14} /> AI & METADATA-POWERED STYLING
            </div>
            <h1 className="chooseHeroTitle">CHOOSE YOUR FASHION</h1>
            <p className="chooseHeroSubtitle">
              Where are you going? What&apos;s your vibe? We&apos;ll find the pieces.
            </p>
            <div className="chooseHeroActions">
              <button
                className="btn btnPrimaryHero"
                onClick={() => {
                  setStep(1);
                  wizardRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                FIND MY STYLE <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Experience Container */}
      <section className="chooseWizardSection" ref={wizardRef}>
        <div className="shell">
          {/* Progress Indicator */}
          {step <= 4 && (
            <div className="wizardProgressWrapper">
              <div className="wizardStepTracker">
                <button
                  className={`trackerStep ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}
                  onClick={() => setStep(1)}
                >
                  <span className="stepNum">1</span>
                  <span className="stepLabel">Gender</span>
                </button>
                <div className="trackerLine" />
                <button
                  className={`trackerStep ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}
                  onClick={() => setStep(2)}
                >
                  <span className="stepNum">2</span>
                  <span className="stepLabel">Occasion</span>
                </button>
                <div className="trackerLine" />
                <button
                  className={`trackerStep ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}
                  onClick={() => setStep(3)}
                >
                  <span className="stepNum">3</span>
                  <span className="stepLabel">Style</span>
                </button>
                <div className="trackerLine" />
                <button
                  className={`trackerStep ${step === 4 ? 'active' : ''}`}
                  onClick={() => setStep(4)}
                >
                  <span className="stepNum">4</span>
                  <span className="stepLabel">Personalize</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT GENDER */}
          {step === 1 && (
            <div className="stepCard animateFadeIn">
              <div className="stepHeader">
                <span className="stepBadge">STEP 1 OF 4</span>
                <h2>Who are you styling for?</h2>
                <p>
                  Every subsequent recommendation, product card, and outfit option is strictly
                  filtered for your chosen gender.
                </p>
              </div>

              <div className="genderSelectionGrid">
                <div
                  className={`genderCard ${gender === 'MEN' ? 'selected' : ''}`}
                  onClick={() => setGender('MEN')}
                >
                  <div className="genderCardGlow" />
                  <div className="genderIconCircle">
                    <Shirt size={28} />
                  </div>
                  <h3>Men</h3>
                  <p>Curated shirts, trousers, jackets, footwear and accessories for men.</p>
                  <div className="selectRadio">
                    {gender === 'MEN' && <Check size={16} />}
                  </div>
                </div>

                <div
                  className={`genderCard ${gender === 'WOMEN' ? 'selected' : ''}`}
                  onClick={() => setGender('WOMEN')}
                >
                  <div className="genderCardGlow" />
                  <div className="genderIconCircle">
                    <Sparkles size={28} />
                  </div>
                  <h3>Women</h3>
                  <p>Curated tops, dresses, bottoms, shoes and statement accessories for women.</p>
                  <div className="selectRadio">
                    {gender === 'WOMEN' && <Check size={16} />}
                  </div>
                </div>
              </div>

              <div className="stepFooter">
                <div className="stepFooterInfo">
                  <ShieldCheck size={16} className="textMuted" /> Strict catalog metadata filtering.
                </div>
                <button className="btn btnDark" onClick={() => setStep(2)}>
                  Continue to Occasion <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT OCCASION */}
          {step === 2 && (
            <div className="stepCard animateFadeIn">
              <div className="stepHeader">
                <span className="stepBadge">STEP 2 OF 4</span>
                <h2>What is the occasion?</h2>
                <p>Select where you are headed so our engine tailors the right dress code and mood.</p>
              </div>

              <div className="occasionGrid">
                {OCCASIONS_DATA.map((occ) => {
                  const IconComp = OCCASION_ICONS[occ.icon] || Sparkles;
                  const isSelected = occasion === occ.id;
                  return (
                    <div
                      key={occ.id}
                      className={`occasionCard ${isSelected ? 'selected' : ''}`}
                      onClick={() => setOccasion(occ.id)}
                    >
                      <div className="occasionCardTop">
                        <span className="occasionEyebrow">{occ.eyebrow}</span>
                        <div className="occasionIcon">
                          <IconComp size={18} />
                        </div>
                      </div>
                      <h3>{occ.name}</h3>
                      <p>{occ.description}</p>
                      <div className="occasionCheck">
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stepFooter">
                <button className="btn btnLight" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button className="btn btnDark" onClick={() => setStep(3)}>
                  Continue to Style Direction <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT STYLING DIRECTION */}
          {step === 3 && (
            <div className="stepCard animateFadeIn">
              <div className="stepHeader">
                <span className="stepBadge">STEP 3 OF 4</span>
                <h2>Select your styling direction</h2>
                <p>Choose the aesthetic direction that fits your mood for {occasion}.</p>
              </div>

              <div className="styleDirectionGrid">
                {STYLE_DIRECTIONS.map((dir) => {
                  const isSelected = styleDirection === dir.id;
                  return (
                    <div
                      key={dir.id}
                      className={`styleDirectionCard ${isSelected ? 'selected' : ''}`}
                      onClick={() => setStyleDirection(dir.id)}
                    >
                      <div className="styleDirectionHeader">
                        <span className="styleTagline">{dir.tagline}</span>
                        <h3>{dir.title}</h3>
                      </div>
                      <p>{dir.description}</p>
                      <div className="styleDirectionRadio">
                        {isSelected ? <Check size={16} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stepFooter">
                <button className="btn btnLight" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button className="btn btnDark" onClick={() => setStep(4)}>
                  Continue to Personalize <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: OPTIONAL PERSONALIZATION */}
          {step === 4 && (
            <div className="stepCard animateFadeIn">
              <div className="stepHeader">
                <span className="stepBadge">STEP 4 OF 4</span>
                <h2>Optional Personalization</h2>
                <p>Fine-tune colors, preferred items, and budget. All inputs here are completely optional.</p>
              </div>

              <div className="personalizationSection">
                {/* Preferred Color */}
                <div className="prefGroup">
                  <div className="prefLabel">
                    <Palette size={16} />
                    <span>Preferred Color</span>
                  </div>
                  <div className="prefChips">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`prefChip ${preferredColor === c ? 'active' : ''}`}
                        onClick={() => setPreferredColor(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone Preference (Optional, Non-discriminatory) */}
                <div className="prefGroup">
                  <div className="prefLabel">
                    <Sparkles size={16} />
                    <span>Skin Tone Palette Advice (Optional)</span>
                  </div>
                  <p className="prefHelp">
                    Used solely for harmonious color coordination suggestions. We do not exclude or rank
                    products based on skin tone.
                  </p>
                  <div className="prefChips">
                    {SKIN_TONE_OPTIONS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`prefChip ${skinTone === st ? 'active' : ''}`}
                        onClick={() => setSkinTone(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Range */}
                <div className="prefGroup">
                  <div className="prefLabel">
                    <DollarSign size={16} />
                    <span>Preferred Budget</span>
                  </div>
                  <div className="prefChips">
                    {BUDGET_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`prefChip ${budget === b ? 'active' : ''}`}
                        onClick={() => setBudget(b)}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Item Preference */}
                <div className="prefGroup">
                  <div className="prefLabel">
                    <Layers size={16} />
                    <span>Preferred Item Type</span>
                  </div>
                  <div className="prefChips">
                    {SPECIFIC_PREFERENCES.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        className={`prefChip ${specificPreference === sp ? 'active' : ''}`}
                        onClick={() => setSpecificPreference(sp)}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="stepFooter">
                <button className="btn btnLight" onClick={() => setStep(3)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="btn btnPrimaryHero"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    'Generating Styles…'
                  ) : (
                    <>
                      GENERATE RECOMMENDATIONS <Sparkles size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: RECOMMENDATION RESULTS */}
          {step === 5 && recommendations && (
            <div className="resultsContainer animateFadeIn" ref={resultsRef}>
              <div className="resultsHeader">
                <div className="resultsEyebrow">
                  <Sparkles size={15} /> YOUR PERSONALIZED STYLE
                </div>
                <h2 className="resultsTitle">{recommendations.header}</h2>
                <p className="resultsSubtitle">
                  Curated outfit combinations assembled from genuine FashionFind catalog products.
                </p>

                <div className="resultsActionRow">
                  <button
                    className="btn btnLight"
                    onClick={() => {
                      setStep(1);
                      wizardRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <RotateCcw size={15} /> Change Preferences
                  </button>
                  <button className="btn btnLight" onClick={handleSavePreferences}>
                    <Bookmark size={15} /> Save Look to Account
                  </button>
                </div>
                {saveStatus && <div className="notice inlineNotice">{saveStatus}</div>}
              </div>

              {recommendations.catalogStatusMessage && (
                <div className="catalogNotice">
                  <Info size={18} />
                  <span>{recommendations.catalogStatusMessage}</span>
                </div>
              )}

              {/* Combination Cards */}
              <div className="outfitsGrid">
                {recommendations.outfits.map((outfit, idx) => {
                  const isSelected = selectedOutfitId === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`outfitCard ${isSelected ? 'activeOutfit' : ''}`}
                    >
                      <div className="outfitCardHeader">
                        <div className="outfitOptionBadge">
                          OPTION {idx + 1} — {outfit.title}
                        </div>
                        <span className="outfitSubtitle">{outfit.subtitle}</span>
                        <p className="outfitExplanation">{outfit.explanation}</p>
                      </div>

                      {/* Outfit Products Grid */}
                      <div className="outfitItemsGrid">
                        {outfit.items
                          .filter((item) => item.product !== null)
                          .map((item, itemIdx) => {
                            const p = item.product!;
                            return (
                              <div key={`${p.id}-${itemIdx}`} className="outfitProductItem">
                                <div className="outfitProductThumb">
                                  <img src={p.image} alt={p.title} />
                                  <span className="itemCategoryBadge">{item.category}</span>
                                </div>
                                <div className="outfitProductMeta">
                                  <span className="productBrand">{p.brand}</span>
                                  <h4 className="productTitle">{p.title}</h4>
                                  {p.color && (
                                    <span className="productColor">Color: {p.color}</span>
                                  )}
                                  <span className="productPrice">
                                    {p.price || 'Price unavailable'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="outfitCardFooter">
                        <button
                          className={`btn ${isSelected ? 'btnDark' : 'btnLight'} fullWidth`}
                          onClick={() => setSelectedOutfitId(outfit.id)}
                        >
                          {isSelected ? (
                            <>
                              <Check size={16} /> Selected Combination
                            </>
                          ) : (
                            'Select This Outfit'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SHOP THIS STYLE HIGHLIGHT SECTION */}
              {selectedOutfit && (
                <div className="shopThisStyleSection animateFadeIn">
                  <div className="shopHeader">
                    <div>
                      <span className="eyebrow">
                        <ShoppingBag size={14} /> DIRECT AFFILIATE SHOPPING
                      </span>
                      <h3>SHOP THIS STYLE — {selectedOutfit.title}</h3>
                      <p>
                        Shop each individual piece directly on Amazon using its verified affiliate
                        link.
                      </p>
                    </div>
                  </div>

                  <div className="shopProductsList">
                    {selectedOutfit.items
                      .filter((item) => item.product !== null)
                      .map((item) => {
                        const p = item.product!;
                        return (
                          <div key={`shop-${p.id}`} className="shopProductRow">
                            <div className="shopProductImg">
                              <img src={p.image} alt={p.title} />
                            </div>
                            <div className="shopProductInfo">
                              <div className="shopCategory">{item.category} · {p.brand}</div>
                              <h4>{p.title}</h4>
                              <p className="shopDesc">{p.description}</p>
                              {p.color && <small>Verified Color: {p.color}</small>}
                            </div>
                            <div className="shopProductAction">
                              <span className="shopPriceTag">
                                {p.price || 'Check price on Amazon'}
                              </span>
                              {p.affiliateUrl ? (
                                <a
                                  href={p.affiliateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btnPrimaryHero"
                                  onClick={() => {
                                    fetch('/api/track', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        type: 'affiliate_click',
                                        productId: p.id,
                                      }),
                                    }).catch(() => {});
                                  }}
                                >
                                  Shop Now <ExternalLink size={15} />
                                </a>
                              ) : (
                                <span className="btn btnDisabled">Unavailable</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="affiliateDisclaimerNotice">
                    <ShieldCheck size={16} />
                    <span>
                      FashionFind may earn a commission from qualifying purchases made through affiliate
                      links, at no additional cost to you. Product prices, sizes, and stock are
                      determined by the retailer on Amazon.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
