import React, { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  ChevronRight,
  Eraser,
  FlipHorizontal2,
  Grid,
  ImagePlus,
  Layers,
  Palette,
  RefreshCw,
  Ruler,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wand2,
} from 'lucide-react';
import { PrintMethod, Product, ProductColor, StudioLayer, StudioShapeType } from '../../types';
import {
  LogoCleanupOptions,
  LogoLayoutMode,
  LogoPartItem,
  PrintColorMode,
} from '../../utils/logoProcessor';
import {
  CANOPY_VARIANT_OPTIONS,
  LogoFileMeta,
  ProductStudioMeta,
  SAMPLE_CORPORATE_LOGOS,
  STUDIO_FONT_FAMILIES,
  STUDIO_SHAPES,
  STUDIO_TEXT_COLORS,
  formatBytesCompact,
  getLogoLayoutOptions,
} from '../productStudioConfigs';

export type LeftAccordionId = 'product' | 'upload' | 'text' | 'quick' | 'print' | 'settings';

interface ProductLeftToolkitPanelProps {
  product: Product;
  meta: ProductStudioMeta;
  activeSide: 'front' | 'back';
  selectedColor: ProductColor;
  onSelectColor: (c: ProductColor) => void;
  selectedVariantLabel?: string;
  onSelectVariantLabel?: (variant: string) => void;
  selectedPrintMethod: PrintMethod;
  onSelectPrintMethod: (pm: PrintMethod) => void;
  openSection: LeftAccordionId | null;
  onToggleSection: (id: LeftAccordionId) => void;

  // Upload & Logo Mode
  frontRawLogo: string;
  backRawLogo: string;
  frontFileName: string;
  backFileName: string;
  frontFileMeta: LogoFileMeta | null;
  backFileMeta: LogoFileMeta | null;
  uploadProgress: number | null;
  backUsesSameLogoAsFront: boolean;
  onToggleBackSync: (same: boolean) => void;
  onTriggerLogoUpload: (targetSide: 'front' | 'back') => void;
  onTriggerExtraImageUpload: () => void;
  onRemoveMainLogo: () => void;
  onApplySampleLogo: (sampleId: string, label: string) => void;

  // Cleanup & Settings
  activeCleanup: LogoCleanupOptions;
  onUpdateCleanup: (patch: Partial<LogoCleanupOptions>) => void;
  activeParts: LogoPartItem[];
  onTogglePartVisibility: (idx: number) => void;
  onOpenMagicEraser: () => void;

  // Layer Selection / Transformations
  mainLogoLayer: StudioLayer | null;
  logoSizePercent: number;
  onLogoSizeSlider: (pct: number) => void;
  onUpdateLayer: (layerId: string, patch: Partial<StudioLayer>) => void;
  onCenterMainLogo: () => void;
  selectedLayer: StudioLayer | null;

  // Company Name & Text
  companyNameText: string;
  onChangeCompanyNameText: (v: string) => void;
  hasCompanyNameLayer: boolean;
  onToggleCompanyName: () => void;
  onAddTextLayer: (preset: {
    text: string;
    fontSize: number;
    fontWeight: string;
    letterSpacing?: number;
    curved?: boolean;
  }) => void;
  onAddShapeLayer: (shapeType: StudioShapeType) => void;

  // Placements
  frontPlacement: string;
  backPlacement: string;
  noBackPrint: boolean;
  onSelectPlacement: (side: 'front' | 'back', placementId: string) => void;
}

