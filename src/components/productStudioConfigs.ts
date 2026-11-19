import { PrintMethod, Product, ProductColor, StudioLayer } from '../types';
import { calculateProductPrice, PRODUCT_PRICING_RULES, resolvePricingRuleKey } from '../data/pricingRules';
import {
  DesignValidationIssue,
  LogoFileMeta,
  PlainPoloHistoryVersion,
  STUDIO_FONT_FAMILIES,
  STUDIO_SHAPES,
  STUDIO_TEXT_COLORS,
  SAMPLE_CORPORATE_LOGOS,
  createStudioUid,
  formatBytesCompact,
  copyToClipboardSafe,
  getLogoLayoutOptions,
  renderPdfBadgeDataUrl,
  renderStudioSvgToPngDataUrl,
} from './plain-polo-studio/plainPoloStudioTypes';
import { DEFAULT_LOGO_CLEANUP, LogoCleanupOptions } from '../utils/logoProcessor';

export {
  STUDIO_FONT_FAMILIES,
  STUDIO_SHAPES,
  STUDIO_TEXT_COLORS,
  SAMPLE_CORPORATE_LOGOS,
  createStudioUid,
  formatBytesCompact,
  copyToClipboardSafe,
  getLogoLayoutOptions,
  renderPdfBadgeDataUrl,
  renderStudioSvgToPngDataUrl,
};
export type { DesignValidationIssue, LogoFileMeta };

export interface StudioPlacementOption {
  id: string;
  label: string;
  shortLabel: string;
  hint: string;
}

export interface StudioZoneSpec {
  cx: number;
  cy: number;
  boxSize: number;
  maxW: number;
  maxH: number;
  label: string;
}

export interface StudioPrintMethodCard {
  id: PrintMethod;
  title: string;
  subtitle: string;
  turnaround: string;
}

