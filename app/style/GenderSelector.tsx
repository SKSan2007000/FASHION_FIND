'use client';

import React from 'react';
import { ProductGender } from '../../lib/categories';
import { Sparkles, User } from 'lucide-react';

interface GenderSelectorProps {
  gender: ProductGender;
  onChange: (gender: ProductGender) => void;
}

export default function GenderSelector({ gender, onChange }: GenderSelectorProps) {
  return (
    <div className="gender-selector-container">
      <div className="gender-selector-header">
        <span className="gender-step-badge">STEP 1</span>
        <h3 className="gender-selector-title">Select Collection</h3>
      </div>

      <div className="gender-toggle-group" role="tablist" aria-label="Select collection gender">
        <button
          type="button"
          role="tab"
          aria-selected={gender === 'MEN'}
          className={`gender-toggle-btn ${gender === 'MEN' ? 'active' : ''}`}
          onClick={() => onChange('MEN')}
        >
          <span className="gender-label">MEN</span>
          <span className="gender-sublabel">Tailored & Casual Wardrobe</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={gender === 'WOMEN'}
          className={`gender-toggle-btn ${gender === 'WOMEN' ? 'active' : ''}`}
          onClick={() => onChange('WOMEN')}
        >
          <span className="gender-label">WOMEN</span>
          <span className="gender-sublabel">Editorial & Smart Styles</span>
        </button>
      </div>
    </div>
  );
}
