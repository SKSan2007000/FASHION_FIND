'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Compass,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product } from '../../data';

interface OutfitModelViewerProps {
  topProduct: Product | null;
  bottomProduct: Product | null;
  shoesProduct: Product | null;
  accessoryProduct: Product | null;
  onOpenSelector?: (category: 'TOP' | 'BOTTOM' | 'SHOES' | 'ACCESSORY') => void;
}

// 6 Discrete fashion viewing angles for complete 360 inspection
const ANGLES = [
  { deg: 0, label: 'Front View', short: '0° Front', desc: 'Direct frontal editorial silhouette' },
  { deg: 45, label: '3/4 Perspective', short: '45° 3/4 Right', desc: 'Dynamic three-quarter angle' },
  { deg: 90, label: 'Profile View', short: '90° Side Right', desc: 'Clean side silhouette & drape' },
  { deg: 180, label: 'Back View', short: '180° Back', desc: 'Rear fit, yoke & pocket styling' },
  { deg: 270, label: 'Left Profile', short: '270° Side Left', desc: 'Left silhouette & accessory view' },
  { deg: 315, label: '3/4 Left View', short: '315° 3/4 Left', desc: 'Left three-quarter perspective' },
] as const;

interface GarmentColorPalette {
  base: string;
  dark: string;
  light: string;
  highlight: string;
  name: string;
  isDark: boolean;
}

const DEFAULT_TOP_COLOR: GarmentColorPalette = {
  base: '#2b4d77',
  dark: '#1c3453',
  light: '#426ea6',
  highlight: '#78a2d8',
  name: 'Mid Blue',
  isDark: true,
};

const DEFAULT_BOTTOM_COLOR: GarmentColorPalette = {
  base: '#1b2a47',
  dark: '#0e1829',
  light: '#2c436b',
  highlight: '#5272a3',
  name: 'Indigo Denim',
  isDark: true,
};

const DEFAULT_SHOE_COLOR: GarmentColorPalette = {
  base: '#f4f5f8',
  dark: '#dbe0ea',
  light: '#ffffff',
  highlight: '#ffffff',
  name: 'Crisp White',
  isDark: false,
};

// Color helper to determine garment hues
function getGarmentColor(product: Product | null, defaultColor: GarmentColorPalette): GarmentColorPalette {
  if (!product) return defaultColor;
  const color = (product.color || '').toLowerCase();
  const title = (product.title || '').toLowerCase();
  const combined = `${color} ${title}`;

  if (/mid blue|navy|dark blue|blue denim|chambray|indigo/.test(combined)) {
    return {
      base: '#2b4d77',
      dark: '#1c3453',
      light: '#426ea6',
      highlight: '#78a2d8',
      name: 'Indigo / Mid Blue',
      isDark: true,
    };
  }
  if (/black|charcoal|jet black|ebony|dark/.test(combined)) {
    return {
      base: '#1b1d22',
      dark: '#0f1013',
      light: '#2d3038',
      highlight: '#484c56',
      name: 'Obsidian Black',
      isDark: true,
    };
  }
  if (/white|pure white|crisp white|ivory|cream/.test(combined)) {
    return {
      base: '#f4f5f8',
      dark: '#dbe0ea',
      light: '#ffffff',
      highlight: '#ffffff',
      name: 'Crisp White',
      isDark: false,
    };
  }
  if (/tan|khaki|beige|camel|sand|brown|cognac/.test(combined)) {
    return {
      base: '#8c5932',
      dark: '#613c20',
      light: '#ad7243',
      highlight: '#cca078',
      name: 'Tan / Camel',
      isDark: true,
    };
  }
  if (/olive|green|military|sage/.test(combined)) {
    return {
      base: '#48563e',
      dark: '#303a29',
      light: '#627356',
      highlight: '#879b77',
      name: 'Military Olive',
      isDark: true,
    };
  }

  return {
    base: '#3a4b64',
    dark: '#243042',
    light: '#556a8a',
    highlight: '#7b92b5',
    name: product.color || 'Curated Shade',
    isDark: true,
  };
}