export interface ProductStudioMeta {
  studioTitle: string;
  specBadge: string;
  materialSummary: string;
  hasBackSide: boolean;
  supportsNoBackPrint: boolean;
  singleSideBadge: string;
  colorLabel: string;
  unitLabel: string;
  moq: number;
  quickQuantities: number[];
  showSizes: boolean;
  sizeLabel: string;
  hasCanopyVariants: boolean;
  quickFrontPositions: StudioPlacementOption[];
  barFrontPositions: StudioPlacementOption[];
  backPositions: StudioPlacementOption[];
  backQuickBigId: string;
  defaultFrontPlacement: string;
  defaultBackPlacement: string;
  placementHint: string;
  printMethods: StudioPrintMethodCard[];
  safeBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface SavedProductDesign {
  id: string;
  productId: string;
  name: string;
  updatedAt: string;
  colorName: string;
  colorHex: string;
  variantLabel?: string;
  quantity: number;
  printMethod: PrintMethod;
  frontPlacement: string;
  backPlacement: string;
  noBackPrint: boolean;
  artworkApproved: boolean;
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  frontCleanup: LogoCleanupOptions;
  backCleanup: LogoCleanupOptions;
  backUsesSameLogo: boolean;
  uploadedFrontLogoName?: string;
  uploadedBackLogoName?: string;
  thumbnailDataUrl?: string;
}

export interface ProductHistorySnapshot {
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  frontPlacement: string;
  backPlacement: string;
  selectedColorName: string;
  printMethod: PrintMethod;
  noBackPrint: boolean;
  variantLabel?: string;
}

export interface ProductHistoryVersion {
  id: string;
  label: string;
  timestamp: string;
  snapshot: ProductHistorySnapshot;
}

export interface ProductModalCommitPayload {
  frontArtwork: import('../types').CustomArtwork | null;
  backArtwork: import('../types').CustomArtwork | null;
  frontPlacement: string;
  backPlacement: string;
  uploadedFrontLogoName: string;
  uploadedBackLogoName: string;
  artworkStatus?: 'uploaded' | 'awaiting_review' | 'approved' | 'no_artwork';
  selectedColor?: ProductColor;
  selectedPrintMethod?: PrintMethod;
  quantity?: number;
  sizeDistribution?: Record<string, number>;
  selectedVariantLabel?: string;
}

export const CANOPY_VARIANT_OPTIONS = [
  { label: '4 × 4 ft', price: PRODUCT_PRICING_RULES['canopy-4x4']?.slabs[0]?.pricePerUnit || 4900 },
  { label: '8 × 8 ft', price: PRODUCT_PRICING_RULES['canopy-8x8']?.slabs[0]?.pricePerUnit || 6100 },
] as const;

const PRINT_METHOD_DESCRIPTIONS: Record<PrintMethod, Omit<StudioPrintMethodCard, 'id'>> = {
  'DTF Printing': {
    title: 'DTF Printing',
    subtitle: 'Full-colour photo-crisp multi-tone transfer',
    turnaround: '24–48 hrs',
  },
  'Precision Embroidery': {
    title: 'Precision Embroidery',
    subtitle: 'High-density raised corporate thread stitch',
    turnaround: '48–72 hrs',
  },
  'Screen Printing': {
    title: 'Screen Printing',
    subtitle: 'Vibrant durable flat-ink commercial branding',
    turnaround: '48 hrs',
  },
  'High-Precision UV': {
    title: 'High-Precision UV',
    subtitle: 'Scratch-resistant glossy cured UV digital print',
    turnaround: '24–48 hrs',
  },
  'Laser Engraving': {
    title: 'Laser Engraving',
    subtitle: 'Precision permanent laser etching for metallic finishes',
    turnaround: '24–48 hrs',
  },
};

export function getProductStudioMeta(
  product: Product,
  selectedVariantLabel?: string
): ProductStudioMeta {
  const ruleKey = resolvePricingRuleKey(product.id, selectedVariantLabel);
  const pricingRule = PRODUCT_PRICING_RULES[ruleKey];
  const moq = product.moq || pricingRule?.moq || 1;
  const printMethods: StudioPrintMethodCard[] = (product.printMethods || ['DTF Printing']).map((pm) => ({
    id: pm,
    ...(PRINT_METHOD_DESCRIPTIONS[pm] || {
      title: pm,
      subtitle: 'Custom corporate branding production',
      turnaround: '48 hrs',
    }),
  }));

  if (product.productType === 'cap') {
    return {
      studioTitle: 'Cotton Cap Studio',
      specBadge: '100% Cotton Twill · Free Size',
      materialSummary: 'Breathable 6-panel cotton twill cap · Pre-curved peak · Adjustable metal buckle strap.',
      hasBackSide: true,
      supportsNoBackPrint: true,
      singleSideBadge: 'Front Crown',
      colorLabel: 'Cap Colourway',
      unitLabel: 'pc',
      moq,
      quickQuantities: [1, 10, 25, 50, 100, 150],
      showSizes: false,
      sizeLabel: 'Universal Adjustable Free Size',
      hasCanopyVariants: false,
      quickFrontPositions: [
        { id: 'Front Crown', label: 'Front Crown', shortLabel: 'Front Crown', hint: 'Main padded forehead crown (4" × 2.2")' },
        { id: 'Left Crown', label: 'Left Crown', shortLabel: 'Left Side', hint: 'Left temple embroidery or crest badge' },
        { id: 'Right Crown', label: 'Right Crown', shortLabel: 'Right Side', hint: 'Right temple brand mark or tagline' },
      ],
      barFrontPositions: [
        { id: 'Front Crown', label: 'Front Crown', shortLabel: 'Front Crown', hint: 'Main padded forehead crown' },
        { id: 'Left Crown', label: 'Left Crown', shortLabel: 'Left Side', hint: 'Left temple panel' },
        { id: 'Right Crown', label: 'Right Crown', shortLabel: 'Right Side', hint: 'Right temple panel' },
      ],
      backPositions: [
        { id: 'Back Arch', label: 'Back Arch', shortLabel: 'Back Arch', hint: 'Curved logo or website text above strap' },
        { id: 'No back print', label: 'No back print', shortLabel: 'No Back Print', hint: 'Front crown branding only' },
      ],
      backQuickBigId: 'Back Arch',
      defaultFrontPlacement: 'Front Crown',
      defaultBackPlacement: 'Back Arch',
      placementHint: 'Front Crown suits logos & badges. Switch to Back View for arched company name above the adjustable strap.',
      printMethods,
      safeBounds: { minX: 155, maxX: 345, minY: 130, maxY: 280 },
    };
  }

  if (product.productType === 'mug') {
    return {
      studioTitle: 'Ceramic Mug Studio',
      specBadge: 'White Glossy · 325 ml (11 oz)',
      materialSummary: 'AAA-grade glossy white ceramic mug · 8.5" × 3" printable wrap area · Microwave & dishwasher safe.',
      hasBackSide: true,
      supportsNoBackPrint: true,
      singleSideBadge: 'Front Ceramic',
      colorLabel: 'Ceramic Finish',
      unitLabel: 'pc',
      moq: Math.max(5, moq),
      quickQuantities: [5, 10, 25, 50, 100],
      showSizes: false,
      sizeLabel: '325 ml (11 oz) Standard Cylindrical',
      hasCanopyVariants: false,
      quickFrontPositions: [
        { id: 'Front Center', label: 'Front Center', shortLabel: 'Front Center', hint: 'Right-hand drinker display face (3.2" × 3")' },
        { id: 'Left of Handle', label: 'Left of Handle', shortLabel: 'Near Handle', hint: 'Shifted cleanly closer to mug handle' },
        { id: 'Full Wrap Band', label: 'Full Wrap', shortLabel: 'Full Wrap', hint: 'Continuous wide wrap graphic across cylinder' },
      ],
      barFrontPositions: [
        { id: 'Front Center', label: 'Front Center', shortLabel: 'Front Center', hint: 'Right-hand display face' },
        { id: 'Left of Handle', label: 'Left of Handle', shortLabel: 'Near Handle', hint: 'Closer to handle' },
        { id: 'Full Wrap Band', label: 'Full Wrap', shortLabel: 'Full Wrap', hint: 'Wide 8.5" × 3" ceramic wrap' },
      ],
      backPositions: [
        { id: 'Back Center', label: 'Back Center', shortLabel: 'Back Center', hint: 'Opposite face branding for dual-hand view' },
        { id: 'Small logo', label: 'Small Logo', shortLabel: 'Small Crest', hint: 'Compact subtle rear logo or tagline' },
        { id: 'No back print', label: 'No back print', shortLabel: 'Single Side', hint: 'Front face print only' },
      ],
      backQuickBigId: 'Back Center',
      defaultFrontPlacement: 'Front Center',
      defaultBackPlacement: 'Back Center',
      placementHint: 'Total wrap print zone is 8.5" × 3". Toggle Front & Back views to customize both sides of the white ceramic cylinder.',
      printMethods,
      safeBounds: { minX: 110, maxX: 390, minY: 145, maxY: 335 },
    };
  }

  if (product.productType === 'umbrella') {
    return {
      studioTitle: '5ft Umbrella Studio',
      specBadge: '5 ft Canopy × 7 ft Tripod',
      materialSummary: 'Waterproof UV-coated 5 ft dual-tone canopy + heavy iron tripod base stand for outdoor promotions.',
      hasBackSide: true,
      supportsNoBackPrint: true,
      singleSideBadge: 'Front Canopy',
      colorLabel: 'Canopy Two-Tone Colour',
      unitLabel: 'unit',
      moq,
      quickQuantities: [1, 3, 6, 11, 15, 20],
      showSizes: false,
      sizeLabel: '5 ft Canopy Diameter · 7 ft Adjustable Pole',
      hasCanopyVariants: false,
      quickFrontPositions: [
        { id: 'Center Panel', label: 'Center Panel', shortLabel: 'Center White', hint: 'High-contrast white center gore panel' },
        { id: 'Left Panel', label: 'Left Panel', shortLabel: 'Left Panel', hint: 'Left coloured gore canopy wedge' },
        { id: 'Right Panel', label: 'Right Panel', shortLabel: 'Right Panel', hint: 'Right coloured gore canopy wedge' },
        { id: 'Lower Valance', label: 'Lower Valance', shortLabel: 'Valance Frill', hint: 'Eye-level drop valance banner strip' },
      ],
      barFrontPositions: [
        { id: 'Center Panel', label: 'Center Panel', shortLabel: 'Center White', hint: 'Center white panel' },
        { id: 'Left Panel', label: 'Left Panel', shortLabel: 'Left Panel', hint: 'Left colour panel' },
        { id: 'Right Panel', label: 'Right Panel', shortLabel: 'Right Panel', hint: 'Right colour panel' },
        { id: 'Lower Valance', label: 'Lower Valance', shortLabel: 'Valance Frill', hint: 'Drop valance strip' },
      ],
      backPositions: [
        { id: 'Back Center Panel', label: 'Back Panel', shortLabel: 'Back Panel', hint: 'Opposite canopy wedge branding' },
        { id: 'Back Valance', label: 'Back Valance', shortLabel: 'Back Valance', hint: 'Rear eye-level valance strip' },
        { id: 'No back print', label: 'No back print', shortLabel: 'No Back Print', hint: 'Front panels only' },
      ],
      backQuickBigId: 'Back Center Panel',
      defaultFrontPlacement: 'Center Panel',
      defaultBackPlacement: 'Back Center Panel',
      placementHint: 'Alternate white & brand-colour canopy gores plus lower valance skirt support crisp logo and phone-number printing.',
      printMethods,
      safeBounds: { minX: 78, maxX: 422, minY: 88, maxY: 245 },
    };
  }

  if (product.productType === 'canopy') {
    const activeSize = selectedVariantLabel || '4 × 4 ft';
    return {
      studioTitle: 'Canopy Kiosk Studio',
      specBadge: `Navy Blue · ${activeSize} · 7 ft H`,
      materialSummary: 'Heavy-duty Navy Oxford roof & skirt, powder-coated folding frame, instant popup outdoor promo booth.',
      hasBackSide: false,
      supportsNoBackPrint: false,
      singleSideBadge: `Kiosk Facade (${activeSize})`,
      colorLabel: 'Canopy Base & Size',
      unitLabel: 'unit',
      moq,
      quickQuantities: [1, 2, 3, 5, 6, 10],
      showSizes: false,
      sizeLabel: `${activeSize} Footprint · 7 ft (84 in) Height`,
      hasCanopyVariants: true,
      quickFrontPositions: [
        { id: 'Top Valance Header', label: 'Top Valance', shortLabel: 'Top Valance', hint: 'Wide upper fascia banner (best visibility)' },
        { id: 'Lower Front Wall', label: 'Front Wall', shortLabel: 'Counter Skirt', hint: 'Lower wrap skirt wall across front frame' },
        { id: 'Full Kiosk Branding', label: 'Full Kiosk', shortLabel: 'Full Kiosk', hint: 'Maximum impact full-front skirt artwork' },
      ],
      barFrontPositions: [
        { id: 'Top Valance Header', label: 'Top Valance', shortLabel: 'Top Valance', hint: 'Upper fascia banner' },
        { id: 'Lower Front Wall', label: 'Front Wall', shortLabel: 'Counter Skirt', hint: 'Lower skirt wall' },
        { id: 'Full Kiosk Branding', label: 'Full Kiosk', shortLabel: 'Full Kiosk', hint: 'Full-front wrap' },
      ],
      backPositions: [],
      backQuickBigId: 'Top Valance Header',
      defaultFrontPlacement: 'Top Valance Header',
      defaultBackPlacement: 'Top Valance Header',
      placementHint: 'Brand the top valance fascia header and lower front counter skirt wall. Switch 4×4 ft vs 8×8 ft footprint on the right.',
      printMethods,
      safeBounds: { minX: 118, maxX: 382, minY: 108, maxY: 404 },
    };
  }

  if (product.productType === 'standee') {
    return {
      studioTitle: 'Rollup Standee Studio',
      specBadge: '3 ft × 6 ft · Matte Black Base',
      materialSummary: '72" × 36" retractable exhibition banner in heavyweight aluminum cassette with padded travel carry bag.',
      hasBackSide: false,
      supportsNoBackPrint: false,
      singleSideBadge: 'Front Banner (3 × 6 ft)',
      colorLabel: 'Cassette Hardware',
      unitLabel: 'unit',
      moq,
      quickQuantities: [1, 2, 3, 6, 11, 20],
      showSizes: false,
      sizeLabel: '3 ft × 6 ft (36 × 72 in) Vertical Display',
      hasCanopyVariants: false,
      quickFrontPositions: [
        { id: 'Top Header', label: 'Top Header', shortLabel: 'Top Header', hint: 'Eye-level logo & headline zone (top 18")' },
        { id: 'Center Main', label: 'Center Main', shortLabel: 'Center Stage', hint: 'Primary visual hero area (mid-banner)' },
        { id: 'Lower Strip', label: 'Lower Strip', shortLabel: 'Lower Contact', hint: 'Website, QR code & contact footer band' },
      ],
      barFrontPositions: [
        { id: 'Top Header', label: 'Top Header', shortLabel: 'Top Header', hint: 'Top eye-level header' },
        { id: 'Center Main', label: 'Center Main', shortLabel: 'Center Stage', hint: 'Main hero banner' },
        { id: 'Lower Strip', label: 'Lower Strip', shortLabel: 'Lower Contact', hint: 'Contact / QR strip' },
      ],
      backPositions: [],
      backQuickBigId: 'Top Header',
      defaultFrontPlacement: 'Top Header',
      defaultBackPlacement: 'Top Header',
      placementHint: 'Full vertical 3 × 6 ft stage. Combine top company crest, center product headline, and lower contact/QR layers.',
      printMethods,
      safeBounds: { minX: 152, maxX: 348, minY: 58, maxY: 408 },
    };
  }

  if (product.productType === 'display' || product.productType === 'table') {
    return {
      studioTitle: 'Promo Table Studio',
      specBadge: 'White Counter · 63.2" H',
      materialSummary: 'Portable knockdown demo counter with 31"×10.3" overhead header board, 31.6"×30.3" front apron & inner shelf.',
      hasBackSide: false,
      supportsNoBackPrint: false,
      singleSideBadge: 'Header + Front Counter',
      colorLabel: 'Counter Finish',
      unitLabel: 'unit',
      moq,
      quickQuantities: [1, 2, 3, 5, 6, 10],
      showSizes: false,
      sizeLabel: 'Header 31"×10.3" · Counter 31.6"×30.3"',
      hasCanopyVariants: false,
      quickFrontPositions: [
        { id: 'Top Header', label: 'Top Header', shortLabel: 'Top Header', hint: 'Overhead 31" × 10.3" header crown banner' },
        { id: 'Front Counter', label: 'Front Counter', shortLabel: 'Front Apron', hint: 'Wide 31.6" × 30.3" molded front panel' },
        { id: 'Full Display', label: 'Full Display', shortLabel: 'Full Wrap', hint: 'Full-width counter wrap branding zone' },
      ],
      barFrontPositions: [
        { id: 'Top Header', label: 'Top Header', shortLabel: 'Top Header', hint: 'Overhead header board' },
        { id: 'Front Counter', label: 'Front Counter', shortLabel: 'Front Apron', hint: 'Main front skirt' },
        { id: 'Full Display', label: 'Full Display', shortLabel: 'Full Wrap', hint: 'Full display branding' },
      ],
      backPositions: [],
      backQuickBigId: 'Top Header',
      defaultFrontPlacement: 'Top Header',
      defaultBackPlacement: 'Top Header',
      placementHint: 'Customize the elevated Top Header crown and the main Front Counter apron together.',
      printMethods,
      safeBounds: { minX: 122, maxX: 378, minY: 54, maxY: 438 },
    };
  }

  // Apparel Polos: Tipping Polo, Mars COOLMAX, Matty Polo
  const isMars = product.id === 'prod-joab-coolmax' || product.slug?.includes('joab-coolmax');
  const isMatty = product.id === 'prod-matty-polo' || product.slug?.includes('matty-polo');

  return {
    studioTitle: isMars
      ? 'Mars COOLMAX Polo Studio'
      : isMatty
      ? 'Matty Polo Studio'
      : 'Tipping Polo Studio',
    specBadge: isMars
      ? '220 GSM MARS Quick-Dry'
      : isMatty
      ? '230 GSM Fine Matty'
      : '230 GSM Cotton · Tipping Collar',
    materialSummary: isMars
      ? '220 GSM breathable MARS COOLMAX moisture-wicking fabric · Corporate activewear fit · Crisp collar placket.'
      : isMatty
      ? '230 GSM textured honeycomb Matty knit · Breathable, anti-pill corporate uniform favourite.'
      : '100% Pure Combed Cotton 230 GSM pique with contrast contrast-tipping ribbed collar and sleeves.',
    hasBackSide: true,
    supportsNoBackPrint: true,
    singleSideBadge: 'Front',
    colorLabel: isMars ? 'COOLMAX Colourway' : isMatty ? 'Matty Colourway' : 'Tipping Polo Colour',
    unitLabel: 'pc',
    moq: Math.max(2, moq),
    quickQuantities: [2, 5, 10, 25, 50, 100],
    showSizes: Boolean(product.sizes && product.sizes.length > 0),
    sizeLabel: product.sizes?.includes('3XL (44)') && !product.sizes?.includes('4XL (46)')
      ? 'Size Mix Breakdown (S – 3XL)'
      : 'Size Mix Breakdown (S – 4XL)',
    hasCanopyVariants: false,
    quickFrontPositions: [
      { id: 'Left Chest', label: 'Left chest', shortLabel: 'Left Chest', hint: 'Standard corporate pocket crest (3.5" × 3.5")' },
      { id: 'Right Chest', label: 'Right chest', shortLabel: 'Right Chest', hint: 'Opposite chest badge or event crest' },
      { id: 'Center Chest', label: 'Centre chest', shortLabel: 'Centre Chest', hint: 'Centered mid-chest branding below placket' },
      { id: 'Full Front', label: 'Full front', shortLabel: 'Full Front', hint: 'Large front promotional print area (10" × 12")' },
    ],
    barFrontPositions: [
      { id: 'Left Chest', label: 'Left chest', shortLabel: 'Left Chest', hint: 'Standard corporate pocket crest' },
      { id: 'Right Chest', label: 'Right chest', shortLabel: 'Right Chest', hint: 'Opposite chest placement' },
      { id: 'Center Chest', label: 'Centre chest', shortLabel: 'Centre Chest', hint: 'Centered mid-chest print' },
      { id: 'Full Front', label: 'Full front', shortLabel: 'Full Front', hint: 'Large front print' },
    ],
    backPositions: [
      { id: 'Upper Back Center', label: 'Upper back', shortLabel: 'Upper Back', hint: 'Classic nape / shoulder yoke emblem' },
      { id: 'Centre Back', label: 'Centre back', shortLabel: 'Centre Back', hint: 'Balanced mid-back logo & tagline' },
      { id: 'Full Back Center', label: 'Full back', shortLabel: 'Full Back', hint: 'Maximum impact event & team print' },
      { id: 'No back print', label: 'No back print', shortLabel: 'No Back Print', hint: 'Front branding only — clean solid back' },
    ],
    backQuickBigId: 'Upper Back Center',
    defaultFrontPlacement: 'Left Chest',
    defaultBackPlacement: 'Upper Back Center',
    placementHint: "Left / Right = wearer's left / right chest. Toggle Front & Back views above the preview canvas.",
    printMethods,
    safeBounds: { minX: 145, maxX: 355, minY: 95, maxY: 430 },
  };
}

export function getProductPricingLive(
  productId: string,
  quantity: number,
  selectedVariantLabel?: string
) {
  return calculateProductPrice(productId, quantity, selectedVariantLabel);
}

export function getSavedDesignsStorageKey(productId: string): string {
  return `teqqno_studio_saved_designs_${productId}_v1`;
}

export function loadSavedProductDesigns(productId: string): SavedProductDesign[] {
  try {
    const raw = localStorage.getItem(getSavedDesignsStorageKey(productId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedProductDesigns(productId: string, designs: SavedProductDesign[]): void {
  try {
    localStorage.setItem(getSavedDesignsStorageKey(productId), JSON.stringify(designs.slice(0, 20)));
  } catch (err) {
    console.warn('[ProductStudio] Could not save designs to localStorage:', err);
  }
}

export function computeProductDesignValidation(params: {
  meta: ProductStudioMeta;
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  noBackPrint: boolean;
  frontFileMeta: LogoFileMeta | null;
  backFileMeta: LogoFileMeta | null;
  printMethod: PrintMethod;
  artworkApproved: boolean;
}): DesignValidationIssue[] {
  const issues: DesignValidationIssue[] = [];
  const visibleFront = params.frontLayers.filter((l) => l.visible !== false);
  const visibleBack =
    !params.meta.hasBackSide || params.noBackPrint
      ? []
      : params.backLayers.filter((l) => l.visible !== false);

  if (visibleFront.length === 0 && visibleBack.length === 0) {
    issues.push({
      id: 'empty-art',
      severity: 'warning',
      title: 'No active print elements',
      detail: 'Upload a company logo or add text before confirming production approval.',
    });
  } else {
    issues.push({
      id: 'active-count',
      severity: 'ok',
      title: params.meta.hasBackSide
        ? `${visibleFront.length} front · ${params.noBackPrint ? 'Single-side only' : `${visibleBack.length} back`} active`
        : `${visibleFront.length} artwork layer${visibleFront.length === 1 ? '' : 's'} ready`,
      detail: `Configured for ${params.printMethod} (${params.meta.specBadge}).`,
    });
  }

  const checkMeta = (fileMeta: LogoFileMeta | null, label: string) => {
    if (!fileMeta) return;
    if (fileMeta.isPdf) {
      issues.push({
        id: `${label}-pdf`,
        severity: 'ok',
        title: `${label} PDF queued (${fileMeta.fileName})`,
        detail: 'Vector PDF artwork will be pre-flighted at full resolution before print.',
      });
    } else if (fileMeta.isVector) {
      issues.push({
        id: `${label}-svg`,
        severity: 'ok',
        title: `${label} SVG vector verified`,
        detail: 'Infinite resolution for razor-sharp print & embroidery plates.',
      });
    } else if (fileMeta.naturalWidth > 0 && (fileMeta.naturalWidth < 400 || fileMeta.naturalHeight < 400)) {
      issues.push({
        id: `${label}-lowres`,
        severity: 'warning',
        title: `${label} resolution is low (${fileMeta.naturalWidth}×${fileMeta.naturalHeight}px)`,
        detail: 'Recommended 800×800px+ PNG or vector SVG for crisp edges.',
      });
    } else if (fileMeta.naturalWidth >= 400) {
      issues.push({
        id: `${label}-hd`,
        severity: 'ok',
        title: `${label} resolution crisp (${fileMeta.naturalWidth}×${fileMeta.naturalHeight}px)`,
        detail: 'Meets commercial print sharpness standards.',
      });
    }
  };

  checkMeta(params.frontFileMeta, 'Front artwork');
  if (params.meta.hasBackSide && !params.noBackPrint && params.backFileMeta && params.backFileMeta.fileName !== params.frontFileMeta?.fileName) {
    checkMeta(params.backFileMeta, 'Back artwork');
  }

  const { minX, maxX, minY, maxY } = params.meta.safeBounds;
  const outOfBounds = [...visibleFront, ...visibleBack].filter(
    (l) => l.x - l.width / 2 < minX || l.x + l.width / 2 > maxX || l.y - l.height / 2 < minY || l.y + l.height / 2 > maxY
  );
  if (outOfBounds.length > 0) {
    issues.push({
      id: 'bounds-check',
      severity: 'warning',
      title: `${outOfBounds.length} element(s) near trim/seam edge`,
      detail: 'Nudge elements slightly inside the dashed print boundary guide for clean production.',
    });
  }

  if (params.artworkApproved) {
    issues.push({
      id: 'approved',
      severity: 'ok',
      title: 'Customer pre-production sign-off verified',
      detail: 'Artwork confirmed final for immediate factory dispatch.',
    });
  }

  return issues;
}

export function buildProductShareLink(params: {
  slug: string;
  colorName: string;
  printMethod: PrintMethod;
  quantity: number;
  frontPlacement: string;
}): string {
  if (typeof window === 'undefined') return `https://teqqnoworld.com/#/product/${params.slug}`;
  const search = new URLSearchParams({
    color: params.colorName,
    method: params.printMethod,
    qty: String(params.quantity),
    front: params.frontPlacement,
  });
  return `${window.location.origin}/#/product/${params.slug}?${search.toString()}`;
}

export function getSurfaceHex(
  productType: Product['productType'],
  baseHex: string,
  placement: string
): string {
  if (
    productType === 'mug' ||
    productType === 'display' ||
    productType === 'table' ||
    productType === 'visiting-card'
  ) {
    return '#FFFFFF';
  }
  if (productType === 'standee') return '#111215';
  if (productType === 'canopy') return '#162B4D';
  if (productType === 'umbrella') {
    const pLower = (placement || '').toLowerCase();
    if (pLower.includes('left') || pLower.includes('right') || pLower.includes('valance')) {
      return baseHex;
    }
    return '#FFFFFF';
  }
  return baseHex;
}

export function isSurfaceLight(hex: string): boolean {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function getZoneCoordinates(
  productType: Product['productType'],
  side: 'front' | 'back',
  placement: string,
  poloYCalib: number = 0
): StudioZoneSpec {
  if (side === 'back') {
    if (productType === 'polo' || productType === 'tshirt') {
      if (placement === 'Full Back Center' || placement === 'Full back') {
        return { cx: 250, cy: 205 + poloYCalib, boxSize: 120, maxW: 155, maxH: 185, label: 'FULL BACK PRINT' };
      }
      if (placement === 'Small logo') {
        return { cx: 250, cy: 154 + poloYCalib, boxSize: 64, maxW: 90, maxH: 70, label: 'UPPER BACK CREST' };
      }
      if (placement === 'Centre Back') {
        return { cx: 250, cy: 196 + poloYCalib, boxSize: 105, maxW: 145, maxH: 135, label: 'CENTRE BACK PRINT' };
      }
      return { cx: 250, cy: 164 + poloYCalib, boxSize: 98, maxW: 140, maxH: 110, label: 'UPPER BACK PRINT' };
    }
    if (productType === 'cap') {
      return { cx: 250, cy: 188, boxSize: 48, maxW: 88, maxH: 42, label: 'BACK ARCH PRINT' };
    }
    if (productType === 'mug') {
      if (placement.includes('Small')) {
        return { cx: 211, cy: 236, boxSize: 68, maxW: 110, maxH: 110, label: 'SMALL BACK CREST' };
      }
      return { cx: 211, cy: 240, boxSize: 105, maxW: 170, maxH: 168, label: 'BACK MUG DISPLAY' };
    }
    if (productType === 'umbrella') {
      if (placement.toLowerCase().includes('valance')) {
        return { cx: 250, cy: 219, boxSize: 38, maxW: 132, maxH: 34, label: 'BACK VALANCE FRILL' };
      }
      return { cx: 250, cy: 154, boxSize: 68, maxW: 115, maxH: 74, label: 'BACK CANOPY PANEL' };
    }
    return { cx: 250, cy: 210, boxSize: 105, maxW: 145, maxH: 145, label: 'BACK PRINT ZONE' };
  }

  // Front side
  if (productType === 'polo' || productType === 'tshirt') {
    if (placement === 'Right Chest' || placement === 'Right chest') {
      return { cx: 203, cy: 168 + poloYCalib, boxSize: 40, maxW: 54, maxH: 54, label: 'RIGHT CHEST' };
    }
    if (placement === 'Center Chest' || placement === 'Centre chest') {
      return { cx: 250, cy: 208 + poloYCalib, boxSize: 82, maxW: 118, maxH: 96, label: 'CENTRE CHEST' };
    }
    if (placement === 'Full Front' || placement === 'Full front') {
      return { cx: 250, cy: 268 + poloYCalib, boxSize: 118, maxW: 132, maxH: 160, label: 'FULL FRONT' };
    }
    return { cx: 297, cy: 168 + poloYCalib, boxSize: 40, maxW: 54, maxH: 54, label: 'LEFT CHEST' };
  }
  if (productType === 'cap') {
    if (placement.includes('Left')) return { cx: 208, cy: 218, boxSize: 52, maxW: 82, maxH: 62, label: 'LEFT CROWN' };
    if (placement.includes('Right')) return { cx: 292, cy: 218, boxSize: 52, maxW: 82, maxH: 62, label: 'RIGHT CROWN' };
    return { cx: 250, cy: 216, boxSize: 64, maxW: 130, maxH: 76, label: 'FRONT CROWN (4"×2.2")' };
  }
  if (productType === 'mug') {
    if (placement.includes('Left')) return { cx: 225, cy: 240, boxSize: 84, maxW: 120, maxH: 155, label: 'NEAR HANDLE' };
    if (placement.includes('Wrap')) return { cx: 275, cy: 240, boxSize: 118, maxW: 205, maxH: 170, label: 'FULL WRAP (8.5"×3")' };
    return { cx: 289, cy: 240, boxSize: 105, maxW: 170, maxH: 168, label: 'FRONT CENTER' };
  }
  if (productType === 'umbrella') {
    if (placement.toLowerCase().includes('left')) return { cx: 148, cy: 162, boxSize: 48, maxW: 72, maxH: 56, label: 'LEFT COLOUR PANEL' };
    if (placement.toLowerCase().includes('right')) return { cx: 352, cy: 162, boxSize: 48, maxW: 72, maxH: 56, label: 'RIGHT COLOUR PANEL' };
    if (placement.toLowerCase().includes('valance')) return { cx: 250, cy: 219, boxSize: 38, maxW: 132, maxH: 34, label: 'LOWER VALANCE FRILL' };
    return { cx: 250, cy: 154, boxSize: 68, maxW: 115, maxH: 74, label: 'CENTER WHITE PANEL' };
  }
  if (productType === 'canopy') {
    if (placement.toLowerCase().includes('valance') || placement.toLowerCase().includes('header')) {
      return { cx: 250, cy: 131, boxSize: 40, maxW: 228, maxH: 38, label: 'TOP VALANCE FASCIA' };
    }
    if (placement.toLowerCase().includes('full')) {
      return { cx: 250, cy: 328, boxSize: 112, maxW: 230, maxH: 124, label: 'FULL KIOSK WRAP' };
    }
    return { cx: 250, cy: 334, boxSize: 96, maxW: 216, maxH: 114, label: 'COUNTER SKIRT WALL' };
  }
  if (productType === 'standee') {
    if (placement.toLowerCase().includes('top') || placement.toLowerCase().includes('header')) {
      return { cx: 250, cy: 118, boxSize: 84, maxW: 170, maxH: 92, label: 'TOP HEADER ZONE' };
    }
    if (placement.toLowerCase().includes('lower') || placement.toLowerCase().includes('strip')) {
      return { cx: 250, cy: 352, boxSize: 84, maxW: 170, maxH: 86, label: 'LOWER CONTACT STRIP' };
    }
    return { cx: 250, cy: 228, boxSize: 115, maxW: 174, maxH: 160, label: 'CENTER HERO BANNER' };
  }
  if (productType === 'display' || productType === 'table') {
    if (placement.toLowerCase().includes('counter')) {
      return { cx: 250, cy: 335, boxSize: 126, maxW: 224, maxH: 176, label: 'FRONT COUNTER (31.6"×30.3")' };
    }
    if (placement.toLowerCase().includes('full')) {
      return { cx: 250, cy: 335, boxSize: 148, maxW: 236, maxH: 186, label: 'FULL DISPLAY WRAP' };
    }
    return { cx: 250, cy: 90, boxSize: 58, maxW: 224, maxH: 62, label: 'OVERHEAD HEADER (31"×10.3")' };
  }
  return { cx: 250, cy: 240, boxSize: 90, maxW: 140, maxH: 140, label: 'PRINT ZONE' };
}

export function getRawLogoFromArtwork(
  art: import('../types').CustomArtwork | null,
  rasterizePreset: (id: string, text?: string) => string
): { rawUrl: string; label: string } | null {
  if (!art) return null;
  if (art.rawDataUrl) return { rawUrl: art.rawDataUrl, label: art.text || 'Uploaded Logo' };
  if (art.type === 'image' && art.dataUrl) return { rawUrl: art.dataUrl, label: art.text || 'Uploaded Logo' };
  if (art.type === 'preset') {
    const pid = art.presetId || 'your-logo';
    return { rawUrl: rasterizePreset(pid, art.text), label: pid.toUpperCase() };
  }
  return null;
}

export function buildInitialProductLayers(
  art: import('../types').CustomArtwork | null,
  productType: Product['productType'],
  side: 'front' | 'back',
  placement: string,
  poloYCalib: number,
  surfaceHex: string,
  rasterizePreset: (id: string, text?: string) => string
): StudioLayer[] {
  const zone = getZoneCoordinates(productType, side, placement, poloYCalib);
  if (!art) {
    if (side !== 'front') return [];
    return [
      {
        id: createStudioUid('logo'),
        name: 'Company Logo',
        kind: 'logo',
        x: zone.cx,
        y: zone.cy,
        width: zone.boxSize,
        height: zone.boxSize,
        rotation: 0,
        opacity: 1,
        visible: true,
        dataUrl: rasterizePreset('your-logo'),
        isMainLogo: true,
        flipX: false,
      },
    ];
  }
  if (art.studioLayers && art.studioLayers.length > 0) {
    return art.studioLayers.map((l) => ({ ...l }));
  }
  const scale = Math.max(0.4, Math.min(2.2, art.scale || 1));
  const cx = zone.cx + ((art.x || 0) * zone.maxW) / 100;
  const cy = zone.cy + ((art.y || 0) * zone.maxH) / 100;
  const sidePx = zone.boxSize * scale;

  if (art.type === 'text' && art.text) {
    return [
      {
        id: createStudioUid('text'),
        name: art.text,
        kind: 'text',
        x: cx,
        y: cy,
        width: Math.max(60, art.text.length * 10 * scale),
        height: 24 * scale,
        rotation: art.rotation || 0,
        opacity: 1,
        visible: true,
        text: art.text,
        fontSize: Math.round(14 * scale),
        fontFamily: art.fontFamily || 'Space Grotesk',
        fontWeight: '700',
        textColor: art.textColor || (isSurfaceLight(surfaceHex) ? '#111215' : '#FFFFFF'),
        letterSpacing: 1,
        textAlign: 'center',
      },
    ];
  }

  const raw = getRawLogoFromArtwork(art, rasterizePreset);
  return [
    {
      id: createStudioUid('logo'),
      name: side === 'front' ? 'Front Logo' : 'Back Logo',
      kind: 'logo',
      x: cx,
      y: cy,
      width: sidePx,
      height: sidePx,
      rotation: art.rotation || 0,
      opacity: 1,
      visible: true,
      dataUrl: art.dataUrl || raw?.rawUrl || rasterizePreset('your-logo'),
      isMainLogo: true,
      flipX: false,
    },
  ];
}

export { DEFAULT_LOGO_CLEANUP };
export type { PlainPoloHistoryVersion };

