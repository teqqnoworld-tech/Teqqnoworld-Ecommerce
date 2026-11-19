import React, { useState } from 'react';
import {
  AlignCenter,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Eraser,
  Layers,
  Palette,
  RefreshCw,
  RotateCw,
  ShoppingCart,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { PrintMethod, Product, ProductColor, StudioLayer, StudioShapeType } from '../../types';
import { LogoCleanupOptions, PrintColorMode } from '../../utils/logoProcessor';
import {
  CANOPY_VARIANT_OPTIONS,
  ProductStudioMeta,
  SAMPLE_CORPORATE_LOGOS,
  STUDIO_SHAPES,
} from '../productStudioConfigs';
import { formatCurrencyINR } from '../../data/pricingRules';

type MobileSectionId = 'logo' | 'product' | 'text' | 'layers' | 'pricing';

interface ProductMobileWorkbenchProps {
  product: Product;
  meta: ProductStudioMeta;
  activeSide: 'front' | 'back';
  onChangeActiveSide: (side: 'front' | 'back') => void;
  selectedColor: ProductColor;
  onSelectColor: (color: ProductColor) => void;
  selectedVariantLabel?: string;
  onSelectVariantLabel?: (variant: string) => void;
  selectedPrintMethod: PrintMethod;
  onSelectPrintMethod: (pm: PrintMethod) => void;

  // Quick controls at top
  mainLogoLayer: StudioLayer | null;
  logoSizePercent: number;
  onLogoSizeSlider: (pct: number) => void;
  onCenterMainLogo: () => void;
  onRotateMainLogoStep: (deltaDeg: number) => void;
  onTriggerLogoUpload: (side: 'front' | 'back') => void;
  onOpenMagicEraser: () => void;
  frontRawLogo: string;
  backRawLogo: string;

  // Zone pills
  frontPlacement: string;
  backPlacement: string;
  noBackPrint: boolean;
  onSelectPlacement: (side: 'front' | 'back', placementId: string) => void;

  // Cleanup & Logo Options
  activeCleanup: LogoCleanupOptions;
  onUpdateCleanup: (patch: Partial<LogoCleanupOptions>) => void;
  onApplySampleLogo: (sampleId: string, label: string) => void;
  backUsesSameLogoAsFront: boolean;
  onToggleBackSync: (same: boolean) => void;

  // Text & Shapes
  onAddTextLayer: (preset: {
    text: string;
    fontSize: number;
    fontWeight: string;
    letterSpacing?: number;
    curved?: boolean;
  }) => void;
  onAddShapeLayer: (shapeType: StudioShapeType) => void;
  selectedLayer: StudioLayer | null;
  onUpdateLayer: (id: string, patch: Partial<StudioLayer>) => void;

  // Layers list
  activeLayers: StudioLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;

  // Pricing & Checkout
  quantity: number;
  onChangeQuantity: (q: number) => void;
  unitPrice: number;
  totalPrice: number;
  artworkApproved: boolean;
  onToggleArtworkApproved: (checked: boolean) => void;
  onDirectAddToCart: () => void;
  onApplyAndReturn: () => void;
  onScrollToPreview: () => void;
  isAddingToCart: boolean;
}

export const ProductMobileWorkbench: React.FC<ProductMobileWorkbenchProps> = ({
  product,
  meta,
  activeSide,
  onChangeActiveSide,
  selectedColor,
  onSelectColor,
  selectedVariantLabel,
  onSelectVariantLabel,
  selectedPrintMethod,
  onSelectPrintMethod,
  mainLogoLayer,
  logoSizePercent,
  onLogoSizeSlider,
  onCenterMainLogo,
  onRotateMainLogoStep,
  onTriggerLogoUpload,
  onOpenMagicEraser,
  frontRawLogo,
  backRawLogo,
  frontPlacement,
  backPlacement,
  noBackPrint,
  onSelectPlacement,
  activeCleanup,
  onUpdateCleanup,
  onApplySampleLogo,
  backUsesSameLogoAsFront,
  onToggleBackSync,
  onAddTextLayer,
  onAddShapeLayer,
  selectedLayer,
  onUpdateLayer,
  activeLayers,
  selectedLayerId,
  onSelectLayer,
  onDuplicateLayer,
  onDeleteLayer,
  quantity,
  onChangeQuantity,
  unitPrice,
  totalPrice,
  artworkApproved,
  onToggleArtworkApproved,
  onDirectAddToCart,
  onApplyAndReturn,
  onScrollToPreview,
  isAddingToCart,
}) => {
  const [quickText, setQuickText] = useState('TEQQNO CORP');
  const [activeJump, setActiveJump] = useState<MobileSectionId>('logo');

  const scrollToSection = (id: MobileSectionId) => {
    setActiveJump(id);
    const el = document.getElementById(`prod-mobile-sec-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const zoneOptions =
    activeSide === 'front' ? meta.barFrontPositions : meta.backPositions;

  return (
    <div className="md:hidden flex flex-col gap-3 pb-24 px-3 pt-2">
      {/* 1. UP-TOP QUICK LOGO SIZE & ACTION DECK (Most-used on small screens) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35]">
            Quick Logo Control
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTriggerLogoUpload(activeSide)}
              className="px-2.5 py-1 rounded-lg bg-[#071B35] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3 text-[#FF7900]" />
              <span>{mainLogoLayer ? 'Replace' : 'Upload'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenMagicEraser}
              disabled={!frontRawLogo && !backRawLogo}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[#071B35] text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <Eraser className="w-3 h-3 text-[#FF7900]" />
              <span>Eraser</span>
            </button>
          </div>
        </div>

        {mainLogoLayer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 shrink-0">Logo Size</span>
              <button
                type="button"
                onClick={() => onLogoSizeSlider(logoSizePercent - 10)}
                className="w-7 h-7 rounded-lg border border-slate-200 font-bold text-sm text-[#071B35] bg-slate-50 cursor-pointer"
              >
                −
              </button>
              <input
                type="range"
                min={30}
                max={200}
                value={logoSizePercent}
                onChange={(e) => onLogoSizeSlider(Number(e.target.value))}
                className="flex-1 accent-[#FF7900]"
              />
              <button
                type="button"
                onClick={() => onLogoSizeSlider(logoSizePercent + 10)}
                className="w-7 h-7 rounded-lg border border-slate-200 font-bold text-sm text-[#071B35] bg-slate-50 cursor-pointer"
              >
                +
              </button>
              <span className="text-[11px] font-extrabold text-[#FF7900] w-10 text-right">
                {logoSizePercent}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onCenterMainLogo}
                className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
              >
                <AlignCenter className="w-3 h-3 text-[#FF7900]" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={() => onRotateMainLogoStep(-15)}
                className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-[#FF7900] -scale-x-100" />
                <span>−15°</span>
              </button>
              <button
                type="button"
                onClick={() => onRotateMainLogoStep(15)}
                className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-[#FF7900]" />
                <span>+15°</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. 1-TAP COLOUR OR CANOPY VARIANT STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-extrabold uppercase tracking-wider text-[#071B35]">
            {meta.colorLabel}
          </span>
          <span className="font-bold text-[#FF7900]">
            {meta.hasCanopyVariants ? selectedVariantLabel || '4 × 4 ft' : selectedColor.name}
          </span>
        </div>

        {meta.hasCanopyVariants && onSelectVariantLabel && (
          <div className="grid grid-cols-2 gap-1.5">
            {CANOPY_VARIANT_OPTIONS.map((vp) => (
              <button
                key={vp.label}
                type="button"
                onClick={() => onSelectVariantLabel(vp.label)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-extrabold cursor-pointer ${
                  (selectedVariantLabel || '4 × 4 ft') === vp.label
                    ? 'bg-[#071B35] text-white border-[#071B35]'
                    : 'bg-slate-50 text-[#071B35] border-slate-200'
                }`}
              >
                {vp.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
          {product.colors.map((c) => {
            const active = c.name === selectedColor.name;
            const hex = c.hex || c.garmentHex || '#162B4D';
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelectColor(c)}
                className={`w-8 h-8 rounded-lg shrink-0 border flex items-center justify-center cursor-pointer ${
                  active ? 'ring-2 ring-[#FF7900] ring-offset-1 border-slate-900' : 'border-slate-300'
                }`}
                style={{ backgroundColor: hex }}
                title={c.name}
              >
                {active && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      hex.toLowerCase() === '#ffffff' ? 'text-[#071B35]' : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 1-TAP ZONE STRIP */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0 mr-1">
          Zone:
        </span>
        {zoneOptions.map((pos) => {
          const active =
            activeSide === 'front'
              ? frontPlacement === pos.id
              : pos.id === 'No back print'
              ? noBackPrint
              : !noBackPrint && backPlacement === pos.id;
          return (
            <button
              key={pos.id}
              type="button"
              onClick={() => onSelectPlacement(activeSide, pos.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border cursor-pointer transition-colors ${
                active
                  ? 'bg-[#071B35] text-white border-[#071B35]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {pos.shortLabel}
            </button>
          );
        })}
      </div>

      {/* 4. QUICK JUMP SECTION PILLS */}
      <div className="grid grid-cols-5 gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs sticky top-1 z-20">
        {(
          [
            { id: 'logo' as MobileSectionId, label: 'Logo', icon: Upload },
            { id: 'product' as MobileSectionId, label: 'Print', icon: Palette },
            { id: 'text' as MobileSectionId, label: 'Text', icon: Type },
            { id: 'layers' as MobileSectionId, label: 'Layers', icon: Layers },
            { id: 'pricing' as MobileSectionId, label: 'Order', icon: Sparkles },
          ]
        ).map((item) => {
          const Icon = item.icon;
          const active = activeJump === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer ${
                active ? 'bg-[#071B35] text-white' : 'text-slate-600'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#FF7900]' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* STACKED CARDS */}
      {/* CARD 1: LOGO & ERASER */}
      <div id="prod-mobile-sec-logo" className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-[#071B35]">
          1. Logo & Background Cleanup
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTriggerLogoUpload('front')}
            className="py-2.5 px-3 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-[#071B35] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF7900]" />
            <span>Upload Front Logo</span>
          </button>
          {meta.hasBackSide && (
            <button
              type="button"
              onClick={() => onTriggerLogoUpload('back')}
              className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#071B35] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#FF7900]" />
              <span>Separate Back Logo</span>
            </button>
          )}
        </div>

        {meta.hasBackSide && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-[#071B35]">Back-Side Logo Sync</span>
            <button
              type="button"
              onClick={() => onToggleBackSync(!backUsesSameLogoAsFront)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                backUsesSameLogoAsFront ? 'bg-[#071B35] text-white' : 'bg-[#FF7900] text-white'
              }`}
            >
              {backUsesSameLogoAsFront ? 'Synced w/ Front' : 'Independent'}
            </button>
          </div>
        )}

        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
          <span className="text-xs font-bold text-[#071B35]">Auto-Remove White Background</span>
          <input
            type="checkbox"
            checked={activeCleanup.removeBg}
            onChange={(e) => onUpdateCleanup({ removeBg: e.target.checked })}
            className="w-4 h-4 accent-[#FF7900]"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_CORPORATE_LOGOS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onApplySampleLogo(sample.id, sample.label)}
              className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-[#071B35] cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD 2: PRODUCT & PRINT OPTIONS */}
      <div id="prod-mobile-sec-product" className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-[#071B35]">
          2. Print Method & Ink Mode
        </div>

        <div className="space-y-1.5">
          {meta.printMethods.map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() => onSelectPrintMethod(pm.id)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                selectedPrintMethod === pm.id
                  ? 'border-[#FF7900] bg-orange-50/70'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-[#071B35]">{pm.title}</div>
                <div className="text-[10px] text-slate-500">{pm.subtitle}</div>
              </div>
              <span className="text-[10px] font-bold text-slate-600">{pm.turnaround}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'full' as PrintColorMode, label: 'Full Colour' },
              { id: 'auto' as PrintColorMode, label: 'Auto Contrast' },
              { id: 'white' as PrintColorMode, label: 'Solid White' },
              { id: 'black' as PrintColorMode, label: 'Solid Black' },
            ]
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onUpdateCleanup({ printColorMode: mode.id })}
              className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                activeCleanup.printColorMode === mode.id
                  ? 'bg-[#071B35] text-white border-[#071B35]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD 3: TEXT & SHAPES */}
      <div id="prod-mobile-sec-text" className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-[#071B35]">
          3. Text & Badges
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#071B35]"
            placeholder="Company name / tagline"
          />
          <button
            type="button"
            onClick={() =>
              onAddTextLayer({
                text: quickText.trim() || 'TEQQNO CORP',
                fontSize: 15,
                fontWeight: '700',
              })
            }
            className="px-3 py-2 rounded-xl bg-[#071B35] text-white text-xs font-bold cursor-pointer shrink-0"
          >
            + Text
          </button>
          <button
            type="button"
            onClick={() =>
              onAddTextLayer({
                text: quickText.trim() || 'EST. 2026',
                fontSize: 12,
                fontWeight: '700',
                curved: true,
              })
            }
            className="px-2.5 py-2 rounded-xl border border-orange-300 bg-orange-50 text-[#FF7900] text-xs font-bold cursor-pointer shrink-0"
          >
            Curved
          </button>
        </div>

        {selectedLayer && (selectedLayer.kind === 'text' || selectedLayer.kind === 'curved-text') && (
          <input
            type="text"
            value={selectedLayer.text || ''}
            onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-orange-50/40 text-xs font-bold text-[#071B35]"
          />
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {STUDIO_SHAPES.map((shp) => (
            <button
              key={shp.id}
              type="button"
              onClick={() => onAddShapeLayer(shp.id)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 text-[11px] font-bold text-[#071B35] cursor-pointer"
            >
              + {shp.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD 4: LAYERS */}
      <div id="prod-mobile-sec-layers" className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#071B35]">
            4. Layers ({activeLayers.length})
          </span>
          {meta.hasBackSide && (
            <button
              type="button"
              onClick={() => onChangeActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="text-[11px] font-bold text-[#FF7900] cursor-pointer"
            >
              Switch to {activeSide === 'front' ? 'Back' : 'Front'}
            </button>
          )}
        </div>

        {activeLayers.length === 0 ? (
          <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-xl text-center">
            No active layers on {activeSide}.
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeLayers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                  selectedLayerId === layer.id
                    ? 'border-[#FF7900] bg-orange-50/60'
                    : 'border-slate-200'
                }`}
              >
                <span className="text-xs font-bold text-[#071B35] truncate">
                  {layer.name || layer.text || (layer.isMainLogo ? 'Primary Logo' : 'Layer')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    className="p-1.5 text-slate-500"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="p-1.5 text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 5: QUANTITY & APPROVAL */}
      <div id="prod-mobile-sec-pricing" className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-[#071B35]">
          5. Quantity & Artwork Approval
        </div>

        <div className="grid grid-cols-6 gap-1">
          {meta.quickQuantities.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChangeQuantity(q)}
              className={`py-1.5 rounded-lg border text-[11px] font-extrabold cursor-pointer ${
                quantity === q
                  ? 'bg-[#071B35] text-white border-[#071B35]'
                  : 'bg-white text-[#071B35] border-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.max(meta.moq, quantity - 1))}
              className="w-9 h-9 font-bold text-[#071B35] bg-slate-50"
            >
              −
            </button>
            <input
              type="number"
              min={meta.moq}
              value={quantity}
              onChange={(e) => onChangeQuantity(Math.max(meta.moq, Number(e.target.value) || meta.moq))}
              className="w-14 text-center text-xs font-extrabold text-[#071B35]"
            />
            <button
              type="button"
              onClick={() => onChangeQuantity(quantity + 1)}
              className="w-9 h-9 font-bold text-[#071B35] bg-slate-50"
            >
              +
            </button>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-[#071B35] font-mono">
              {formatCurrencyINR(totalPrice)}
            </div>
            <div className="text-[10px] text-slate-500">
              {formatCurrencyINR(unitPrice)}/{meta.unitLabel} · Delhivery Express
            </div>
          </div>
        </div>

        <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={artworkApproved}
            onChange={(e) => onToggleArtworkApproved(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#FF7900]"
          />
          <div className="text-[11px] text-slate-700 leading-relaxed">
            <strong className="text-[#071B35] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Approve Artwork Preview
            </strong>
            I confirm placement, colour & spelling are final for production.
          </div>
        </label>
      </div>

      {/* STICKY MOBILE BOTTOM FOOTER */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 md:hidden shadow-lg">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-[#071B35] font-mono leading-tight">
            {formatCurrencyINR(totalPrice)}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {formatCurrencyINR(unitPrice)}/{meta.unitLabel} · {quantity} {meta.unitLabel}s
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onScrollToPreview}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-[#071B35]"
            title="Scroll to Preview"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onApplyAndReturn}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#071B35]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onDirectAddToCart}
            disabled={isAddingToCart}
            className="px-3.5 py-2 rounded-xl bg-[#FF7900] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isAddingToCart ? 'Added' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