export default function OutfitModelViewer({
  topProduct,
  bottomProduct,
  shoesProduct,
  accessoryProduct,
  onOpenSelector,
}: OutfitModelViewerProps) {
  const [angleIdx, setAngleIdx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [, setDragDelta] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lightingMode, setLightingMode] = useState<'studio' | 'editorial' | 'sunset'>('studio');
  const viewerRef = useRef<HTMLDivElement>(null);

  const currentAngle = ANGLES[angleIdx % ANGLES.length];

  // Colors adapted to chosen outfit
  const topColor = useMemo(
    () => getGarmentColor(topProduct, DEFAULT_TOP_COLOR),
    [topProduct]
  );
  const bottomColor = useMemo(
    () => getGarmentColor(bottomProduct, DEFAULT_BOTTOM_COLOR),
    [bottomProduct]
  );
  const shoeColor = useMemo(
    () => getGarmentColor(shoesProduct, DEFAULT_SHOE_COLOR),
    [shoesProduct]
  );

  const isAccessoryWatch =
    accessoryProduct && /watch/i.test(accessoryProduct.title + ' ' + accessoryProduct.category);
  const isAccessoryGlasses =
    accessoryProduct &&
    /sunglass|glasses|eyewear/i.test(accessoryProduct.title + ' ' + accessoryProduct.category);
  const isAccessoryBelt =
    accessoryProduct && /belt/i.test(accessoryProduct.title + ' ' + accessoryProduct.category);

  // Rotation controls
  const rotateLeft = () => {
    setAngleIdx((prev) => (prev === 0 ? ANGLES.length - 1 : prev - 1));
  };

  const rotateRight = () => {
    setAngleIdx((prev) => (prev + 1) % ANGLES.length);
  };

  const resetRotation = () => {
    setAngleIdx(0);
    setIsZoomed(false);
  };

  // Drag interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragDelta(0);
    if (viewerRef.current) {
      viewerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX;
    setDragDelta(delta);

    const threshold = 40;
    if (delta > threshold) {
      rotateRight();
      setDragStartX(e.clientX);
      setDragDelta(0);
    } else if (delta < -threshold) {
      rotateLeft();
      setDragStartX(e.clientX);
      setDragDelta(0);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragDelta(0);
    if (viewerRef.current && viewerRef.current.hasPointerCapture(e.pointerId)) {
      viewerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotateLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotateRight();
    } else if (e.key === 'Home') {
      e.preventDefault();
      resetRotation();
    }
  };

  const hasCompleteOutfit = Boolean(topProduct && bottomProduct && shoesProduct);

  return (
    <div
      className="modelViewerSection glassPanel"
      ref={viewerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Interactive 360-degree rotatable fashion model outfit viewer"
    >
      {/* HEADER BAR */}
      <div className="modelViewerHeader">
        <div className="modelViewerTitleGroup">
          <span className="eyebrow">
            <Sparkles size={13} />
            Virtual Studio Preview
          </span>
          <h2>
            Your <em>Look.</em>
          </h2>
          <p className="modelViewerSubtitle">
            Interactive multi-angle preview of your selected outfit on a fashion model.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="modelViewerTopActions">
          <div className="lightingGroup">
            <button
              type="button"
              className={`toolBtn ${lightingMode === 'studio' ? 'active' : ''}`}
              onClick={() => setLightingMode('studio')}
              title="Studio Daylight Lighting"
              aria-label="Studio Daylight"
            >
              <Sun size={15} />
              <span>Day</span>
            </button>
            <button
              type="button"
              className={`toolBtn ${lightingMode === 'sunset' ? 'active' : ''}`}
              onClick={() => setLightingMode('sunset')}
              title="Warm Sunset Lighting"
              aria-label="Warm Sunset"
            >
              <Sparkles size={15} />
              <span>Sunset</span>
            </button>
            <button
              type="button"
              className={`toolBtn ${lightingMode === 'editorial' ? 'active' : ''}`}
              onClick={() => setLightingMode('editorial')}
              title="Editorial Mood Lighting"
              aria-label="Editorial Mood"
            >
              <Moon size={15} />
              <span>Night</span>
            </button>
          </div>

          <button
            type="button"
            className={`toolBtn ${isZoomed ? 'active' : ''}`}
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? 'Reset Zoom' : 'Zoom in on outfit details'}
            aria-label="Toggle Zoom"
          >
            {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
          </button>

          <button
            type="button"
            className="toolBtn"
            onClick={resetRotation}
            title="Reset to Front View"
            aria-label="Reset rotation to front view"
          >
            <RefreshCw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ROTATABLE STAGE CONTAINER */}
      <div
        className={`modelStageWrapper ${isDragging ? 'isDragging' : ''} ${
          isZoomed ? 'isZoomed' : ''
        } lighting-${lightingMode}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ROTATION STEP BUTTONS */}
        <button
          type="button"
          className="arrowBtn arrowBtnLeft"
          onClick={rotateLeft}
          aria-label="Rotate left (previous angle)"
        >
          ‹
        </button>

        <button
          type="button"
          className="arrowBtn arrowBtnRight"
          onClick={rotateRight}
          aria-label="Rotate right (next angle)"
        >
          ›
        </button>

        {/* ANGLE STATUS BADGE */}
        <div className="angleBadge">
          <Compass size={14} />
          <span>{currentAngle.label}</span>
          <span className="angleDegree">{currentAngle.deg}°</span>
        </div>

        {/* HUMAN FASHION MODEL RENDER CANVAS */}
        <div className="modelVisualContainer">
          <svg
            className="humanFashionModelSvg"
            viewBox="0 0 400 680"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={`Human model showing outfit from ${currentAngle.label}`}
          >
            <defs>
              {/* Studio lighting gradient filters */}
              <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#e8edf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#e8edf8" stopOpacity="0" />
              </radialGradient>

              {/* Natural Skin Tones */}
              <linearGradient id="skinTone" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8bf9e" />
                <stop offset="50%" stopColor="#d8a883" />
                <stop offset="100%" stopColor="#c2916c" />
              </linearGradient>
              <linearGradient id="skinShade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4a37e" />
                <stop offset="100%" stopColor="#b5825d" />
              </linearGradient>

              {/* Hair Shading */}
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#35241b" />
                <stop offset="60%" stopColor="#221610" />
                <stop offset="100%" stopColor="#140c08" />
              </linearGradient>

              {/* Top Garment Gradients */}
              <linearGradient id="topFabricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={topColor.light} />
                <stop offset="45%" stopColor={topColor.base} />
                <stop offset="100%" stopColor={topColor.dark} />
              </linearGradient>
              <linearGradient id="topSleeveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={topColor.light} />
                <stop offset="70%" stopColor={topColor.base} />
                <stop offset="100%" stopColor={topColor.dark} />
              </linearGradient>

              {/* Bottom Garment Gradients */}
              <linearGradient id="bottomFabricGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={bottomColor.light} />
                <stop offset="35%" stopColor={bottomColor.base} />
                <stop offset="75%" stopColor={bottomColor.dark} />
                <stop offset="100%" stopColor={bottomColor.base} />
              </linearGradient>
              <linearGradient id="denimWash" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={bottomColor.highlight} stopOpacity="0.4" />
                <stop offset="30%" stopColor={bottomColor.highlight} stopOpacity="0.15" />
                <stop offset="60%" stopColor={bottomColor.dark} stopOpacity="0.6" />
                <stop offset="100%" stopColor={bottomColor.dark} stopOpacity="0.8" />
              </linearGradient>

              {/* Shoes Gradients */}
              <linearGradient id="shoeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={shoeColor.light} />
                <stop offset="60%" stopColor={shoeColor.base} />
                <stop offset="100%" stopColor={shoeColor.dark} />
              </linearGradient>

              {/* Gold Aviator metal */}
              <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fae08c" />
                <stop offset="50%" stopColor="#d9a74a" />
                <stop offset="100%" stopColor="#9c6d1d" />
              </linearGradient>
              {/* Watch steel/leather */}
              <linearGradient id="watchBezel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e4e8ec" />
                <stop offset="50%" stopColor="#9aa0ac" />
                <stop offset="100%" stopColor="#505664" />
              </linearGradient>
              <linearGradient id="watchDial" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a6a" />
                <stop offset="100%" stopColor="#0f1d38" />
              </linearGradient>

              {/* Floor ambient occlusion shadow */}
              <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#16223b" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#2c3c5f" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2c3c5f" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* TURNTABLE FLOOR PEDESTAL */}
            <ellipse cx="200" cy="640" rx="145" ry="32" fill="url(#floorShadow)" />
            <ellipse cx="200" cy="638" rx="130" ry="24" fill="#ffffff" fillOpacity="0.6" stroke="rgba(215,224,240,0.8)" strokeWidth="1.5" />
            <ellipse cx="200" cy="638" rx="100" ry="18" fill="none" stroke="rgba(70,105,232,0.25)" strokeDasharray="4 6" strokeWidth="1.2" />

            {/* ======================================================== */}
            {/* 1. MODEL BODY LAYER (PROPORTIONAL HUMAN MODEL ANATOMY) */}
            {/* ======================================================== */}
            <g id="human-anatomy" className={`angle-view angle-${currentAngle.deg}`}>
              {/* FRONT VIEW (0°) */}
              {currentAngle.deg === 0 && (
                <g id="view-front">
                  {/* Neck */}
                  <path d="M188 128 L212 128 L214 158 L186 158 Z" fill="url(#skinShade)" />
                  <path d="M190 128 L210 128 L212 154 L188 154 Z" fill="url(#skinTone)" />
                  
                  {/* Head & Face */}
                  <ellipse cx="200" cy="92" rx="22" ry="29" fill="url(#skinTone)" />
                  <path d="M182 92 C182 116 190 126 200 128 C210 126 218 116 218 92 Z" fill="url(#skinTone)" />
                  
                  {/* Modern Textured Hairstyle */}
                  <path
                    d="M176 86 C176 60 188 52 200 52 C214 52 225 60 224 84 C222 75 218 70 210 68 C202 66 195 68 188 71 C182 74 178 79 176 86 Z"
                    fill="url(#hairGrad)"
                  />
                  {/* Ears */}
                  <ellipse cx="178" cy="94" rx="4" ry="7" fill="url(#skinShade)" />
                  <ellipse cx="222" cy="94" rx="4" ry="7" fill="url(#skinShade)" />

                  {/* Facial Features */}
                  <path d="M187 86 Q192 84 196 85" stroke="#3d2c20" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M204 85 Q208 84 213 86" stroke="#3d2c20" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="192" cy="91" r="1.5" fill="#3d2c20" />
                  <circle cx="208" cy="91" r="1.5" fill="#3d2c20" />
                  <path d="M200 89 L198 103 L202 103" stroke="#ba825a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M195 112 Q200 114 205 112" stroke="#b06c54" strokeWidth="1.8" strokeLinecap="round" />

                  {/* Arms & Hands */}
                  <path d="M152 168 L142 280 L139 345 L147 348 L154 280 L166 172 Z" fill="url(#skinTone)" />
                  <circle cx="143" cy="358" r="8" fill="url(#skinTone)" />
                  <path d="M248 168 L258 280 L261 345 L253 348 L246 280 L234 172 Z" fill="url(#skinTone)" />
                  <circle cx="257" cy="358" r="8" fill="url(#skinTone)" />
                </g>
              )}

              {/* THREE-QUARTER RIGHT (45°) */}
              {currentAngle.deg === 45 && (
                <g id="view-34-right">
                  <path d="M192 128 L214 128 L218 158 L190 158 Z" fill="url(#skinTone)" />
                  <ellipse cx="204" cy="92" rx="21" ry="29" fill="url(#skinTone)" />
                  <path d="M188 92 C188 116 196 126 206 128 C215 126 222 116 222 92 Z" fill="url(#skinTone)" />
                  <path d="M180 84 C180 58 194 50 208 50 C220 50 228 62 226 84 C222 72 214 66 204 66 C194 66 186 72 180 84 Z" fill="url(#hairGrad)" />
                  <ellipse cx="223" cy="94" rx="4" ry="7" fill="url(#skinShade)" />
                  <path d="M162 170 L154 280 L152 345 L160 348 L168 280 L176 172 Z" fill="url(#skinTone)" />
                  <path d="M244 168 L256 278 L262 344 L254 348 L244 278 L232 172 Z" fill="url(#skinTone)" />
                </g>
              )}

              {/* SIDE PROFILE RIGHT (90°) */}
              {currentAngle.deg === 90 && (
                <g id="view-90-profile">
                  <path d="M198 128 L216 128 L218 158 L196 158 Z" fill="url(#skinTone)" />
                  <ellipse cx="206" cy="92" rx="19" ry="29" fill="url(#skinTone)" />
                  <path d="M216 82 L225 93 L216 100 L219 114 L210 124 L200 126 Z" fill="url(#skinTone)" />
                  <path d="M190 86 C190 58 202 52 216 52 C225 52 226 68 222 80 C216 70 208 66 198 66 C192 66 190 74 190 86 Z" fill="url(#hairGrad)" />
                  <ellipse cx="202" cy="94" rx="4" ry="7" fill="url(#skinShade)" />
                  <path d="M206 170 L214 275 L216 345 L208 348 L200 275 L196 172 Z" fill="url(#skinTone)" />
                </g>
              )}

              {/* BACK VIEW (180°) */}
              {currentAngle.deg === 180 && (
                <g id="view-180-back">
                  <path d="M188 128 L212 128 L216 158 L184 158 Z" fill="url(#skinShade)" />
                  <ellipse cx="200" cy="90" rx="22" ry="29" fill="url(#hairGrad)" />
                  <path d="M178 72 C178 50 190 46 200 46 C210 46 222 50 222 72 C222 96 216 112 200 116 C184 112 178 96 178 72 Z" fill="url(#hairGrad)" />
                  <ellipse cx="177" cy="94" rx="3" ry="6" fill="url(#skinShade)" />
                  <ellipse cx="223" cy="94" rx="3" ry="6" fill="url(#skinShade)" />
                  <path d="M152 168 L142 280 L139 345 L147 348 L154 280 L166 172 Z" fill="url(#skinTone)" />
                  <path d="M248 168 L258 280 L261 345 L253 348 L246 280 L234 172 Z" fill="url(#skinTone)" />
                </g>
              )}

              {/* SIDE PROFILE LEFT (270°) */}
              {currentAngle.deg === 270 && (
                <g id="view-270-left">
                  <path d="M184 128 L202 128 L204 158 L182 158 Z" fill="url(#skinTone)" />
                  <ellipse cx="194" cy="92" rx="19" ry="29" fill="url(#skinTone)" />
                  <path d="M184 82 L175 93 L184 100 L181 114 L190 124 L200 126 Z" fill="url(#skinTone)" />
                  <path d="M210 86 C210 58 198 52 184 52 C175 52 174 68 178 80 C184 70 192 66 202 66 C208 66 210 74 210 86 Z" fill="url(#hairGrad)" />
                  <ellipse cx="198" cy="94" rx="4" ry="7" fill="url(#skinShade)" />
                  <path d="M194 170 L186 275 L184 345 L192 348 L200 275 L204 172 Z" fill="url(#skinTone)" />
                </g>
              )}

              {/* THREE-QUARTER LEFT (315°) */}
              {currentAngle.deg === 315 && (
                <g id="view-315-left">
                  <path d="M186 128 L208 128 L210 158 L182 158 Z" fill="url(#skinTone)" />
                  <ellipse cx="196" cy="92" rx="21" ry="29" fill="url(#skinTone)" />
                  <path d="M178 92 C178 116 185 126 194 128 C204 126 212 116 212 92 Z" fill="url(#skinTone)" />
                  <path d="M220 84 C220 58 206 50 192 50 C180 50 172 62 174 84 C178 72 186 66 196 66 C206 66 214 72 220 84 Z" fill="url(#hairGrad)" />
                  <ellipse cx="177" cy="94" rx="4" ry="7" fill="url(#skinShade)" />
                  <path d="M156 168 L144 278 L138 344 L146 348 L156 278 L168 172 Z" fill="url(#skinTone)" />
                  <path d="M238 170 L246 280 L248 345 L240 348 L232 280 L224 172 Z" fill="url(#skinTone)" />
                </g>
              )}
            </g>

            {/* ======================================================== */}
            {/* 2. TOP GARMENT LAYER (SHIRT / POLO / LAYER) */}
            {/* ======================================================== */}
            {topProduct ? (
              <g id="garment-top" className="garment-render">
                {/* 0° Front Top */}
                {currentAngle.deg === 0 && (
                  <g id="top-front">
                    <path
                      d="M165 158 L186 158 L194 175 L206 175 L214 158 L235 158 L244 235 L238 315 L162 315 L156 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M165 158 L142 278 L138 335 L150 338 L158 278 L168 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <path
                      d="M235 158 L258 278 L262 335 L250 338 L242 278 L232 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <rect x="137" y="333" width="14" height="6" rx="2" fill={topColor.dark} />
                    <rect x="249" y="333" width="14" height="6" rx="2" fill={topColor.dark} />

                    <line x1="200" y1="175" x2="200" y2="315" stroke={topColor.dark} strokeWidth="2.5" />
                    <circle cx="200" cy="195" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="200" cy="225" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="200" cy="255" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="200" cy="285" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />

                    {topProduct.neck?.toLowerCase().includes('mandarin') ? (
                      <path
                        d="M188 152 Q200 156 212 152 L212 160 Q200 164 188 160 Z"
                        fill={topColor.light}
                        stroke={topColor.dark}
                        strokeWidth="1.2"
                      />
                    ) : (
                      <g id="spread-collar">
                        <path
                          d="M188 154 L196 178 L200 174 L194 154 Z"
                          fill={topColor.light}
                          stroke={topColor.dark}
                          strokeWidth="1"
                        />
                        <path
                          d="M212 154 L204 178 L200 174 L206 154 Z"
                          fill={topColor.light}
                          stroke={topColor.dark}
                          strokeWidth="1"
                        />
                      </g>
                    )}
                    <path
                      d="M174 205 L186 205 L186 222 L180 226 L174 222 Z"
                      fill="none"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                      strokeOpacity="0.8"
                    />
                  </g>
                )}

                {/* 45° 3/4 Right Top */}
                {currentAngle.deg === 45 && (
                  <g id="top-45">
                    <path
                      d="M168 158 L190 158 L198 175 L210 175 L218 158 L238 158 L248 235 L242 315 L168 315 L162 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M168 158 L152 278 L148 335 L160 338 L168 278 L174 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <path
                      d="M238 158 L256 278 L262 335 L250 338 L244 278 L236 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <line x1="205" y1="175" x2="208" y2="315" stroke={topColor.dark} strokeWidth="2.5" />
                    <circle cx="205" cy="195" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="206" cy="225" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="207" cy="255" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="208" cy="285" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <path d="M190 154 L200 178 L205 174 L196 154 Z" fill={topColor.light} stroke={topColor.dark} strokeWidth="1" />
                    <path d="M216 154 L208 178 L205 174 L212 154 Z" fill={topColor.light} stroke={topColor.dark} strokeWidth="1" />
                  </g>
                )}

                {/* 90° Profile Top */}
                {currentAngle.deg === 90 && (
                  <g id="top-90">
                    <path
                      d="M192 158 L218 158 L226 235 L222 315 L182 315 L186 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M202 162 L212 275 L214 335 L202 338 L196 275 L192 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <rect x="201" y="333" width="14" height="6" rx="2" fill={topColor.dark} />
                    <path d="M214 154 L222 168 L216 172 L210 156 Z" fill={topColor.light} stroke={topColor.dark} strokeWidth="1" />
                  </g>
                )}

                {/* 180° Back Top */}
                {currentAngle.deg === 180 && (
                  <g id="top-180">
                    <path
                      d="M165 158 L184 158 L216 158 L235 158 L244 235 L238 315 L162 315 L156 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M165 185 Q200 190 235 185" stroke={topColor.dark} strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="200" y1="188" x2="200" y2="315" stroke={topColor.dark} strokeWidth="1.2" strokeOpacity="0.6" />
                    <path
                      d="M165 158 L142 278 L138 335 L150 338 L158 278 L168 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <path
                      d="M235 158 L258 278 L262 335 L250 338 L242 278 L232 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* 270° Left Profile Top */}
                {currentAngle.deg === 270 && (
                  <g id="top-270">
                    <path
                      d="M182 158 L208 158 L214 235 L218 315 L178 315 L174 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M198 162 L188 275 L186 335 L198 338 L204 275 L208 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <rect x="185" y="333" width="14" height="6" rx="2" fill={topColor.dark} />
                    <path d="M186 154 L178 168 L184 172 L190 156 Z" fill={topColor.light} stroke={topColor.dark} strokeWidth="1" />
                  </g>
                )}

                {/* 315° 3/4 Left Top */}
                {currentAngle.deg === 315 && (
                  <g id="top-315">
                    <path
                      d="M162 158 L182 158 L190 175 L202 175 L210 158 L232 158 L238 235 L232 315 L158 315 L152 235 Z"
                      fill="url(#topFabricGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M162 158 L144 278 L138 335 L150 338 L156 278 L164 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <path
                      d="M232 158 L248 278 L252 335 L240 338 L232 278 L226 190 Z"
                      fill="url(#topSleeveGrad)"
                      stroke={topColor.dark}
                      strokeWidth="1"
                    />
                    <line x1="195" y1="175" x2="192" y2="315" stroke={topColor.dark} strokeWidth="2.5" />
                    <circle cx="195" cy="195" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="194" cy="225" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="193" cy="255" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                    <circle cx="192" cy="285" r="1.8" fill="#ffffff" stroke={topColor.dark} strokeWidth="0.8" />
                  </g>
                )}
              </g>
            ) : (
              <g id="empty-top" className="empty-slot" onClick={() => onOpenSelector?.('TOP')} style={{ cursor: 'pointer' }}>
                <path
                  d="M165 158 L186 158 L194 175 L206 175 L214 158 L235 158 L244 235 L238 315 L162 315 L156 235 Z"
                  fill="rgba(230, 238, 252, 0.4)"
                  stroke="rgba(70, 105, 232, 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <circle cx="200" cy="235" r="16" fill="rgba(70, 105, 232, 0.15)" stroke="#4669e8" strokeWidth="1.2" />
                <text x="200" y="240" textAnchor="middle" fill="#4669e8" fontSize="16" fontWeight="bold">
                  +
                </text>
                <text x="200" y="270" textAnchor="middle" fill="#4669e8" fontSize="10" fontWeight="600">
                  Select Top
                </text>
              </g>
            )}

            {/* ======================================================== */}
            {/* 3. ACCESSORY LAYER (BELT / WATCH / SUNGLASSES) */}
            {/* ======================================================== */}
            {accessoryProduct && (
              <g id="garment-accessory" className="accessory-render">
                {isAccessoryGlasses && (currentAngle.deg === 0 || currentAngle.deg === 45 || currentAngle.deg === 315) && (
                  <g id="accessory-sunglasses">
                    <path
                      d="M185 88 Q192 86 198 89 L202 89 Q208 86 215 88 L217 96 C216 102 208 104 204 98 L200 90 L196 98 C192 104 184 102 183 96 Z"
                      fill="#1e3427"
                      stroke="url(#goldMetal)"
                      strokeWidth="1.5"
                    />
                    <line x1="198" y1="88" x2="202" y2="88" stroke="url(#goldMetal)" strokeWidth="1.5" />
                    <line x1="195" y1="85" x2="205" y2="85" stroke="url(#goldMetal)" strokeWidth="1.2" />
                  </g>
                )}

                {isAccessoryWatch && (
                  <g id="accessory-watch">
                    {currentAngle.deg === 0 && (
                      <g transform="translate(138, 336)">
                        <rect x="0" y="0" width="14" height="6" rx="1.5" fill="#543825" stroke="#331e10" strokeWidth="0.8" />
                        <circle cx="7" cy="3" r="4.5" fill="url(#watchDial)" stroke="url(#watchBezel)" strokeWidth="1.5" />
                        <circle cx="7" cy="3" r="1.5" fill="#ffffff" />
                      </g>
                    )}
                    {currentAngle.deg === 270 && (
                      <g transform="translate(186, 336)">
                        <circle cx="6" cy="3" r="5" fill="url(#watchDial)" stroke="url(#watchBezel)" strokeWidth="1.5" />
                      </g>
                    )}
                  </g>
                )}

                {isAccessoryBelt && (
                  <g id="accessory-belt">
                    <rect x="163" y="313" width="74" height="7" rx="1" fill="#3b2416" stroke="#22130a" strokeWidth="0.8" />
                    {currentAngle.deg === 0 && (
                      <rect x="195" y="312" width="10" height="9" rx="1.5" fill="none" stroke="url(#watchBezel)" strokeWidth="1.5" />
                    )}
                  </g>
                )}
              </g>
            )}

            {/* ======================================================== */}
            {/* 4. BOTTOM GARMENT LAYER (JEANS / CHINOS / TROUSERS) */}
            {/* ======================================================== */}
            {bottomProduct ? (
              <g id="garment-bottom" className="garment-render">
                {/* 0° Front Bottom */}
                {currentAngle.deg === 0 && (
                  <g id="bottom-front">
                    <path d="M162 315 L238 315 L242 335 L158 335 Z" fill={bottomColor.dark} />
                    <line x1="162" y1="315" x2="238" y2="315" stroke={bottomColor.light} strokeWidth="1.2" />

                    <path
                      d="M158 335 L196 345 L192 480 L188 565 L166 565 L164 480 L158 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M204 345 L242 335 L236 480 L234 565 L212 565 L208 480 L204 345 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />

                    <path d="M196 345 L200 365 L204 345 Z" fill={bottomColor.dark} />
                    <line x1="200" y1="315" x2="200" y2="355" stroke={bottomColor.dark} strokeWidth="2" />

                    <path d="M165 375 Q178 382 190 375" stroke={bottomColor.highlight} strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
                    <path d="M210 375 Q222 382 235 375" stroke={bottomColor.highlight} strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
                    <path d="M168 405 Q178 412 188 405" stroke={bottomColor.highlight} strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
                    <path d="M212 405 Q222 412 232 405" stroke={bottomColor.highlight} strokeWidth="1.2" strokeOpacity="0.3" fill="none" />

                    <path d="M160 338 Q174 344 178 360" stroke={bottomColor.light} strokeWidth="1.5" fill="none" />
                    <path d="M240 338 Q226 344 222 360" stroke={bottomColor.light} strokeWidth="1.5" fill="none" />

                    <line x1="166" y1="565" x2="188" y2="565" stroke={bottomColor.dark} strokeWidth="2.5" />
                    <line x1="212" y1="565" x2="234" y2="565" stroke={bottomColor.dark} strokeWidth="2.5" />
                  </g>
                )}

                {/* 45° 3/4 Right Bottom */}
                {currentAngle.deg === 45 && (
                  <g id="bottom-45">
                    <path d="M166 315 L242 315 L246 335 L164 335 Z" fill={bottomColor.dark} />
                    <path
                      d="M164 335 L200 345 L196 480 L192 565 L170 565 L168 480 L164 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M206 345 L246 335 L242 480 L238 565 L216 565 L212 480 L206 345 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <line x1="244" y1="335" x2="238" y2="565" stroke={bottomColor.light} strokeWidth="1.2" strokeOpacity="0.5" />
                  </g>
                )}

                {/* 90° Profile Bottom */}
                {currentAngle.deg === 90 && (
                  <g id="bottom-90">
                    <path d="M182 315 L222 315 L226 335 L180 335 Z" fill={bottomColor.dark} />
                    <path
                      d="M180 335 L226 335 L222 480 L216 565 L190 565 L188 480 L180 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <line x1="204" y1="335" x2="202" y2="565" stroke={bottomColor.light} strokeWidth="1.5" strokeDasharray="4 2" />
                    <rect x="208" y="342" width="10" height="8" rx="1" fill="none" stroke={bottomColor.light} strokeWidth="1.2" />
                  </g>
                )}

                {/* 180° Back Bottom */}
                {currentAngle.deg === 180 && (
                  <g id="bottom-180">
                    <path d="M162 315 L238 315 L242 335 L158 335 Z" fill={bottomColor.dark} />
                    <path
                      d="M158 335 L198 342 L194 480 L188 565 L166 565 L164 480 L158 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M202 342 L242 335 L236 480 L234 565 L212 565 L206 480 L202 342 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M162 328 L200 338 L238 328" stroke={bottomColor.light} strokeWidth="1.5" fill="none" />
                    <g id="back-pockets">
                      <path d="M168 345 L188 345 L188 368 L178 375 L168 368 Z" fill={bottomColor.dark} stroke={bottomColor.light} strokeWidth="1.2" />
                      <path d="M170 355 L178 362 L186 355" stroke={bottomColor.highlight} strokeWidth="1" fill="none" />
                      <path d="M212 345 L232 345 L232 368 L222 375 L212 368 Z" fill={bottomColor.dark} stroke={bottomColor.light} strokeWidth="1.2" />
                      <path d="M214 355 L222 362 L230 355" stroke={bottomColor.highlight} strokeWidth="1" fill="none" />
                    </g>
                  </g>
                )}

                {/* 270° Left Profile Bottom */}
                {currentAngle.deg === 270 && (
                  <g id="bottom-270">
                    <path d="M178 315 L218 315 L220 335 L174 335 Z" fill={bottomColor.dark} />
                    <path
                      d="M174 335 L220 335 L214 480 L210 565 L184 565 L180 480 L174 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <line x1="196" y1="335" x2="198" y2="565" stroke={bottomColor.light} strokeWidth="1.5" strokeDasharray="4 2" />
                  </g>
                )}

                {/* 315° 3/4 Left Bottom */}
                {currentAngle.deg === 315 && (
                  <g id="bottom-315">
                    <path d="M158 315 L234 315 L238 335 L154 335 Z" fill={bottomColor.dark} />
                    <path
                      d="M154 335 L194 345 L190 480 L184 565 L162 565 L160 480 L154 335 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M200 345 L238 335 L234 480 L230 565 L208 565 L204 480 L200 345 Z"
                      fill="url(#bottomFabricGrad)"
                      stroke={bottomColor.dark}
                      strokeWidth="1.2"
                    />
                  </g>
                )}
              </g>
            ) : (
              <g id="empty-bottom" className="empty-slot" onClick={() => onOpenSelector?.('BOTTOM')} style={{ cursor: 'pointer' }}>
                <path
                  d="M162 315 L238 315 L242 480 L234 565 L212 565 L200 365 L188 565 L166 565 L158 480 Z"
                  fill="rgba(230, 238, 252, 0.4)"
                  stroke="rgba(70, 105, 232, 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <circle cx="200" cy="425" r="16" fill="rgba(70, 105, 232, 0.15)" stroke="#4669e8" strokeWidth="1.2" />
                <text x="200" y="430" textAnchor="middle" fill="#4669e8" fontSize="16" fontWeight="bold">
                  +
                </text>
                <text x="200" y="455" textAnchor="middle" fill="#4669e8" fontSize="10" fontWeight="600">
                  Select Bottom
                </text>
              </g>
            )}

            {/* ======================================================== */}
            {/* 5. SHOES LAYER (SNEAKERS / LOAFERS / BOOTS) */}
            {/* ======================================================== */}
            {shoesProduct ? (
              <g id="garment-shoes" className="garment-render">
                {/* 0° Front Shoes */}
                {currentAngle.deg === 0 && (
                  <g id="shoes-front">
                    <path
                      d="M165 565 L189 565 L192 610 L195 628 L158 628 L160 610 Z"
                      fill="url(#shoeGrad)"
                      stroke={shoeColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M156 626 L197 626 L198 634 L155 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <ellipse cx="177" cy="616" rx="8" ry="4" fill="none" stroke={shoeColor.light} strokeWidth="1" />

                    <path
                      d="M211 565 L235 565 L240 610 L242 628 L205 628 L208 610 Z"
                      fill="url(#shoeGrad)"
                      stroke={shoeColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M203 626 L244 626 L245 634 L202 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <ellipse cx="223" cy="616" rx="8" ry="4" fill="none" stroke={shoeColor.light} strokeWidth="1" />
                  </g>
                )}

                {/* 45° 3/4 Right Shoes */}
                {currentAngle.deg === 45 && (
                  <g id="shoes-45">
                    <path d="M169 565 L193 565 L198 612 L202 628 L164 628 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M162 626 L204 626 L205 634 L161 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <path d="M215 565 L239 565 L248 612 L254 628 L212 628 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M210 626 L256 626 L257 634 L209 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                  </g>
                )}

                {/* 90° Profile Right Shoes */}
                {currentAngle.deg === 90 && (
                  <g id="shoes-90">
                    <path
                      d="M188 565 L216 565 L218 595 L254 626 L252 632 L182 632 L184 595 Z"
                      fill="url(#shoeGrad)"
                      stroke={shoeColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M180 628 L254 628 L255 635 L179 635 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <path d="M208 580 L226 612" stroke={shoeColor.light} strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}

                {/* 180° Back Shoes */}
                {currentAngle.deg === 180 && (
                  <g id="shoes-180">
                    <path d="M166 565 L188 565 L190 610 L190 628 L164 628 L164 610 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M162 626 L192 626 L192 634 L162 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <line x1="177" y1="570" x2="177" y2="626" stroke={shoeColor.light} strokeWidth="1.5" />

                    <path d="M212 565 L234 565 L236 610 L236 628 L210 628 L210 610 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M208 626 L238 626 L238 634 L208 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <line x1="223" y1="570" x2="223" y2="626" stroke={shoeColor.light} strokeWidth="1.5" />
                  </g>
                )}

                {/* 270° Profile Left Shoes */}
                {currentAngle.deg === 270 && (
                  <g id="shoes-270">
                    <path
                      d="M184 565 L212 565 L214 595 L216 632 L146 632 L144 626 L182 595 Z"
                      fill="url(#shoeGrad)"
                      stroke={shoeColor.dark}
                      strokeWidth="1.2"
                    />
                    <path d="M144 628 L218 628 L219 635 L143 635 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                  </g>
                )}

                {/* 315° 3/4 Left Shoes */}
                {currentAngle.deg === 315 && (
                  <g id="shoes-315">
                    <path d="M161 565 L185 565 L188 612 L188 628 L146 628 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M144 626 L190 626 L191 634 L143 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                    <path d="M207 565 L231 565 L236 612 L238 628 L198 628 Z" fill="url(#shoeGrad)" stroke={shoeColor.dark} strokeWidth="1.2" />
                    <path d="M196 626 L240 626 L241 634 L195 634 Z" fill="#ffffff" stroke="#c0c8d8" strokeWidth="1" />
                  </g>
                )}
              </g>
            ) : (
              <g id="empty-shoes" className="empty-slot" onClick={() => onOpenSelector?.('SHOES')} style={{ cursor: 'pointer' }}>
                <path
                  d="M160 565 L190 565 L195 628 L155 628 Z M210 565 L240 565 L245 628 L205 628 Z"
                  fill="rgba(230, 238, 252, 0.4)"
                  stroke="rgba(70, 105, 232, 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle cx="200" cy="595" r="14" fill="rgba(70, 105, 232, 0.15)" stroke="#4669e8" strokeWidth="1.2" />
                <text x="200" y="600" textAnchor="middle" fill="#4669e8" fontSize="14" fontWeight="bold">
                  +
                </text>
                <text x="200" y="618" textAnchor="middle" fill="#4669e8" fontSize="8" fontWeight="600">
                  Select Shoes
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* BOTTOM DRAG INSTRUCTION PROMPT */}
        <div className="modelRotatePrompt" aria-hidden="true">
          <span className="rotatePromptArrow">←</span>
          <span className="rotatePromptText">Drag to rotate 360°</span>
          <span className="rotatePromptArrow">→</span>
        </div>
      </div>

      {/* QUICK ANGLE SELECTOR PILLS */}
      <div className="angleSelectorBar" role="tablist" aria-label="Camera angle presets">
        {ANGLES.map((ang, idx) => (
          <button
            key={ang.deg}
            type="button"
            role="tab"
            aria-selected={angleIdx % ANGLES.length === idx}
            className={`anglePill ${angleIdx % ANGLES.length === idx ? 'active' : ''}`}
            onClick={() => setAngleIdx(idx)}
          >
            {ang.short}
          </button>
        ))}
      </div>

      {/* STATUS BANNER */}
      <div className="viewerStatusBanner">
        {hasCompleteOutfit ? (
          <div className="statusComplete">
            <CheckCircle2 size={16} className="textSuccess" />
            <span>Complete look assembled & ready to shop!</span>
          </div>
        ) : (
          <div className="statusIncomplete">
            <AlertCircle size={16} className="textMuted" />
            <span>Choose Top, Bottom and Shoes to complete your look (Accessory optional).</span>
          </div>
        )}
      </div>
    </div>
  );
}