export const ProductLeftToolkitPanel: React.FC<ProductLeftToolkitPanelProps> = ({
  product,
  meta,
  activeSide,
  selectedColor,
  onSelectColor,
  selectedVariantLabel,
  onSelectVariantLabel,
  selectedPrintMethod,
  onSelectPrintMethod,
  openSection,
  onToggleSection,
  frontRawLogo,
  backRawLogo,
  frontFileName,
  backFileName,
  frontFileMeta,
  backFileMeta,
  uploadProgress,
  backUsesSameLogoAsFront,
  onToggleBackSync,
  onTriggerLogoUpload,
  onTriggerExtraImageUpload,
  onRemoveMainLogo,
  onApplySampleLogo,
  activeCleanup,
  onUpdateCleanup,
  activeParts,
  onTogglePartVisibility,
  onOpenMagicEraser,
  mainLogoLayer,
  logoSizePercent,
  onLogoSizeSlider,
  onUpdateLayer,
  onCenterMainLogo,
  selectedLayer,
  companyNameText,
  onChangeCompanyNameText,
  hasCompanyNameLayer,
  onToggleCompanyName,
  onAddTextLayer,
  onAddShapeLayer,
  frontPlacement,
  backPlacement,
  noBackPrint,
  onSelectPlacement,
}) => {
  const [customTextInput, setCustomTextInput] = useState('TEQQNO CORP');
  const [taglineInput, setTaglineInput] = useState('INNOVATE · DELIVER');

  const activeFileName = activeSide === 'front' ? frontFileName : backFileName;
  const activeFileMeta = activeSide === 'front' ? frontFileMeta : backFileMeta;
  const hasMainLogo = Boolean(mainLogoLayer);
  const logoLayoutOptions = getLogoLayoutOptions();

  const renderAccordionHeader = (
    id: LeftAccordionId,
    icon: React.ReactNode,
    title: string,
    subtitle: string
  ) => {
    const isOpen = openSection === id;
    return (
      <button
        type="button"
        onClick={() => onToggleSection(id)}
        className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
          isOpen ? 'bg-slate-50/90' : 'bg-white hover:bg-slate-50/60'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isOpen ? 'bg-[#071B35] text-white' : 'bg-orange-50 text-[#FF7900]'
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#071B35] truncate">
              {title}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
    );
  };

  return (
    <aside className="w-[312px] xl:w-[330px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
      {/* Panel Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
        <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#071B35]">
          Design Toolkit
        </span>
        <span className="text-[11px] font-bold text-[#FF7900] capitalize">
          {meta.hasBackSide ? `Editing: ${activeSide} Side` : meta.singleSideBadge}
        </span>
      </div>

      {/* Scrollable Accordions */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {/* 1. PRODUCT & COLOURS / VARIANTS */}
        <div>
          {renderAccordionHeader(
            'product',
            <Palette className="w-3.5 h-3.5" />,
            meta.hasCanopyVariants ? 'Product & Variants' : 'Product & Colours',
            `${selectedColor.name} · ${meta.hasCanopyVariants ? selectedVariantLabel || '4 × 4 ft' : `${product.colors.length} option${product.colors.length === 1 ? '' : 's'}`}`
          )}
          {openSection === 'product' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3.5 bg-white">
              {/* Product Spec Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#071B35] truncate">{product.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF7900] shrink-0">
                    {meta.specBadge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">{meta.materialSummary}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                  <Ruler className="w-3 h-3 text-[#FF7900] shrink-0" />
                  <span>{meta.sizeLabel}</span>
                </div>
              </div>

              {/* Canopy 4x4 vs 8x8 Selector */}
              {meta.hasCanopyVariants && onSelectVariantLabel && (
                <div>
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                    Select Canopy Footprint Size
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CANOPY_VARIANT_OPTIONS.map((vp) => {
                      const active = (selectedVariantLabel || '4 × 4 ft') === vp.label;
                      return (
                        <button
                          key={vp.label}
                          type="button"
                          onClick={() => onSelectVariantLabel(vp.label)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-[#FF7900] bg-orange-50/70 ring-1 ring-[#FF7900]/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="text-xs font-extrabold text-[#071B35]">{vp.label}</div>
                          <div className="text-[10px] text-slate-500">From ₹{vp.price.toLocaleString('en-IN')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Colours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700">{meta.colorLabel}</span>
                  <span className="text-[11px] font-semibold text-[#071B35]">{selectedColor.name}</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {product.colors.map((c) => {
                    const isSelected = c.name === selectedColor.name;
                    const hex = c.hex || c.garmentHex || '#162B4D';
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => onSelectColor(c)}
                        title={c.name}
                        className={`relative w-8 h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-[#FF7900] ring-offset-2 border-slate-900 scale-105'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {c.tippingHex && (
                          <span
                            className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white/80"
                            style={{ backgroundColor: c.tippingHex }}
                          />
                        )}
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 stroke-[3] ${
                              hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#f8fafc'
                                ? 'text-[#071B35]'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. LOGO UPLOAD */}
        <div>
          {renderAccordionHeader(
            'upload',
            <Upload className="w-3.5 h-3.5" />,
            'Logo Upload',
            `PNG, JPG, SVG, PDF · ${meta.hasBackSide ? 'Front & Back' : 'High-Res Print'}`
          )}
          {openSection === 'upload' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3 bg-white">
              {/* Upload Dropzone */}
              <div
                onClick={() => onTriggerLogoUpload(activeSide)}
                className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] hover:bg-orange-50/40 rounded-2xl p-4 text-center cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#071B35] text-white group-hover:bg-[#FF7900] flex items-center justify-center mx-auto mb-2 transition-colors shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-xs font-extrabold text-[#071B35]">
                  {hasMainLogo ? 'Replace Active Logo' : 'Upload Company Logo'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Supports PNG, JPG, SVG, PDF · Transparent BG ready
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-[#071B35]">
                    <span>Optimizing artwork...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF7900] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Active File Info */}
              {activeFileMeta && (
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[10px] text-emerald-900 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{activeFileMeta.fileName}</div>
                    <div className="text-emerald-700">
                      {activeFileMeta.mimeType} · {formatBytesCompact(activeFileMeta.fileSizeBytes)}
                      {activeFileMeta.naturalWidth > 0 && ` · ${activeFileMeta.naturalWidth}×${activeFileMeta.naturalHeight}px`}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              )}

              {/* Replace / Remove / Add Image Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onTriggerLogoUpload(activeSide)}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-[#071B35] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#FF7900]" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveMainLogo}
                  disabled={!hasMainLogo}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 hover:border-red-200 bg-white text-xs font-bold text-red-600 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onTriggerExtraImageUpload}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>Add Secondary Image / QR Badge</span>
              </button>

              {/* Back-Side Logo Mode */}
              {meta.hasBackSide && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#071B35]">Back-Side Logo Mode</span>
                    <button
                      type="button"
                      onClick={() => onToggleBackSync(!backUsesSameLogoAsFront)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer transition-colors ${
                        backUsesSameLogoAsFront
                          ? 'bg-[#071B35] text-white'
                          : 'bg-[#FF7900] text-white'
                      }`}
                    >
                      {backUsesSameLogoAsFront ? 'Synced' : 'Independent'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerLogoUpload('back')}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    + Upload Separate Back Logo
                  </button>
                  {backRawLogo && (
                    <div className="text-[10px] text-slate-500 truncate">
                      Back file: <strong className="text-slate-700">{backFileName}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-Remove White BG */}
              <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="text-[11px] font-bold text-[#071B35]">Auto-Remove White BG</div>
                  <div className="text-[10px] text-slate-500">Clean transparent edges on surface</div>
                </div>
                <input
                  type="checkbox"
                  checked={activeCleanup.removeBg}
                  onChange={(e) => onUpdateCleanup({ removeBg: e.target.checked })}
                  className="w-4 h-4 accent-[#FF7900] rounded cursor-pointer"
                />
              </label>

              {/* Sample Corporate Logos */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Sample Corporate Logos
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_CORPORATE_LOGOS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => onApplySampleLogo(sample.id, sample.label)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-[#FF7900] hover:bg-orange-50/40 text-[10px] font-bold text-[#071B35] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sample.accent }}
                      />
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. TEXT & ADDITIONS */}
        <div>
          {renderAccordionHeader(
            'text',
            <Type className="w-3.5 h-3.5" />,
            'Text & Additions',
            'Custom text, tagline, curved text, shapes'
          )}
          {openSection === 'text' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3 bg-white">
              {/* Quick Add Text */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500">Company / Heading</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customTextInput}
                    onChange={(e) => setCustomTextInput(e.target.value)}
                    placeholder="Your company name"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#071B35]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onAddTextLayer({
                        text: customTextInput.trim() || 'COMPANY NAME',
                        fontSize: 15,
                        fontWeight: '700',
                        letterSpacing: 1,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#071B35] hover:bg-[#0e2d54] text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Tagline & Curved */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500">Tagline / Curved Text</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={taglineInput}
                    onChange={(e) => setTaglineInput(e.target.value)}
                    placeholder="Tagline or website"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#071B35]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onAddTextLayer({
                        text: taglineInput.trim() || 'EST. 2026',
                        fontSize: 11,
                        fontWeight: '600',
                        letterSpacing: 1.5,
                        curved: true,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-[#FF7900] text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    + Curved
                  </button>
                </div>
              </div>

              {/* Active Text Layer Styling */}
              {selectedLayer && (selectedLayer.kind === 'text' || selectedLayer.kind === 'curved-text') && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF7900]">
                    Edit Selected Text Layer
                  </div>
                  <input
                    type="text"
                    value={selectedLayer.text || ''}
                    onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#071B35]"
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={selectedLayer.fontFamily || 'Space Grotesk'}
                      onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-[#071B35]"
                    >
                      {STUDIO_FONT_FAMILIES.map((f) => (
                        <option key={f.label} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedLayer.fontWeight || '700'}
                      onChange={(e) => onUpdateLayer(selectedLayer.id, { fontWeight: e.target.value })}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-[#071B35]"
                    >
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">ExtraBold (800)</option>
                    </select>
                  </div>

                  {/* Size & Alignment */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                      {(['left', 'center', 'right'] as const).map((al) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: al })}
                          className={`p-1 rounded cursor-pointer ${
                            (selectedLayer.textAlign || 'center') === al
                              ? 'bg-[#071B35] text-white'
                              : 'text-slate-500 hover:text-[#071B35]'
                          }`}
                        >
                          {al === 'left' ? (
                            <AlignLeft className="w-3.5 h-3.5" />
                          ) : al === 'right' ? (
                            <AlignRight className="w-3.5 h-3.5" />
                          ) : (
                            <AlignCenter className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={8}
                        max={40}
                        value={selectedLayer.fontSize || 14}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                        }
                        className="w-full accent-[#FF7900]"
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-600 w-7 text-right">
                      {selectedLayer.fontSize || 14}px
                    </span>
                  </div>

                  {/* Colors */}
                  <div className="flex flex-wrap gap-1.5">
                    {STUDIO_TEXT_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => onUpdateLayer(selectedLayer.id, { textColor: hex })}
                        className={`w-5 h-5 rounded-full border cursor-pointer ${
                          selectedLayer.textColor === hex
                            ? 'ring-2 ring-[#FF7900] ring-offset-1 border-slate-900'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Graphic Shapes */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Add Badges & Shapes
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {STUDIO_SHAPES.map((shp) => (
                    <button
                      key={shp.id}
                      type="button"
                      onClick={() => onAddShapeLayer(shp.id)}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 hover:border-[#FF7900] hover:bg-orange-50/40 text-[10px] font-bold text-[#071B35] cursor-pointer"
                    >
                      + {shp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. QUICK DESIGN POSITIONS */}
        <div>
          {renderAccordionHeader(
            'quick',
            <Grid className="w-3.5 h-3.5" />,
            'Quick Design Positions',
            activeSide === 'front'
              ? frontPlacement
              : noBackPrint
              ? 'No Back Print'
              : backPlacement
          )}
          {openSection === 'quick' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3 bg-white">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  {meta.hasBackSide ? 'Front Print Zones' : 'Active Surface Zones'}
                </div>
                <div className="space-y-1.5">
                  {meta.quickFrontPositions.map((pos) => {
                    const active = frontPlacement === pos.id && activeSide === 'front';
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => onSelectPlacement('front', pos.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'border-[#FF7900] bg-orange-50/70'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-[#071B35]">{pos.label}</div>
                          <div className="text-[10px] text-slate-500">{pos.hint}</div>
                        </div>
                        {active && <Check className="w-4 h-4 text-[#FF7900] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {meta.hasBackSide && meta.backPositions.length > 0 && (
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Back Print Zones
                  </div>
                  <div className="space-y-1.5">
                    {meta.backPositions.map((pos) => {
                      const active =
                        pos.id === 'No back print'
                          ? noBackPrint
                          : !noBackPrint && backPlacement === pos.id && activeSide === 'back';
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => onSelectPlacement('back', pos.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            active
                              ? 'border-[#FF7900] bg-orange-50/70'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-[#071B35]">{pos.label}</div>
                            <div className="text-[10px] text-slate-500">{pos.hint}</div>
                          </div>
                          {active && <Check className="w-4 h-4 text-[#FF7900] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200">
                {meta.placementHint}
              </p>
            </div>
          )}
        </div>

        {/* 5. PRINT OPTIONS */}
        <div>
          {renderAccordionHeader(
            'print',
            <Layers className="w-3.5 h-3.5" />,
            'Print Options',
            `${selectedPrintMethod} · ${activeCleanup.printColorMode === 'full' ? 'Full Colour' : activeCleanup.printColorMode}`
          )}
          {openSection === 'print' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3 bg-white">
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Production Method
                </div>
                {meta.printMethods.map((pm) => {
                  const active = selectedPrintMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => onSelectPrintMethod(pm.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? 'border-[#FF7900] bg-orange-50/70'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[#071B35]">{pm.title}</div>
                        <div className="text-[10px] text-slate-500">{pm.subtitle}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {pm.turnaround}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Ink / Thread Palette Mode
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
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                        activeCleanup.printColorMode === mode.id
                          ? 'bg-[#071B35] text-white border-[#071B35]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. LOGO SETTINGS & MAGIC ERASER */}
        <div>
          {renderAccordionHeader(
            'settings',
            <Sliders className="w-3.5 h-3.5" />,
            'Logo Settings & Cleanup',
            `Size ${logoSizePercent}% · Eraser & Trim`
          )}
          {openSection === 'settings' && (
            <div className="px-3.5 pb-4 pt-2 space-y-3 bg-white">
              {/* Size, Rotate, Opacity */}
              {mainLogoLayer && (
                <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[#071B35] mb-1">
                      <span>Logo Scale</span>
                      <span className="text-[#FF7900]">{logoSizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={200}
                      value={logoSizePercent}
                      onChange={(e) => onLogoSizeSlider(Number(e.target.value))}
                      className="w-full accent-[#FF7900]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[#071B35] mb-1">
                      <span>Rotation</span>
                      <span>{mainLogoLayer.rotation || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={mainLogoLayer.rotation || 0}
                      onChange={(e) =>
                        onUpdateLayer(mainLogoLayer.id, { rotation: Number(e.target.value) })
                      }
                      className="w-full accent-[#FF7900]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[#071B35] mb-1">
                      <span>Opacity</span>
                      <span>{Math.round((mainLogoLayer.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round((mainLogoLayer.opacity ?? 1) * 100)}
                      onChange={(e) =>
                        onUpdateLayer(mainLogoLayer.id, { opacity: Number(e.target.value) / 100 })
                      }
                      className="w-full accent-[#FF7900]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={onCenterMainLogo}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <AlignCenter className="w-3.5 h-3.5 text-[#FF7900]" />
                      <span>Center Zone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayer(mainLogoLayer.id, { flipX: !mainLogoLayer.flipX })
                      }
                      className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5 text-[#FF7900]" />
                      <span>Flip H</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Company Name Below Logo */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#071B35]">Add Company Name Below Logo</span>
                  <button
                    type="button"
                    onClick={onToggleCompanyName}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      hasCompanyNameLayer
                        ? 'bg-[#FF7900] text-white'
                        : 'bg-[#071B35] text-white'
                    }`}
                  >
                    {hasCompanyNameLayer ? 'Added ✓' : '+ Add'}
                  </button>
                </div>
                <input
                  type="text"
                  value={companyNameText}
                  onChange={(e) => onChangeCompanyNameText(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#071B35]"
                  placeholder="COMPANY NAME"
                />
                {hasCompanyNameLayer && (
                  <div className="grid grid-cols-2 gap-1">
                    {logoLayoutOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateCleanup({ layoutMode: opt.id as LogoLayoutMode })}
                        className={`py-1 px-1.5 rounded border text-[10px] font-bold cursor-pointer ${
                          activeCleanup.layoutMode === opt.id
                            ? 'bg-[#071B35] text-white border-[#071B35]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Background Removal Strength & Trim */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-[#071B35]">
                    <span>BG Removal Strength</span>
                    <span>{activeCleanup.bgStrength}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeCleanup.bgStrength}
                    onChange={(e) => onUpdateCleanup({ bgStrength: Number(e.target.value) })}
                    className="w-full accent-[#FF7900]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeCleanup.trimEdges}
                      onChange={(e) => onUpdateCleanup({ trimEdges: e.target.checked })}
                      className="accent-[#FF7900]"
                    />
                    <span>Trim empty margins</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    Pad: {activeCleanup.trimPadding}px
                  </span>
                </div>
              </div>

              {/* Magic Eraser Modal Launch */}
              <button
                type="button"
                onClick={onOpenMagicEraser}
                disabled={!frontRawLogo && !backRawLogo}
                className="w-full py-2.5 px-3 rounded-xl bg-[#071B35] hover:bg-[#0e2d54] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Eraser className="w-4 h-4 text-[#FF7900]" />
                <span>Open Magic Eraser Studio</span>
                <Wand2 className="w-3.5 h-3.5 text-orange-300" />
              </button>

              {/* Detected Parts Toggles */}
              {activeParts.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Detected Logo Parts ({activeParts.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeParts.map((p) => {
                      const hidden = activeCleanup.hiddenPartIndices.includes(p.index);
                      return (
                        <button
                          key={p.index}
                          type="button"
                          onClick={() => onTogglePartVisibility(p.index)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                            hidden
                              ? 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                              : 'border-orange-200 bg-orange-50 text-[#071B35]'
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#FF7900]" />
                          <span>Part {p.index + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
