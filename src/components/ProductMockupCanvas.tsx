import React from 'react';
import { ProductColor, CustomArtwork, PrintMethod } from '../types';
import { getTippingPoloImages } from '../data/tippingPoloImages';
import { getPlainPoloImages } from '../data/plainPoloImages';
import { getJoabCoolmaxImages } from '../data/joabCoolmaxImages';
import { getMattyPoloImages } from '../data/mattyPoloImages';
import { getCapImages } from '../data/capImages';

interface ProductMockupCanvasProps {
  productType: 'tshirt' | 'polo' | 'hoodie' | 'bottle' | 'mug' | 'notebook' | 'badge' | 'backpack' | 'tote' | 'cap' | 'kit' | 'display' | 'table' | 'umbrella' | 'canopy' | 'standee' | 'visiting-card';
  color: ProductColor;
  artwork?: CustomArtwork | null;
  printMethod?: PrintMethod;
  printPlacement?: string;
  showPrintBoundary?: boolean;
  className?: string;
  onArtworkPositionChange?: (x: number, y: number) => void;
  interactiveDrag?: boolean;
  view?: 'front' | 'back';
  showWatermark?: boolean;
  selectedVariantLabel?: string;
}

export const ProductMockupCanvas: React.FC<ProductMockupCanvasProps> = ({
  productType,
  color,
  artwork,
  printMethod = 'DTF Printing',
  printPlacement = 'Left Chest',
  showPrintBoundary = false,
  className = '',
  onArtworkPositionChange,
  interactiveDrag = false,
  view = 'front',
  showWatermark = false,
  selectedVariantLabel,
}) => {
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactiveDrag || !onArtworkPositionChange) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !onArtworkPositionChange || !artwork) return;
    const deltaX = (e.clientX - dragStart.current.x) * 0.4;
    const deltaY = (e.clientY - dragStart.current.y) * 0.4;
    dragStart.current = { x: e.clientX, y: e.clientY };
    const newX = Math.max(-35, Math.min(35, artwork.x + deltaX));
    const newY = Math.max(-35, Math.min(35, artwork.y + deltaY));
    onArtworkPositionChange(newX, newY);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactiveDrag || !onArtworkPositionChange || e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !onArtworkPositionChange || !artwork || e.touches.length !== 1) return;
    const deltaX = (e.touches[0].clientX - dragStart.current.x) * 0.4;
    const deltaY = (e.touches[0].clientY - dragStart.current.y) * 0.4;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const newX = Math.max(-35, Math.min(35, artwork.x + deltaX));
    const newY = Math.max(-35, Math.min(35, artwork.y + deltaY));
    onArtworkPositionChange(newX, newY);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // Real photographic asset resolution for Polo Shirts / T-Shirts (Tipping vs Plain) and Caps
  const isPoloOrTshirt = productType === 'polo' || productType === 'tshirt';
  const isPlainVariant = !color.tippingHex;
  const poloImages = isPoloOrTshirt
    ? (isPlainVariant
        ? getPlainPoloImages(color.name, color.hex || color.garmentHex)
        : getTippingPoloImages(color.name, color.hex || color.garmentHex))
    : null;
  const poloPhotoUrl = isPoloOrTshirt
    ? (view === 'back' ? (color.imageBack || poloImages?.back) : (color.imageFront || poloImages?.front))
    : undefined;

  // Real photographic asset resolution for Caps
  const isCap = productType === 'cap';
  const capImages = isCap ? getCapImages(color.name, color.hex || color.garmentHex) : null;
  const capPhotoUrl = isCap ? (color.imageFront || capImages?.front) : undefined;

  // Base hex color for garment / surface contrast
  const baseHex = color.garmentHex || color.hex || '#1A1A1E';
  const surfaceHex = (() => {
    if (productType === 'mug' || productType === 'display' || productType === 'table' || productType === 'visiting-card') {
      return '#FFFFFF';
    }
    if (productType === 'standee') return '#111215';
    if (productType === 'canopy') return '#162B4D';
    if (productType === 'umbrella') {
      const pLower = (printPlacement || '').toLowerCase();
      if (pLower.includes('left') || pLower.includes('right') || pLower.includes('valance')) {
        return baseHex;
      }
      return '#FFFFFF'; // Center panel is pure white
    }
    return baseHex;
  })();
  const isWhiteColor = ['#ffffff', '#f9fafb', '#f0f1f5', '#fafafa'].includes(surfaceHex.toLowerCase());
  const isLightGarment = (() => {
    const clean = surfaceHex.replace('#', '').trim();
    if (clean.length < 6) return isWhiteColor;
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return 0.299 * r + 0.587 * g + 0.114 * b > 170;
  })();

  // Fine vertical calibration for photographic assets where image crop has slight offset
  const isTallerCropPolo = isPoloOrTshirt && (
    color.name.toLowerCase().includes('navy') ||
    color.name.toLowerCase().includes('maroon') ||
    color.name.toLowerCase().includes('burgundy') ||
    color.name.toLowerCase().includes('royal') ||
    color.name.toLowerCase().includes('apple') ||
    color.name.toLowerCase().includes('lime') ||
    color.name.toLowerCase().includes('turquoise')
  );
  const poloYCalib = isTallerCropPolo ? 3 : 0;

  // Determine print area coordinates based on productType, printPlacement and view
  // Coordinates are strictly relative to the garment area in the 500x500 SVG canvas:
  // Calibration directly derived from user reference photo (Mobile Hub Polo):
  // 1. Front View: Small left-chest logo on wearer's left chest (viewer's right, X ~ 297, Y ~ 168)
  //    Width: ~8-10 cm relative to real polo shirt (boxSize 36, ~20% of chest width)
  // 2. Back View: Large upper-center logo directly below collar on upper back (X: 250, Y ~ 156)
  //    Width: ~20-25 cm relative to real polo shirt (boxSize 96, ~45% of back width)
  const getPrintZone = (): { cx: number; cy: number; w: number; h: number; boxSize: number; label: string } => {
    if (view === 'back') {
      switch (productType) {
        case 'polo':
        case 'tshirt':
          // Large Upper-Center Logo directly below collar (matching reference image)
          if (printPlacement === 'Centre Back' || printPlacement === 'Centre back') {
            return {
              cx: 250,
              cy: 215 + poloYCalib,
              w: 150,
              h: 135,
              boxSize: 112,
              label: 'Centre Back'
            };
          }
          if (
            printPlacement === 'Upper Back Center' ||
            printPlacement === 'Upper Back Neck' ||
            printPlacement === 'Nape' ||
            printPlacement?.includes('Upper') ||
            !printPlacement?.includes('Full')
          ) {
            return { 
              cx: 250, 
              cy: 156 + poloYCalib, 
              w: 140, 
              h: 85, 
              boxSize: 96, 
              label: 'Upper Back Center' 
            };
          }
          // Full Back Center: also kept high on the upper back (never mid or lower back)
          return { 
            cx: 250, 
            cy: 166 + poloYCalib, 
            w: 155, 
            h: 95, 
            boxSize: 104, 
            label: 'Full Back Center' 
          };
        case 'hoodie':
          if (printPlacement?.includes('Upper')) {
            return { cx: 250, cy: 195, w: 120, h: 75, boxSize: 85, label: 'Upper Back Center' };
          }
          return { cx: 250, cy: 215, w: 150, h: 105, boxSize: 110, label: 'Full Back Center' };
        case 'visiting-card':
          return { cx: 250, cy: 250, w: 260, h: 147, boxSize: 110, label: 'Back Face (92×52 MM)' };
        case 'cap':
          return { cx: 250, cy: 188, w: 88, h: 42, boxSize: 48, label: 'Rear Arch' };
        case 'mug':
          if (printPlacement?.includes('Small')) {
            return { cx: 211, cy: 236, w: 110, h: 110, boxSize: 68, label: 'Back Small Logo' };
          }
          return { cx: 211, cy: 240, w: 170, h: 168, boxSize: 105, label: 'Back Print Area' };
        case 'umbrella':
          if (printPlacement?.toLowerCase().includes('valance')) {
            return { cx: 250, cy: 219, w: 132, h: 34, boxSize: 38, label: 'Back Valance' };
          }
          return { cx: 250, cy: 154, w: 115, h: 74, boxSize: 68, label: 'Back Center Panel' };
        case 'bottle':
        case 'notebook':
        case 'backpack':
        case 'tote':
        default:
          return { cx: 250, cy: 250, w: 140, h: 140, boxSize: 90, label: 'Back Center' };
      }
    }

    // Front views
    switch (productType) {
      case 'polo':
      case 'tshirt':
        // Wearer's Left Chest is viewer's right (X ~ 297):
        // Small & professional: 8-10 cm wide relative to adult shirt (~36 SVG units on 160-unit chest)
        // Positioned on the upper chest level with the bottom placket button, below collar
        if (
          printPlacement === 'Left Chest' ||
          printPlacement === "Left Chest (Wearer's Left)" ||
          (printPlacement?.includes('Left') && !printPlacement?.includes('Sleeve'))
        ) {
          return { 
            cx: 297, 
            cy: 168 + poloYCalib, 
            w: 52, 
            h: 52, 
            boxSize: 36, 
            label: 'Left Chest' 
          };
        }
        // Wearer's Right Chest is viewer's left (X ~ 203):
        if (
          printPlacement === 'Right Chest' ||
          printPlacement === "Right Chest (Wearer's Right)" ||
          printPlacement?.includes('Right')
        ) {
          return { 
            cx: 203, 
            cy: 168 + poloYCalib, 
            w: 52, 
            h: 52, 
            boxSize: 36, 
            label: 'Right Chest' 
          };
        }
        // Center Chest:
        if (printPlacement === 'Center Chest' || printPlacement?.includes('Center')) {
          return { 
            cx: 250, 
            cy: 208 + poloYCalib, 
            w: 115, 
            h: 85, 
            boxSize: 74, 
            label: 'Center Chest' 
          };
        }
        // Default standard corporate placement: Left Chest (Wearer's Left)
        return { 
          cx: 297, 
          cy: 168 + poloYCalib, 
          w: 52, 
          h: 52, 
          boxSize: 36, 
          label: 'Left Chest' 
        };

      case 'hoodie':
        if (printPlacement?.includes('Left')) return { cx: 295, cy: 200, w: 85, h: 85, boxSize: 65, label: 'Left Chest' };
        if (printPlacement?.includes('Right')) return { cx: 205, cy: 200, w: 85, h: 85, boxSize: 65, label: 'Right Chest' };
        return { cx: 250, cy: 235, w: 150, h: 120, boxSize: 110, label: 'Center Chest' };
      case 'bottle':
        return { cx: 250, cy: 260, w: 110, h: 170, boxSize: 85, label: 'Front Center' };
      case 'visiting-card':
        return { cx: 250, cy: 250, w: 260, h: 147, boxSize: 110, label: 'Front Face (92×52 MM)' };
      case 'mug':
        if (printPlacement?.includes('Left')) {
          return { cx: 225, cy: 240, w: 120, h: 155, boxSize: 84, label: 'Left of Handle' };
        }
        if (printPlacement?.includes('Wrap')) {
          return { cx: 275, cy: 240, w: 205, h: 170, boxSize: 118, label: 'Full Wrap Band' };
        }
        return { cx: 289, cy: 240, w: 170, h: 168, boxSize: 105, label: 'Front Print Area (8.5" × 3")' };
      case 'umbrella':
        if (printPlacement?.toLowerCase().includes('left')) {
          return { cx: 148, cy: 162, w: 72, h: 56, boxSize: 48, label: 'Left Panel' };
        }
        if (printPlacement?.toLowerCase().includes('right')) {
          return { cx: 352, cy: 162, w: 72, h: 56, boxSize: 48, label: 'Right Panel' };
        }
        if (printPlacement?.toLowerCase().includes('valance')) {
          return { cx: 250, cy: 219, w: 132, h: 34, boxSize: 38, label: 'Lower Valance' };
        }
        return { cx: 250, cy: 154, w: 115, h: 74, boxSize: 68, label: 'Center Panel' };
      case 'canopy':
        if (printPlacement?.toLowerCase().includes('valance') || printPlacement?.toLowerCase().includes('header')) {
          return { cx: 250, cy: 131, w: 228, h: 38, boxSize: 40, label: 'Top Valance Header' };
        }
        if (printPlacement?.toLowerCase().includes('full')) {
          return { cx: 250, cy: 328, w: 230, h: 124, boxSize: 112, label: 'Full Kiosk Branding' };
        }
        return { cx: 250, cy: 334, w: 216, h: 114, boxSize: 96, label: 'Lower Front Wall' };
      case 'standee':
        if (printPlacement?.toLowerCase().includes('top') || printPlacement?.toLowerCase().includes('header')) {
          return { cx: 250, cy: 118, w: 170, h: 92, boxSize: 84, label: 'Top Header (3×6 ft)' };
        }
        if (printPlacement?.toLowerCase().includes('lower') || printPlacement?.toLowerCase().includes('bottom')) {
          return { cx: 250, cy: 352, w: 170, h: 86, boxSize: 84, label: 'Lower Banner Strip' };
        }
        return { cx: 250, cy: 228, w: 174, h: 160, boxSize: 115, label: 'Center Main (3×6 ft)' };
      case 'display':
      case 'table':
        if (printPlacement?.toLowerCase().includes('counter')) {
          return { cx: 250, cy: 335, w: 224, h: 176, boxSize: 126, label: 'Front Counter Body' };
        }
        if (printPlacement?.toLowerCase().includes('full')) {
          return { cx: 250, cy: 335, w: 236, h: 186, boxSize: 148, label: 'Full Counter Display' };
        }
        return { cx: 250, cy: 90, w: 224, h: 62, boxSize: 58, label: 'Top Header (31" × 10.3")' };
      case 'badge':
        return { cx: 250, cy: 215, w: 160, h: 80, boxSize: 75, label: 'Front Center' };
      case 'notebook':
        return { cx: 250, cy: 250, w: 140, h: 170, boxSize: 90, label: 'Front Center' };
      case 'backpack':
        return { cx: 250, cy: 280, w: 120, h: 100, boxSize: 80, label: 'Front Center' };
      case 'tote':
        return { cx: 250, cy: 270, w: 160, h: 180, boxSize: 110, label: 'Front Center' };
      case 'cap':
        if (printPlacement?.includes('Left')) return { cx: 208, cy: 218, w: 82, h: 62, boxSize: 52, label: 'Left Crown' };
        if (printPlacement?.includes('Right')) return { cx: 292, cy: 218, w: 82, h: 62, boxSize: 52, label: 'Right Crown' };
        return { cx: 250, cy: 216, w: 130, h: 76, boxSize: 64, label: 'Front Crown' };
      case 'kit':
        return { cx: 250, cy: 250, w: 160, h: 140, boxSize: 90, label: 'Center Lid' };
      default:
        return { cx: 250, cy: 240, w: 140, h: 140, boxSize: 85, label: 'Center' };
    }
  };

  const zone = getPrintZone();
  // Safe bounds check: artwork.x and y are percentages within the zone (-35 to +35)
  const safeArtXPercent = artwork ? Math.max(-35, Math.min(35, artwork.x)) : 0;
  const safeArtYPercent = artwork ? Math.max(-35, Math.min(35, artwork.y)) : 0;
  const artX = zone.cx + (safeArtXPercent * zone.w) / 100;
  const artY = zone.cy + (safeArtYPercent * zone.h) / 100;
  const artScale = artwork ? Math.max(0.4, Math.min(2.5, artwork.scale)) : 1;
  const artRot = artwork ? artwork.rotation : 0;

  // Normalized scaling based on zone boxSize (reference unit 80px)
  const baseZoneScale = (zone.boxSize || 75) / 80;
  const finalScale = artScale * baseZoneScale;

  // Print technique effect filters
  const getArtworkFilter = () => {
    if (printMethod === 'Laser Engraving') {
      return 'brightness(1.4) drop-shadow(0 1px 1px rgba(0,0,0,0.7))';
    }
    if (printMethod === 'Precision Embroidery') {
      return 'drop-shadow(0.5px 0.5px 0 rgba(255,255,255,0.4)) drop-shadow(-0.5px -0.5px 0 rgba(0,0,0,0.5))';
    }
    if (printMethod === 'High-Precision UV') {
      return 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
    }
    return 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))';
  };

  return (
    <div 
      className={`relative select-none overflow-hidden flex items-center justify-center ${interactiveDrag ? 'touch-none' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: interactiveDrag ? 'grab' : 'default', touchAction: interactiveDrag ? 'none' : 'auto' }}
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full max-h-[460px] drop-shadow-xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle lighting overlay gradient */}
          <linearGradient id="bodyShade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>

          {/* Cylindrical lighting for bottles & mugs */}
          <linearGradient id="cylinderGleam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="85%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>

          {/* Laser engraving metallic sheen */}
          <linearGradient id="laserEngraveMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Shadow clip */}
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Floor ambient shadow */}
        <ellipse cx="250" cy="455" rx="160" ry="18" fill="#000000" fillOpacity="0.14" />

        {/* 1. POLO SHIRT / T-SHIRT (REAL HIGH-RESOLUTION PRODUCT PHOTOGRAPH) */}
        {isPoloOrTshirt && poloPhotoUrl && (
          <g filter="url(#softShadow)">
            <image
              href={poloPhotoUrl}
              x="50"
              y="15"
              width="400"
              height="470"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        )}

        {/* 2. CREW T-SHIRT (FRONT VIEW FALLBACK IF NO PHOTO) */}
        {productType === 'tshirt' && !poloPhotoUrl && view !== 'back' && (
          <g filter="url(#softShadow)">
            {/* Sleeves & Main Body */}
            <path
              d="M165 95 L105 160 L60 140 L100 235 L155 205 L150 425 Q250 440 350 425 L345 205 L400 235 L440 140 L395 160 L335 95 Q250 120 165 95 Z"
              fill={baseHex}
            />
            {/* Texture Shade */}
            <path
              d="M165 95 L105 160 L60 140 L100 235 L155 205 L150 425 Q250 440 350 425 L345 205 L400 235 L440 140 L395 160 L335 95 Q250 120 165 95 Z"
              fill="url(#bodyShade)"
            />
            {/* Ribbed Crew Collar Arc */}
            <path
              d="M185 99 Q250 140 315 99 Q250 125 185 99 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.3"
              strokeWidth="2"
            />
            {/* Inner Back Neck Collar */}
            <path
              d="M195 99 Q250 115 305 99 Q250 85 195 99 Z"
              fill="#000000"
              fillOpacity="0.25"
            />
          </g>
        )}

        {/* 2. CREW T-SHIRT (BACK VIEW FALLBACK IF NO PHOTO) */}
        {productType === 'tshirt' && !poloPhotoUrl && view === 'back' && (
          <g filter="url(#softShadow)">
            {/* Sleeves & Main Body */}
            <path
              d="M165 95 L105 160 L60 140 L100 235 L155 205 L150 425 Q250 440 350 425 L345 205 L400 235 L440 140 L395 160 L335 95 Q250 86 165 95 Z"
              fill={baseHex}
            />
            {/* Texture Shade */}
            <path
              d="M165 95 L105 160 L60 140 L100 235 L155 205 L150 425 Q250 440 350 425 L345 205 L400 235 L440 140 L395 160 L335 95 Q250 86 165 95 Z"
              fill="url(#bodyShade)"
            />
            {/* Ribbed Back Collar Arc */}
            <path
              d="M182 96 Q250 84 318 96 Q250 108 182 96 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            {/* Inner Neck Crescent / Tape */}
            <path
              d="M205 106 Q250 125 295 106 Z"
              fill="#000000"
              fillOpacity="0.12"
            />
            <text x="250" y="118" textAnchor="middle" fill="#FFFFFF" fillOpacity="0.55" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
              TEQQNO HEAVYWEIGHT 220 GSM
            </text>
            {/* Shoulder to shoulder taping seam */}
            <path
              d="M166 96 L182 96 M318 96 L334 96"
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 3. HOODIE (FRONT VIEW) */}
        {productType === 'hoodie' && view !== 'back' && (
          <g filter="url(#softShadow)">
            {/* Large Relaxed Body & Raglan Sleeves */}
            <path
              d="M160 90 L85 170 L40 150 L85 260 L145 220 L140 430 Q250 445 360 430 L355 220 L415 260 L460 150 L415 170 L340 90 Q250 115 160 90 Z"
              fill={baseHex}
            />
            <path
              d="M160 90 L85 170 L40 150 L85 260 L145 220 L140 430 Q250 445 360 430 L355 220 L415 260 L460 150 L415 170 L340 90 Q250 115 160 90 Z"
              fill="url(#bodyShade)"
            />
            {/* Hood Collar drape */}
            <path
              d="M175 90 Q250 165 325 90 Q250 70 175 90 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.3"
              strokeWidth="2"
            />
            {/* Hood Back Interior */}
            <path
              d="M190 90 Q250 50 310 90 Q250 75 190 90 Z"
              fill="#0A0A0C"
              fillOpacity="0.35"
            />
            {/* Kangaroo Pocket */}
            <path
              d="M180 320 L320 320 L335 395 Q250 405 165 395 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            {/* Drawstrings */}
            <path d="M225 140 Q228 200 232 230" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
            <path d="M275 140 Q272 200 268 230" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
            <circle cx="232" cy="232" r="3" fill="#D4D4D8" />
            <circle cx="268" cy="232" r="3" fill="#D4D4D8" />
          </g>
        )}

        {/* 3. HOODIE (BACK VIEW) */}
        {productType === 'hoodie' && view === 'back' && (
          <g filter="url(#softShadow)">
            {/* Large Relaxed Body & Raglan Sleeves */}
            <path
              d="M160 90 L85 170 L40 150 L85 260 L145 220 L140 430 Q250 445 360 430 L355 220 L415 260 L460 150 L415 170 L340 90 Q250 95 160 90 Z"
              fill={baseHex}
            />
            <path
              d="M160 90 L85 170 L40 150 L85 260 L145 220 L140 430 Q250 445 360 430 L355 220 L415 260 L460 150 L415 170 L340 90 Q250 95 160 90 Z"
              fill="url(#bodyShade)"
            />
            {/* Hanging Back Fleece Hood (draped over shoulders) */}
            <path
              d="M172 88 Q250 70 328 88 Q345 165 250 190 Q155 165 172 88 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.32"
              strokeWidth="2"
            />
            <path
              d="M172 88 Q250 70 328 88 Q345 165 250 190 Q155 165 172 88 Z"
              fill="url(#bodyShade)"
            />
            {/* Central Hood Seam Line */}
            <path
              d="M250 76 L250 190"
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            {/* Hood Edge Hem */}
            <path
              d="M175 92 Q250 78 325 92"
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}

        {/* 4. THERMAL FLASK / BOTTLE */}
        {productType === 'bottle' && (
          <g filter="url(#softShadow)">
            {/* Bottle Screw Lid / Cap */}
            <rect x="220" y="80" width="60" height="25" rx="5" fill="#27272A" stroke="#52525B" strokeWidth="1" />
            <rect x="235" y="60" width="30" height="20" rx="4" fill="#3F3F46" />
            <path d="M225 105 L275 105 L285 130 L215 130 Z" fill="#3F3F46" />
            {/* Silver Neck Ring */}
            <rect x="210" y="130" width="80" height="8" rx="2" fill="#E2E8F0" />
            {/* Bottle Cylinder Body */}
            <rect x="195" y="138" width="110" height="290" rx="14" fill={baseHex} />
            {/* Cylindrical Highlight */}
            <rect x="195" y="138" width="110" height="290" rx="14" fill="url(#cylinderGleam)" />
            {/* Bottle Base Ridge */}
            <path d="M195 410 Q250 422 305 410 L305 425 Q250 435 195 425 Z" fill="#000000" fillOpacity="0.3" />
          </g>
        )}

        {/* 5. CERAMIC MUG */}
        {productType === 'mug' && (
          <g filter="url(#softShadow)">
            <image
              href={view === 'back' ? '/assets/mug/mug_back_blank.webp' : '/assets/aistudio/Blank_White_Ceramic_Mug_b82bfadb.webp'}
              x="10"
              y="70"
              width="480"
              height="340"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        )}

        {/* 5B. METALLIC MAGNETIC ID BADGE */}
        {productType === 'badge' && (
          <g filter="url(#softShadow)">
            {/* Magnetic Clip Bar at Top */}
            <rect x="205" y="80" width="90" height="22" rx="4" fill="#27272A" stroke="#52525B" strokeWidth="1" />
            <circle cx="225" cy="91" r="4.5" fill="#CBD5E1" stroke="#475569" strokeWidth="0.8" />
            <circle cx="275" cy="91" r="4.5" fill="#CBD5E1" stroke="#475569" strokeWidth="0.8" />
            
            {/* Clear Lanyard Slot */}
            <rect x="235" y="105" width="30" height="7" rx="3.5" fill="#09090B" fillOpacity="0.45" />
            
            {/* Badge Outer Enclosure (Anodized Metal / Acrylic Holder) */}
            <rect x="135" y="118" width="230" height="280" rx="14" fill={baseHex} stroke="#000000" strokeOpacity="0.35" strokeWidth="2" />
            <rect x="135" y="118" width="230" height="280" rx="14" fill="url(#bodyShade)" />
            
            {/* Inner White/Metallic Card Face */}
            <rect x="147" y="132" width="206" height="252" rx="8" fill="#FFFFFF" fillOpacity={isWhiteColor ? 0.98 : 0.94} stroke="#E2E8F0" strokeWidth="1" />
            
            {/* Holographic Security Foil Strip */}
            <rect x="147" y="142" width="206" height="5" fill="url(#laserEngraveMetal)" fillOpacity="0.8" />
            
            {/* Subtle Photo Avatar Frame Placeholder */}
            <rect x="160" y="275" width="48" height="58" rx="4" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
            <circle cx="184" cy="294" r="10.5" fill="#94A3B8" />
            <path d="M168 322 Q184 309 200 322 Z" fill="#94A3B8" />
            
            {/* Name & Designation Lines */}
            <rect x="218" y="284" width="120" height="8" rx="2" fill="#0F172A" />
            <rect x="218" y="298" width="90" height="6" rx="2" fill="#64748B" />
            <rect x="218" y="310" width="70" height="5" rx="2" fill="#94A3B8" />
            
            {/* Bottom Magnetic Strip Indicator */}
            <rect x="147" y="362" width="206" height="22" fill="#0F172A" fillOpacity="0.06" />
            <text x="250" y="376" textAnchor="middle" fill="#64748B" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
              TEQQNO SECURE RFID · CORPORATE BADGE
            </text>
          </g>
        )}

        {/* 6. LEATHERETTE NOTEBOOK */}
        {productType === 'notebook' && (
          <g filter="url(#softShadow)">
            {/* Outer Hardbound Cover */}
            <rect x="160" y="110" width="180" height="270" rx="10" fill={baseHex} stroke="#000000" strokeOpacity="0.3" strokeWidth="2" />
            <rect x="160" y="110" width="180" height="270" rx="10" fill="url(#bodyShade)" />
            {/* Spine Spine Ridge */}
            <line x1="180" y1="110" x2="180" y2="380" stroke="#000000" strokeOpacity="0.35" strokeWidth="2.5" />
            {/* Page Edges subtle ivory look */}
            <path d="M340 120 L346 125 L346 365 L340 370 Z" fill="#FBF5E8" stroke="#D1C4A5" strokeWidth="1" />
            {/* Orange Silk Ribbon Bookmark */}
            <path d="M225 110 L232 410 L220 400 L208 410 L215 110 Z" fill="#FF7A00" />
            {/* Elastic Retention Band */}
            <rect x="310" y="110" width="14" height="270" rx="2" fill="#000000" fillOpacity="0.4" />
          </g>
        )}

        {/* 7. EXECUTIVE GIFT HAMPER BOX */}
        {productType === 'kit' && (
          <g filter="url(#softShadow)">
            {/* Outer Premium Magnetic Rigid Box */}
            <rect x="130" y="120" width="240" height="250" rx="12" fill={baseHex} stroke="#000000" strokeOpacity="0.3" strokeWidth="2" />
            <rect x="130" y="120" width="240" height="250" rx="12" fill="url(#bodyShade)" />
            {/* Laser Cut EVA Foam Bed */}
            <rect x="145" y="135" width="210" height="220" rx="8" fill="#111215" stroke="#2A2A30" strokeWidth="1" />
            {/* Cutout 1: Mini Flask */}
            <rect x="160" y="150" width="35" height="110" rx="8" fill="#09090B" stroke="#FF7A00" strokeOpacity="0.3" strokeWidth="1" />
            <rect x="163" y="155" width="29" height="100" rx="6" fill="#1F2937" />
            {/* Cutout 2: Leather Notebook */}
            <rect x="210" y="150" width="85" height="110" rx="4" fill="#09090B" stroke="#FF7A00" strokeOpacity="0.3" strokeWidth="1" />
            <rect x="213" y="153" width="79" height="104" rx="3" fill="#2C2725" />
            {/* Cutout 3: Engraved Pen */}
            <rect x="305" y="150" width="16" height="110" rx="4" fill="#09090B" stroke="#FF7A00" strokeOpacity="0.3" strokeWidth="1" />
            <rect x="308" y="155" width="10" height="100" rx="3" fill="#D4D4D8" />
            {/* Cutout 4: Cardholder */}
            <rect x="160" y="280" width="170" height="60" rx="6" fill="#09090B" stroke="#FF7A00" strokeOpacity="0.3" strokeWidth="1" />
            <rect x="164" y="284" width="162" height="52" rx="4" fill="#18181B" />
            <text x="245" y="315" fill="#FF7A00" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">TEQQNO WELCOME KIT</text>
          </g>
        )}

        {/* 8. WATERPROOF BACKPACK */}
        {productType === 'backpack' && (
          <g filter="url(#softShadow)">
            {/* Backpack main silhouette */}
            <path
              d="M170 180 Q170 120 250 120 Q330 120 330 180 L345 380 Q345 420 250 420 Q155 420 155 380 Z"
              fill={baseHex}
            />
            <path
              d="M170 180 Q170 120 250 120 Q330 120 330 180 L345 380 Q345 420 250 420 Q155 420 155 380 Z"
              fill="url(#bodyShade)"
            />
            {/* Top Carry Handle */}
            <path d="M215 120 Q215 90 250 90 Q285 90 285 120" fill="none" stroke="#27272A" strokeWidth="8" strokeLinecap="round" />
            {/* Front Utility Pocket flap */}
            <path d="M175 250 L325 250 L320 370 Q250 380 180 370 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.35" strokeWidth="2" />
            {/* Waterproof YKK Tape Line */}
            <path d="M185 249 L315 249" stroke="#FF7A00" strokeWidth="2.5" />
          </g>
        )}

        {/* 9. CANVAS TOTE BAG */}
        {productType === 'tote' && (
          <g filter="url(#softShadow)">
            {/* Dual Webbed Shoulder Straps */}
            <path d="M195 210 L195 90 Q250 80 250 90" fill="none" stroke="#3F3F46" strokeWidth="10" strokeLinecap="round" />
            <path d="M305 210 L305 90 Q250 80 250 90" fill="none" stroke="#3F3F46" strokeWidth="10" strokeLinecap="round" />
            {/* Bag Body Rectangle with soft tapered corners */}
            <rect x="150" y="190" width="200" height="230" rx="10" fill={baseHex} stroke="#000000" strokeOpacity="0.2" strokeWidth="2" />
            <rect x="150" y="190" width="200" height="230" rx="10" fill="url(#bodyShade)" />
            {/* Top hem stitch line */}
            <line x1="152" y1="210" x2="348" y2="210" stroke="#000000" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 2" />
          </g>
        )}

        {/* 10. STRUCTURED CAP (FRONT VIEW) */}
        {productType === 'cap' && view !== 'back' && (
          capPhotoUrl ? (
            <g filter="url(#softShadow)">
              <image
                href={capPhotoUrl}
                x="60"
                y="65"
                width="380"
                height="350"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          ) : (
            <g filter="url(#softShadow)">
              {/* Crown Dome */}
              <path
                d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
                fill={baseHex}
                stroke="#000000"
                strokeOpacity="0.25"
                strokeWidth="2"
              />
              <path
                d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
                fill="url(#bodyShade)"
              />
              {/* Curved Visor / Brim */}
              <path
                d="M150 255 Q250 240 350 255 Q360 290 250 310 Q140 290 150 255 Z"
                fill={baseHex}
                stroke="#000000"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              {/* Visor Concertina Stitching */}
              <path d="M165 265 Q250 250 335 265" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1.5" />
              <path d="M175 275 Q250 260 325 275" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1.5" />
              {/* Top Button */}
              <circle cx="250" cy="140" r="5" fill="#27272A" />
              {/* Panel seam lines */}
              <path d="M250 140 L250 250" stroke="#000000" strokeOpacity="0.2" strokeWidth="1.5" />
              <path d="M250 140 Q215 190 200 255" stroke="#000000" strokeOpacity="0.15" strokeWidth="1.5" />
              <path d="M250 140 Q285 190 300 255" stroke="#000000" strokeOpacity="0.15" strokeWidth="1.5" />
            </g>
          )
        )}

        {/* 10. STRUCTURED CAP (BACK VIEW) */}
        {productType === 'cap' && view === 'back' && (
          <g filter="url(#softShadow)">
            {/* Crown Dome Rear */}
            <path
              d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            <path
              d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
              fill="url(#bodyShade)"
            />
            {/* Visor under-rim curve */}
            <path
              d="M160 260 Q250 248 340 260 Q325 276 250 282 Q175 276 160 260 Z"
              fill={baseHex}
              stroke="#000000"
              strokeOpacity="0.3"
              strokeWidth="1.5"
            />
            {/* Keyhole Opening / Arch Cutout */}
            <path
              d="M205 258 Q250 210 295 258 Z"
              fill="#FAF9FD"
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />
            {/* Snapback Plastic Closure Strap */}
            <rect x="200" y="248" width="100" height="13" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
            {[208, 218, 228, 238, 248, 258, 268, 278, 288].map((cx) => (
              <circle key={cx} cx={cx} cy="254" r="1.8" fill="#71717A" />
            ))}
            {/* Top Button */}
            <circle cx="250" cy="140" r="5" fill="#27272A" />
            {/* Rear Seam */}
            <line x1="250" y1="140" x2="250" y2="210" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.5" />
          </g>
        )}

        {/* 11A. 5 FEET PROMOTIONAL UMBRELLA (INTERACTIVE 8-PANEL + VALANCE STAGE) */}
        {productType === 'umbrella' && (
          <g filter="url(#softShadow)">
            {/* Telescopic brushed steel center pole */}
            <rect x="244" y="210" width="12" height="196" rx="3" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            <rect x="246" y="210" width="4" height="196" fill="#F8FAFC" fillOpacity="0.7" />
            {/* Height lock clamp collar */}
            <rect x="240" y="294" width="20" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
            <circle cx="256" cy="301" r="2.2" fill="#1E293B" />
            {/* Folding metal tripod legs */}
            <path d="M244 388 L194 448 L203 451 L248 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            <path d="M256 388 L306 448 L297 451 L252 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            <rect x="246" y="395" width="8" height="44" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
            <circle cx="198" cy="449" r="4" fill="#18181B" />
            <circle cx="302" cy="449" r="4" fill="#18181B" />
            <circle cx="250" cy="439" r="4" fill="#18181B" />
            {/* Cross tripod brace bars */}
            <line x1="215" y1="424" x2="285" y2="424" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
            <rect x="239" y="382" width="22" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />

            {/* Canopy Inner Underside Shadow */}
            <path d="M74 202 Q250 182 426 202 L420 218 Q250 202 80 218 Z" fill="#0F172A" fillOpacity="0.22" />

            {/* Canopy Dome Left Colored Panel */}
            <path d="M250 82 Q145 104 75 196 L168 196 Q204 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
            {/* Canopy Dome Right Colored Panel */}
            <path d="M250 82 Q355 104 425 196 L332 196 Q296 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
            {/* Canopy Dome Center Pure White Panel */}
            <path d="M250 82 Q204 128 168 196 L332 196 Q296 128 250 82 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
            {/* Subtle fabric lighting over dome */}
            <path d="M75 196 Q145 104 250 82 Q355 104 425 196 Z" fill="url(#bodyShade)" fillOpacity="0.35" />

            {/* Lower Valance Skirt (Alternating: Left White, Center Colored, Right White) */}
            <path d="M75 196 L168 196 L168 238 Q122 243 75 236 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
            <path d="M168 196 L332 196 L332 242 Q250 247 168 242 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.18" strokeWidth="1.2" />
            <path d="M332 196 L425 196 L425 236 Q378 243 332 238 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
            {/* Rib Tip Caps */}
            <circle cx="75" cy="197" r="3" fill="#CBD5E1" />
            <circle cx="168" cy="197" r="2.5" fill="#CBD5E1" />
            <circle cx="332" cy="197" r="2.5" fill="#CBD5E1" />
            <circle cx="425" cy="197" r="3" fill="#CBD5E1" />
            {/* Top Finial Cap Ball */}
            <circle cx="250" cy="76" r="7.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
            <circle cx="248" cy="74" r="2.5" fill="#FFFFFF" />
          </g>
        )}

        {/* 11B. PROMOTIONAL CANOPY KIOSK (NAVY BLUE ONLY) */}
        {productType === 'canopy' && (
          <g filter="url(#softShadow)">
            {/* Back interior shadow cavity */}
            <rect x="132" y="152" width="236" height="236" fill="#0B162C" fillOpacity="0.88" />
            {/* Back left & right metal support posts (depth) */}
            <rect x="150" y="152" width="8" height="235" fill="#1E293B" />
            <rect x="342" y="152" width="8" height="235" fill="#1E293B" />

            {/* Lower interior counter rail bar */}
            <line x1="150" y1="272" x2="350" y2="272" stroke="#334155" strokeWidth="4" />

            {/* Peaked Navy Canopy Roof */}
            <polygon points="250,48 112,108 388,108" fill="#1E3A68" stroke="#0F1F3D" strokeWidth="1.5" />
            <polygon points="250,48 250,108 388,108" fill="#132645" fillOpacity="0.45" />
            {/* Top Valance Header Band */}
            <rect x="116" y="108" width="268" height="46" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
            <line x1="118" y1="114" x2="382" y2="114" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="118" y1="148" x2="382" y2="148" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />

            {/* Heavy-Duty Black Powder-Coated Front Posts */}
            <rect x="116" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
            <rect x="372" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
            {/* Post Locking Collars */}
            <rect x="114" y="208" width="16" height="10" rx="2" fill="#27272A" />
            <rect x="370" y="208" width="16" height="10" rx="2" fill="#27272A" />
            {/* Heavy Metal Foot Plates */}
            <ellipse cx="122" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />
            <ellipse cx="378" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />

            {/* Lower Front Counter Skirt Panel (Printable Fabric Wall) */}
            <rect x="128" y="266" width="244" height="138" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
            <rect x="128" y="266" width="244" height="138" rx="2" fill="url(#bodyShade)" fillOpacity="0.4" />
            {/* Upper Velcro Header Flap on Counter Wall */}
            <line x1="130" y1="273" x2="370" y2="273" stroke="#FFFFFF" strokeOpacity="0.22" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="130" y1="397" x2="370" y2="397" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />

            {/* Subtle Variant Badge (4x4 / 8x8) */}
            {selectedVariantLabel && (
              <g>
                <rect x="206" y="434" width="88" height="20" rx="10" fill="#0F172A" />
                <text x="250" y="447" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="monospace">
                  {selectedVariantLabel} · 7 ft H
                </text>
              </g>
            )}
          </g>
        )}

        {/* 11C. ROLLUP STANDEE (3 FT × 6 FT, BLACK ONLY) */}
        {productType === 'standee' && (
          <g filter="url(#softShadow)">
            {/* Back vertical pole peek at top */}
            <rect x="247" y="42" width="6" height="20" rx="2" fill="#27272A" />
            {/* Dual Rotating Aluminum Stabilizer Feet */}
            <rect x="172" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
            <rect x="304" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
            {/* Retractable Anodized Black Aluminum Cassette Base */}
            <rect x="136" y="410" width="228" height="32" rx="12" fill="#18181B" stroke="#3F3F46" strokeWidth="1.5" />
            <rect x="136" y="410" width="228" height="11" rx="6" fill="#FFFFFF" fillOpacity="0.08" />
            <circle cx="144" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />
            <circle cx="356" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />

            {/* Vertical 3 × 6 ft Flex Banner Canvas */}
            <rect x="150" y="56" width="200" height="356" fill="#121318" stroke="#27272A" strokeWidth="1.5" />
            <rect x="150" y="56" width="200" height="356" fill="url(#bodyShade)" fillOpacity="0.28" />

            {/* Top Black Anodized Clamp Rail */}
            <rect x="142" y="46" width="216" height="14" rx="6" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
            <rect x="240" y="45" width="20" height="16" rx="3" fill="#27272A" />
          </g>
        )}

        {/* 11D. PROMO TABLE DISPLAY (WHITE ONLY) */}
        {(productType === 'display' || productType === 'table') && (
          <g filter="url(#softShadow)">
            {/* Twin Brushed Steel Support Rods */}
            <rect x="154" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            <rect x="157" y="126" width="4" height="94" fill="#F8FAFC" />
            <rect x="334" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            <rect x="337" y="126" width="4" height="94" fill="#F8FAFC" />

            {/* Top Overhead Header Board (31" × 10.3") */}
            <rect x="124" y="52" width="252" height="76" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.8" />
            <rect x="124" y="52" width="252" height="76" rx="8" fill="url(#bodyShade)" fillOpacity="0.14" />

            {/* Tabletop Counter Slab */}
            <rect x="112" y="218" width="276" height="16" rx="7" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Counter Front Body Panel (31.6" × 30.3") */}
            <rect x="120" y="234" width="260" height="206" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Curved vertical side shading for molded PP counter look */}
            <rect x="120" y="234" width="260" height="206" rx="6" fill="url(#cylinderGleam)" fillOpacity="0.2" />
            {/* Bottom Foot Plinth */}
            <rect x="114" y="434" width="272" height="14" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
          </g>
        )}

        {/* 12. PREMIUM 300 GSM VISITING CARD */}
        {productType === 'visiting-card' && (
          <g filter="url(#softShadow)">
            {/* Undercard subtle stack effect for realistic depth */}
            <rect x="73" y="148" width="354" height="204" rx="8" fill="#CBD5E1" transform="rotate(1.2 250 250)" opacity="0.6" />
            <rect x="71" y="146" width="358" height="206" rx="8" fill="#E2E8F0" transform="rotate(-0.8 250 250)" opacity="0.8" />
            {/* Main 300 GSM Card Face (92 x 52 MM ratio ~ 360 x 204) */}
            <rect x="70" y="148" width="360" height="204" rx="7" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Paper texture subtle sheen */}
            <rect x="70" y="148" width="360" height="204" rx="7" fill="url(#bodyShade)" opacity="0.18" />
            {/* Clean die-cut safe cutting boundary guide (3mm safety zone) */}
            <rect x="84" y="162" width="332" height="176" rx="4" fill="none" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
            {/* Card footer details */}
            <text x="250" y="342" textAnchor="middle" fill="#94A3B8" fontSize="7" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              {view === 'back' ? '300 GSM SMOOTH ART PAPER · BACK SIDE' : '300 GSM SMOOTH ART PAPER · FRONT SIDE (92 × 52 MM)'}
            </text>
          </g>
        )}

        {/* -------------------- PRINT AREA BOUNDARY (OPTIONAL) -------------------- */}
        {showPrintBoundary && (
          <g className="pointer-events-none">
            <rect
              x={zone.cx - zone.w / 2}
              y={zone.cy - zone.h / 2}
              width={zone.w}
              height={zone.h}
              fill="#FF7A00"
              fillOpacity="0.08"
              stroke="#FF7A00"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              rx="6"
            />
            {/* Zone Tag Label */}
            <rect
              x={zone.cx - 50}
              y={zone.cy - zone.h / 2 - 16}
              width={100}
              height={14}
              rx={3}
              fill="#FF7A00"
            />
            <text
              x={zone.cx}
              y={zone.cy - zone.h / 2 - 6}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="7.5"
              fontWeight="bold"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing="0.5"
            >
              {zone.label.toUpperCase()}
            </text>
          </g>
        )}

        {/* -------------------- DYNAMIC CUSTOM ARTWORK RENDER -------------------- */}
        {artwork && artwork.studioLayers && artwork.studioLayers.length > 0 ? (
          <g style={{ filter: getArtworkFilter() }}>
            {artwork.studioLayers
              .filter((l) => l.visible !== false)
              .map((layer) => {
                const halfW = layer.width / 2;
                const halfH = layer.height / 2;
                const curveVal = layer.curve || 0;
                const pathId = `canvas-curve-${layer.id}`;
                const displayText =
                  layer.textTransform === 'uppercase'
                    ? (layer.text || '').toUpperCase()
                    : layer.text || '';

                return (
                  <g
                    key={layer.id}
                    transform={`translate(${layer.x}, ${layer.y}) rotate(${layer.rotation || 0})`}
                    opacity={layer.opacity ?? 1}
                  >
                    {(layer.kind === 'logo' || layer.kind === 'image') && layer.dataUrl && (
                      <g transform={layer.flipX ? 'scale(-1, 1)' : undefined}>
                        <image
                          href={layer.dataUrl}
                          x={-halfW}
                          y={-halfH}
                          width={layer.width}
                          height={layer.height}
                          preserveAspectRatio="xMidYMid meet"
                        />
                      </g>
                    )}

                    {layer.kind === 'text' && (
                      <text
                        x={layer.textAlign === 'left' ? -halfW : layer.textAlign === 'right' ? halfW : 0}
                        y={(layer.fontSize || 14) * 0.34}
                        textAnchor={layer.textAlign === 'left' ? 'start' : layer.textAlign === 'right' ? 'end' : 'middle'}
                        fill={layer.textColor || '#FFFFFF'}
                        fontSize={layer.fontSize || 14}
                        fontFamily={layer.fontFamily || 'Space Grotesk'}
                        fontWeight={layer.fontWeight || '700'}
                        fontStyle={layer.fontStyle || 'normal'}
                        letterSpacing={layer.letterSpacing ?? 0.5}
                      >
                        {displayText}
                      </text>
                    )}

                    {layer.kind === 'curved-text' && (
                      <g>
                        <defs>
                          <path
                            id={pathId}
                            d={`M ${-halfW} ${curveVal > 0 ? 10 : -10} Q 0 ${-curveVal * 0.75} ${halfW} ${
                              curveVal > 0 ? 10 : -10
                            }`}
                          />
                        </defs>
                        <text
                          fill={layer.textColor || '#FFFFFF'}
                          fontSize={layer.fontSize || 13}
                          fontFamily={layer.fontFamily || 'Space Grotesk'}
                          fontWeight={layer.fontWeight || '700'}
                          fontStyle={layer.fontStyle || 'normal'}
                          letterSpacing={layer.letterSpacing ?? 1}
                          textAnchor="middle"
                        >
                          <textPath href={`#${pathId}`} startOffset="50%">
                            {displayText}
                          </textPath>
                        </text>
                      </g>
                    )}

                    {layer.kind === 'shape' && (
                      <>
                        {layer.shapeType === 'rect' && (
                          <rect
                            x={-halfW}
                            y={-halfH}
                            width={layer.width}
                            height={layer.height}
                            rx={layer.borderRadius ?? 6}
                            fill={layer.fillColor || '#FF7A00'}
                            stroke={layer.strokeColor || 'none'}
                            strokeWidth={layer.strokeWidth || 0}
                          />
                        )}
                        {layer.shapeType === 'pill' && (
                          <rect
                            x={-halfW}
                            y={-halfH}
                            width={layer.width}
                            height={layer.height}
                            rx={Math.min(halfW, halfH)}
                            fill={layer.fillColor || '#FF7A00'}
                            stroke={layer.strokeColor || 'none'}
                            strokeWidth={layer.strokeWidth || 0}
                          />
                        )}
                        {layer.shapeType === 'circle' && (
                          <ellipse
                            cx={0}
                            cy={0}
                            rx={halfW}
                            ry={halfH}
                            fill={layer.fillColor || '#FF7A00'}
                            stroke={layer.strokeColor || 'none'}
                            strokeWidth={layer.strokeWidth || 0}
                          />
                        )}
                        {layer.shapeType === 'ring' && (
                          <ellipse
                            cx={0}
                            cy={0}
                            rx={Math.max(4, halfW - (layer.strokeWidth || 4) / 2)}
                            ry={Math.max(4, halfH - (layer.strokeWidth || 4) / 2)}
                            fill="none"
                            stroke={layer.strokeColor || layer.fillColor || '#FF7A00'}
                            strokeWidth={layer.strokeWidth || 5}
                          />
                        )}
                        {layer.shapeType === 'triangle' && (
                          <polygon
                            points={`0,${-halfH} ${halfW},${halfH} ${-halfW},${halfH}`}
                            fill={layer.fillColor || '#FF7A00'}
                            stroke={layer.strokeColor || 'none'}
                            strokeWidth={layer.strokeWidth || 0}
                          />
                        )}
                        {layer.shapeType === 'line' && (
                          <rect
                            x={-halfW}
                            y={-Math.max(1.5, halfH / 2)}
                            width={layer.width}
                            height={Math.max(3, layer.height)}
                            rx={2}
                            fill={layer.fillColor || '#FF7A00'}
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              })}
          </g>
        ) : artwork && (
          <g
            transform={`translate(${artX}, ${artY}) rotate(${artRot}) scale(${finalScale})`}
            style={{ filter: getArtworkFilter() }}
          >
            {/* Option A: Uploaded Image (dataUrl) with locked aspect ratio */}
            {artwork.type === 'image' && artwork.dataUrl && (
              <image
                href={artwork.dataUrl}
                x={-40}
                y={-40}
                width={80}
                height={80}
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            {/* Option B: Preset Badge Logos */}
            {artwork.type === 'preset' && (
              <g>
                {(artwork.presetId === 'your-logo' || artwork.presetId === 'teqqno' || !artwork.presetId) && (
                  <g textAnchor="middle">
                    <rect
                      x="-36"
                      y="-24"
                      width="72"
                      height="48"
                      rx="8"
                      fill={isLightGarment ? '#000000' : '#FFFFFF'}
                      fillOpacity={isLightGarment ? '0.06' : '0.1'}
                      stroke={printMethod === 'Laser Engraving' ? '#CBD5E1' : '#FF7A00'}
                      strokeWidth="2.2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x="0"
                      y="-3"
                      fill={printMethod === 'Laser Engraving' ? '#E2E8F0' : (isLightGarment ? '#111215' : '#FFFFFF')}
                      fontSize="10.5"
                      fontWeight="800"
                      letterSpacing="0.8"
                      fontFamily="Space Grotesk"
                    >
                      YOUR LOGO
                    </text>
                    <text
                      x="0"
                      y="13"
                      fill={printMethod === 'Laser Engraving' ? '#CBD5E1' : '#FF7A00'}
                      fontSize="11.5"
                      fontWeight="800"
                      letterSpacing="1.6"
                      fontFamily="Space Grotesk"
                    >
                      HERE
                    </text>
                  </g>
                )}

                {artwork.presetId === 'hyperscale' && (
                  <g textAnchor="middle">
                    <polygon points="0,-20 18,13 -18,13" fill={printMethod === 'Laser Engraving' ? 'url(#laserEngraveMetal)' : '#3B82F6'} />
                    <text x="0" y="7" fill="#FFFFFF" fontSize="11" fontWeight="bold">▲</text>
                    <text x="0" y="30" fill={printMethod === 'Laser Engraving' ? '#E2E8F0' : (color.hex === '#F9FAFB' ? '#111215' : '#FFFFFF')} fontSize="9.5" fontWeight="700" letterSpacing="1.5" fontFamily="Space Grotesk">HYPERSCALE</text>
                  </g>
                )}

                {artwork.presetId === 'zepto' && (
                  <g textAnchor="middle">
                    <rect x="-16" y="-16" width="32" height="32" rx="5" fill={printMethod === 'Laser Engraving' ? 'url(#laserEngraveMetal)' : '#10B981'} />
                    <text x="0" y="5" fill="#FFFFFF" fontSize="14" fontWeight="bold">◆</text>
                    <text x="0" y="30" fill={printMethod === 'Laser Engraving' ? '#E2E8F0' : (color.hex === '#F9FAFB' ? '#111215' : '#FFFFFF')} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="Space Grotesk">ZEPTO LOGIX</text>
                  </g>
                )}

                {artwork.presetId === 'finedge' && (
                  <g textAnchor="middle">
                    <circle cx="0" cy="0" r="16" fill="none" stroke={printMethod === 'Laser Engraving' ? '#E2E8F0' : '#F59E0B'} strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="9" fill={printMethod === 'Laser Engraving' ? 'url(#laserEngraveMetal)' : '#F59E0B'} />
                    <text x="0" y="30" fill={printMethod === 'Laser Engraving' ? '#E2E8F0' : (color.hex === '#F9FAFB' ? '#111215' : '#FFFFFF')} fontSize="9.5" fontWeight="700" letterSpacing="1.5" fontFamily="Space Grotesk">FINEDGE</text>
                  </g>
                )}

                {artwork.presetId === 'acme' && (
                  <g textAnchor="middle">
                    <text x="0" y="4" fill={printMethod === 'Laser Engraving' ? 'url(#laserEngraveMetal)' : '#EC4899'} fontSize="24">✦</text>
                    <text x="0" y="26" fill={printMethod === 'Laser Engraving' ? '#E2E8F0' : (color.hex === '#F9FAFB' ? '#111215' : '#FFFFFF')} fontSize="10" fontWeight="700" letterSpacing="2" fontFamily="Space Grotesk">ACME</text>
                  </g>
                )}
              </g>
            )}

            {/* Option C: Custom Text */}
            {artwork.type === 'text' && artwork.text && (
              <g textAnchor="middle">
                <text
                  x="0"
                  y="5"
                  fill={printMethod === 'Laser Engraving' ? 'url(#laserEngraveMetal)' : (artwork.textColor || (color.hex === '#F9FAFB' ? '#111215' : '#FFFFFF'))}
                  fontSize="14"
                  fontWeight="700"
                  letterSpacing="1"
                  fontFamily={artwork.fontFamily || 'Poppins'}
                >
                  {artwork.text}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Floating technique pill watermark (Only rendered when showWatermark is true to avoid overlapping host preview controls) */}
      {showWatermark && (
        <div className="absolute bottom-3 left-3 text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm pointer-events-none">
          <span className={`w-2 h-2 rounded-full ${view === 'back' ? 'bg-[#FF7A00]' : 'bg-emerald-500'}`} />
          <span className="font-bold text-zinc-900 dark:text-white">{view === 'back' ? 'Back View' : 'Front View'}</span>
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium">{zone.label}</span>
        </div>
      )}
    </div>
  );
};
