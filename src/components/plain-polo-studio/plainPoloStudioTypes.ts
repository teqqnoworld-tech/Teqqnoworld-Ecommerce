import { CustomArtwork, PrintMethod, ProductColor, StudioLayer, StudioShapeType } from '../../types';
import { LogoCleanupOptions, LogoLayoutMode, LogoPartItem } from '../../utils/logoProcessor';

export interface PlainPoloZoneSpec {
  cx: number;
  cy: number;
  boxSize: number;
  maxW: number;
  maxH: number;
  label: string;
}

export interface PlainPoloSnapshotState {
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  frontPlacement: string;
  backPlacement: string;
  selectedColorName: string;
  printMethod: PrintMethod;
  noBackPrint: boolean;
}

export interface SavedPlainPoloDesign {
  id: string;
  name: string;
  updatedAt: string;
  colorName: string;
  colorHex: string;
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

export interface PlainPoloHistoryVersion {
  id: string;
  label: string;
  timestamp: string;
  snapshot: PlainPoloSnapshotState;
}

export interface LogoFileMeta {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  naturalWidth: number;
  naturalHeight: number;
  isPdf?: boolean;
  isVector?: boolean;
}

export interface DesignValidationIssue {
  id: string;
  severity: 'ok' | 'warning' | 'error';
  title: string;
  detail: string;
}

export const PLAIN_POLO_SAVED_DESIGNS_KEY = 'teqqno_plain_polo_saved_designs_v1';

export const PLAIN_POLO_FRONT_POSITIONS = [
  { id: 'Left Chest', label: 'Left chest', shortLabel: 'Left Chest', hint: 'Standard corporate pocket crest (3.5" × 3.5")' },
  { id: 'Right Chest', label: 'Right chest', shortLabel: 'Right Chest', hint: 'Opposite chest placement for secondary badge' },
  { id: 'Center Chest', label: 'Centre chest', shortLabel: 'Centre Chest', hint: 'Centered mid-chest branding below placket' },
  { id: 'Full Front', label: 'Full front', shortLabel: 'Full Front', hint: 'Large promotional front print area (10" × 12")' },
] as const;

export const PLAIN_POLO_BACK_POSITIONS = [
  { id: 'Upper Back Center', label: 'Upper back', shortLabel: 'Upper Back', hint: 'Classic nape/shoulder yoke emblem' },
  { id: 'Centre Back', label: 'Centre back', shortLabel: 'Centre Back', hint: 'Balanced mid-back logo & tagline display' },
  { id: 'Full Back Center', label: 'Full back', shortLabel: 'Full Back', hint: 'Maximum impact event & team back print' },
  { id: 'No back print', label: 'No back print', shortLabel: 'No Back Print', hint: 'Front branding only — clean solid back' },
] as const;

export const PLAIN_POLO_QUICK_QUANTITIES = [2, 5, 10, 25, 50, 100];

export const PLAIN_POLO_PRINT_METHODS: {
  id: PrintMethod;
  title: string;
  subtitle: string;
  turnaround: string;
  minDetail: string;
}[] = [
  {
    id: 'DTF Printing',
    title: 'DTF Printing',
    subtitle: 'Full-colour photo-crisp multi-tone transfer',
    turnaround: '24–48 hrs',
    minDetail: 'Best for gradients & fine details',
  },
  {
    id: 'Precision Embroidery',
    title: 'Precision Embroidery',
    subtitle: 'High-density raised corporate thread stitch',
    turnaround: '48–72 hrs',
    minDetail: 'Classic executive stitched finish',
  },
  {
    id: 'Screen Printing',
    title: 'Screen Printing',
    subtitle: 'Vibrant bulk flat-ink corporate durability',
    turnaround: '48 hrs',
    minDetail: 'Ideal for 1–3 spot brand colours',
  },
];

export const STUDIO_FONT_FAMILIES = [
  { label: 'Space Grotesk', value: 'Space Grotesk, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Roboto Mono', value: 'monospace' },
  { label: 'Playfair Display', value: 'Georgia, serif' },
];

export const STUDIO_TEXT_COLORS = [
  '#FFFFFF',
  '#071B35',
  '#FF7900',
  '#111827',
  '#FACC15',
  '#22C55E',
  '#38BDF8',
  '#EF4444',
  '#CBD5E1',
];

export const STUDIO_SHAPES: { id: StudioShapeType; label: string }[] = [
  { id: 'rect', label: 'Badge Box' },
  { id: 'pill', label: 'Pill Ribbon' },
  { id: 'circle', label: 'Disc' },
  { id: 'ring', label: 'Crest Ring' },
  { id: 'triangle', label: 'Delta' },
  { id: 'line', label: 'Divider' },
];

export const SAMPLE_CORPORATE_LOGOS = [
  { id: 'your-logo', label: 'Teqqno Crest', accent: '#FF7900' },
  { id: 'hyperscale', label: 'HyperScale', accent: '#3B82F6' },
  { id: 'zepto', label: 'Zepto Logix', accent: '#10B981' },
  { id: 'finedge', label: 'FinEdge', accent: '#F59E0B' },
  { id: 'acme', label: 'Acme Corp', accent: '#EC4899' },
];

export function createStudioUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getPoloVerticalCalibration(colorName?: string): number {
  const name = (colorName || '').toLowerCase();
  if (
    name.includes('navy') ||
    name.includes('maroon') ||
    name.includes('burgundy') ||
    name.includes('royal') ||
    name.includes('apple') ||
    name.includes('lime') ||
    name.includes('turquoise')
  ) {
    return 3;
  }
  return 0;
}

export function getPlainPoloZoneCoordinates(
  side: 'front' | 'back',
  placement: string,
  colorName?: string
): PlainPoloZoneSpec {
  const yCalib = getPoloVerticalCalibration(colorName);

  if (side === 'back') {
    if (placement === 'Centre Back' || placement === 'Centre back') {
      return { cx: 250, cy: 215 + yCalib, boxSize: 112, maxW: 150, maxH: 135, label: 'Centre Back' };
    }
    if (placement === 'Full Back Center' || placement === 'Full back') {
      return { cx: 250, cy: 228 + yCalib, boxSize: 126, maxW: 156, maxH: 185, label: 'Full Back Center' };
    }
    return { cx: 250, cy: 162 + yCalib, boxSize: 96, maxW: 140, maxH: 96, label: 'Upper Back Center' };
  }

  if (placement === 'Right Chest' || placement === 'Right chest') {
    return { cx: 203, cy: 168 + yCalib, boxSize: 40, maxW: 54, maxH: 54, label: 'Right Chest' };
  }
  if (placement === 'Center Chest' || placement === 'Centre chest') {
    return { cx: 250, cy: 208 + yCalib, boxSize: 82, maxW: 118, maxH: 96, label: 'Center Chest' };
  }
  if (placement === 'Full Front' || placement === 'Full front') {
    return { cx: 250, cy: 268 + yCalib, boxSize: 118, maxW: 132, maxH: 160, label: 'Full Front' };
  }
  return { cx: 297, cy: 168 + yCalib, boxSize: 40, maxW: 54, maxH: 54, label: 'Left Chest' };
}

export function getLogoLayoutOptions(): { id: LogoLayoutMode; label: string; desc: string }[] {
  return [
    { id: 'as-uploaded', label: 'As uploaded', desc: 'Preserve original proportion' },
    { id: 'top-to-bottom', label: 'Stacked', desc: 'Emblem above wordmark' },
    { id: 'icon-left', label: 'Icon left', desc: 'Emblem on left side' },
    { id: 'icon-right', label: 'Icon right', desc: 'Emblem on right side' },
  ];
}

export function buildLayersFromExistingArtwork(
  artwork: CustomArtwork | null,
  side: 'front' | 'back',
  placement: string,
  colorName?: string,
  processedFallbackDataUrl?: string | null
): StudioLayer[] {
  if (!artwork) return [];
  if (artwork.studioLayers && artwork.studioLayers.length > 0) {
    return artwork.studioLayers.map((l, idx) => ({
      ...l,
      visible: l.visible !== false,
      name:
        l.name ||
        (l.isMainLogo
          ? 'Primary Logo'
          : l.kind === 'text' || l.kind === 'curved-text'
          ? l.text || `Text ${idx + 1}`
          : l.kind === 'shape'
          ? `Shape ${idx + 1}`
          : `Graphic ${idx + 1}`),
    }));
  }

  const zone = getPlainPoloZoneCoordinates(side, placement, colorName);
  const cx = zone.cx + ((artwork.x || 0) / 100) * 140;
  const cy = zone.cy + ((artwork.y || 0) / 100) * 140;
  const size = Math.max(26, Math.round(zone.boxSize * (artwork.scale || 1)));

  if (artwork.type === 'text' && artwork.text) {
    return [
      {
        id: createStudioUid('text'),
        kind: 'text',
        name: artwork.text.slice(0, 24),
        x: cx,
        y: cy,
        width: Math.max(84, artwork.text.length * 10),
        height: 26,
        rotation: artwork.rotation || 0,
        opacity: 1,
        visible: true,
        text: artwork.text,
        fontSize: 15,
        fontFamily: artwork.fontFamily || 'Space Grotesk, sans-serif',
        fontWeight: '700',
        fontStyle: 'normal',
        textTransform: 'none',
        textAlign: 'center',
        textColor: artwork.textColor || '#FFFFFF',
        letterSpacing: 0.6,
      },
    ];
  }

  const imgSrc = processedFallbackDataUrl || artwork.dataUrl || artwork.rawDataUrl;
  if (imgSrc) {
    return [
      {
        id: createStudioUid('logo'),
        kind: 'logo',
        name: 'Company Logo',
        isMainLogo: true,
        x: cx,
        y: cy,
        width: size,
        height: size,
        rotation: artwork.rotation || 0,
        opacity: 1,
        visible: true,
        dataUrl: imgSrc,
      },
    ];
  }

  return [];
}

export function convertLayersToCustomArtwork(
  layers: StudioLayer[],
  rawDataUrl: string | null,
  processedDataUrl: string | null,
  side: 'front' | 'back',
  placement: string,
  colorName?: string
): CustomArtwork | null {
  const visibleLayers = layers.filter((l) => l.visible !== false);
  if (visibleLayers.length === 0) return null;

  const zone = getPlainPoloZoneCoordinates(side, placement, colorName);
  const mainLogo = layers.find((l) => l.isMainLogo) || visibleLayers.find((l) => l.kind === 'logo' || l.kind === 'image');
  const firstText = visibleLayers.find((l) => l.kind === 'text' || l.kind === 'curved-text');

  const anchor = mainLogo || firstText || visibleLayers[0];
  const relX = Math.max(-50, Math.min(50, ((anchor.x - zone.cx) / 140) * 100));
  const relY = Math.max(-50, Math.min(50, ((anchor.y - zone.cy) / 140) * 100));
  const computedScale = mainLogo
    ? Math.max(0.35, Math.min(2.4, mainLogo.width / Math.max(18, zone.boxSize)))
    : 1;

  return {
    type: mainLogo ? 'image' : firstText ? 'text' : 'image',
    dataUrl: processedDataUrl || mainLogo?.dataUrl || rawDataUrl || undefined,
    rawDataUrl: rawDataUrl || mainLogo?.dataUrl || undefined,
    text: firstText?.text,
    fontFamily: firstText?.fontFamily,
    textColor: firstText?.textColor,
    x: Number(relX.toFixed(1)),
    y: Number(relY.toFixed(1)),
    scale: Number(computedScale.toFixed(2)),
    rotation: Math.round(anchor.rotation || 0),
    studioLayers: layers,
  };
}

export function loadSavedPlainPoloDesigns(): SavedPlainPoloDesign[] {
  try {
    const raw = localStorage.getItem(PLAIN_POLO_SAVED_DESIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedPlainPoloDesigns(designs: SavedPlainPoloDesign[]): void {
  try {
    localStorage.setItem(PLAIN_POLO_SAVED_DESIGNS_KEY, JSON.stringify(designs.slice(0, 24)));
  } catch (err) {
    console.warn('[PlainPoloStudio] Could not write saved designs to localStorage:', err);
  }
}

export function computePlainPoloDesignValidation(params: {
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  noBackPrint: boolean;
  frontMeta: LogoFileMeta | null;
  backMeta: LogoFileMeta | null;
  printMethod: PrintMethod;
  artworkApproved: boolean;
}): DesignValidationIssue[] {
  const issues: DesignValidationIssue[] = [];
  const visibleFront = params.frontLayers.filter((l) => l.visible !== false);
  const visibleBack = params.noBackPrint ? [] : params.backLayers.filter((l) => l.visible !== false);

  if (visibleFront.length === 0 && visibleBack.length === 0) {
    issues.push({
      id: 'empty-artwork',
      severity: 'warning',
      title: 'No active print elements',
      detail: 'Upload a company logo or add text on Front or Back before finalizing artwork approval.',
    });
  } else {
    issues.push({
      id: 'has-elements',
      severity: 'ok',
      title: `${visibleFront.length} front · ${params.noBackPrint ? 'No back print' : `${visibleBack.length} back`} active`,
      detail: `Configured for ${params.printMethod}.`,
    });
  }

  const checkMeta = (meta: LogoFileMeta | null, label: string) => {
    if (!meta) return;
    if (meta.isPdf) {
      issues.push({
        id: `${label}-pdf`,
        severity: 'ok',
        title: `${label} PDF file queued (${meta.fileName})`,
        detail: 'Vector PDF will be pre-flighted by our prepress team for sharp edge output.',
      });
      return;
    }
    if (meta.isVector) {
      issues.push({
        id: `${label}-svg`,
        severity: 'ok',
        title: `${label} SVG vector verified`,
        detail: 'Infinite scalability for crisp DTF, Embroidery, or Screen Print plates.',
      });
      return;
    }
    if (meta.naturalWidth > 0 && (meta.naturalWidth < 400 || meta.naturalHeight < 400)) {
      issues.push({
        id: `${label}-lowres`,
        severity: 'warning',
        title: `${label} resolution is low (${meta.naturalWidth}×${meta.naturalHeight}px)`,
        detail: 'Recommended minimum is 800×800px or 300 DPI PNG/SVG for sharpest print edges.',
      });
    } else if (meta.naturalWidth >= 400) {
      issues.push({
        id: `${label}-hd`,
        severity: 'ok',
        title: `${label} print resolution crisp (${meta.naturalWidth}×${meta.naturalHeight}px)`,
        detail: 'Meets 230 GSM Pique apparel production standards.',
      });
    }
  };

  checkMeta(params.frontMeta, 'Front logo');
  if (!params.noBackPrint && params.backMeta && params.backMeta.fileName !== params.frontMeta?.fileName) {
    checkMeta(params.backMeta, 'Back logo');
  }

  // Check if any visible layer exceeds safe garment chest/torso boundary (x: 155..345, y: 115..420)
  const outOfBounds = [...visibleFront, ...visibleBack].filter(
    (l) => l.x - l.width / 2 < 145 || l.x + l.width / 2 > 355 || l.y - l.height / 2 < 95 || l.y + l.height / 2 > 430
  );
  if (outOfBounds.length > 0) {
    issues.push({
      id: 'bounds-check',
      severity: 'warning',
      title: `${outOfBounds.length} element(s) near seam/collar edge`,
      detail: 'Move elements slightly inward inside the dashed print guide for stitch-free printing.',
    });
  }

  if (params.artworkApproved) {
    issues.push({
      id: 'approved-ok',
      severity: 'ok',
      title: 'Customer pre-production sign-off recorded',
      detail: 'Marked as Approved for factory production.',
    });
  }

  return issues;
}

export async function renderStudioSvgToPngDataUrl(
  svgEl: SVGSVGElement | null,
  size = 1200,
  backgroundColor = '#F4F6F9'
): Promise<string | null> {
  if (!svgEl || typeof document === 'undefined') return null;

  try {
    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    cloned.setAttribute('width', String(size));
    cloned.setAttribute('height', String(size));
    if (!cloned.getAttribute('viewBox')) {
      cloned.setAttribute('viewBox', '0 0 500 500');
    }

    // Remove interactive selection chrome overlays tagged with data-studio-chrome="true"
    cloned.querySelectorAll('[data-studio-chrome="true"]').forEach((node) => node.remove());

    // Inline external images
    const images = Array.from(cloned.querySelectorAll('image'));
    await Promise.all(
      images.map(async (imgNode) => {
        const href = imgNode.getAttribute('href') || imgNode.getAttribute('xlink:href') || '';
        if (!href || href.startsWith('data:') || href.startsWith('#')) return;
        try {
          const url = href.startsWith('/') ? `${window.location.origin}${href}` : href;
          const resp = await fetch(url);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl) {
            imgNode.setAttribute('href', dataUrl);
            imgNode.removeAttribute('xlink:href');
          }
        } catch {
          // ignore fetch failures
        }
      })
    );

    const svgStr = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(e);
        image.src = blobUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (err) {
    console.warn('[PlainPoloStudio] Export PNG failed:', err);
    return null;
  }
}

export async function renderPdfBadgeDataUrl(fileName: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 480, 360);
  ctx.fillStyle = '#071B35';
  ctx.strokeStyle = '#FF7900';
  ctx.lineWidth = 6;

  // Rounded badge
  const r = 28;
  ctx.beginPath();
  ctx.moveTo(24 + r, 24);
  ctx.lineTo(456 - r, 24);
  ctx.quadraticCurveTo(456, 24, 456, 24 + r);
  ctx.lineTo(456, 336 - r);
  ctx.quadraticCurveTo(456, 336, 456 - r, 336);
  ctx.lineTo(24 + r, 336);
  ctx.quadraticCurveTo(24, 336, 24, 336 - r);
  ctx.lineTo(24, 24 + r);
  ctx.quadraticCurveTo(24, 24, 24 + r, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF7900';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PDF VECTOR LOGO', 240, 150);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 22px monospace';
  const shortName = fileName.length > 26 ? `${fileName.slice(0, 23)}...` : fileName;
  ctx.fillText(shortName, 240, 210);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('Prepress file attached cleanly', 240, 258);

  return canvas.toDataURL('image/png');
}

export function formatBytesCompact(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildPlainPoloShareLink(params: {
  colorName: string;
  printMethod: PrintMethod;
  quantity: number;
  frontPlacement: string;
  backPlacement: string;
}): string {
  if (typeof window === 'undefined') return 'https://teqqnoworld.com/#/product/customized-plain-polo-t-shirt';
  const search = new URLSearchParams({
    color: params.colorName,
    method: params.printMethod,
    qty: String(params.quantity),
    front: params.frontPlacement,
    back: params.backPlacement,
  });
  return `${window.location.origin}/#/product/customized-plain-polo-t-shirt?${search.toString()}`;
}

export async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export interface PlainPoloModalCommitPayload {
  frontArtwork: CustomArtwork | null;
  backArtwork: CustomArtwork | null;
  frontPlacement: string;
  backPlacement: string;
  uploadedFrontLogoName: string;
  uploadedBackLogoName: string;
  artworkStatus?: 'uploaded' | 'awaiting_review' | 'approved' | 'no_artwork';
  selectedColor?: ProductColor;
  selectedPrintMethod?: PrintMethod;
  quantity?: number;
  sizeDistribution?: Record<string, number>;
}

export type { LogoPartItem };
