import React from 'react';
import { createRoot } from 'react-dom/client';
import { CartItem, CustomArtwork, PrintMethod, Product, ProductColor, StudioLayer } from '../types';
import { ProductMockupCanvas } from '../components/ProductMockupCanvas';

// Module-level cache for fetched local/remote image assets converted to base64 data URLs
const inlineImageCache = new Map<string, string>();

async function toInlineDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (inlineImageCache.has(url)) {
    return inlineImageCache.get(url) || null;
  }

  try {
    const resolvedUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const response = await fetch(resolvedUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (dataUrl) {
      inlineImageCache.set(url, dataUrl);
    }
    return dataUrl;
  } catch {
    return null;
  }
}

async function svgElementToDataUrl(svgEl: SVGSVGElement, width = 800, height = 800): Promise<string | null> {
  try {
    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    cloned.setAttribute('width', String(width));
    cloned.setAttribute('height', String(height));
    if (!cloned.getAttribute('viewBox')) {
      cloned.setAttribute('viewBox', '0 0 500 500');
    }

    // Inline all external/relative <image> hrefs so SVG renders safely onto <canvas>
    const imageNodes = Array.from(cloned.querySelectorAll('image'));
    await Promise.all(
      imageNodes.map(async (imgNode) => {
        const href = imgNode.getAttribute('href') || imgNode.getAttribute('xlink:href') || '';
        if (!href || href.startsWith('#') || href.startsWith('data:')) return;
        const inlined = await toInlineDataUrl(href);
        if (inlined) {
          imgNode.setAttribute('href', inlined);
          imgNode.removeAttribute('xlink:href');
        }
      })
    );

    const svgString = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = (err) => reject(err);
        image.src = blobUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const webp = canvas.toDataURL('image/webp', 0.86);
      if (webp.startsWith('data:image/webp')) {
        return webp;
      }
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (err) {
    console.warn('[mockupSnapshot] Failed converting SVG to image:', err);
    return null;
  }
}

export interface MockupRenderParams {
  product: Product;
  color: ProductColor;
  artwork?: CustomArtwork | null;
  printMethod?: PrintMethod;
  printPlacement?: string;
  view?: 'front' | 'back';
  selectedVariantLabel?: string;
}

/**
 * Renders ProductMockupCanvas offscreen and captures a crisp 800x800 WebP/PNG composite snapshot
 * showing the exact product color, uploaded logo/poster, text/shape layers, position, scale & rotation.
 */
export async function renderProductMockupSnapshot(params: MockupRenderParams): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '500px';
  container.style.height = '500px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      React.createElement(ProductMockupCanvas, {
        productType: params.product.productType || 'polo',
        color: params.color,
        artwork: params.artwork || null,
        printMethod: params.printMethod || params.product.printMethods?.[0] || 'DTF Printing',
        printPlacement: params.printPlacement || 'Front Center',
        view: params.view || 'front',
        showPrintBoundary: false,
        showWatermark: false,
        selectedVariantLabel: params.selectedVariantLabel,
      })
    );

    // Wait two frames so React flushes DOM + SVG nodes
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60)));
    });

    const svgEl = container.querySelector('svg');
    if (!svgEl) return null;

    return await svgElementToDataUrl(svgEl as SVGSVGElement, 800, 800);
  } catch (err) {
    console.warn('[mockupSnapshot] Offscreen render failed:', err);
    return null;
  } finally {
    try {
      root.unmount();
    } catch {}
    container.remove();
  }
}

/**
 * Renders a 92x52mm Visiting Card composite mockup showing exact uploaded card art + X/Y/Scale/Rotation.
 */
export async function renderVisitingCardSnapshot(
  artworkDataUrl?: string | null,
  settings?: { x: number; y: number; scale: number; rotation: number },
  sideLabel: 'FRONT SIDE' | 'BACK SIDE' = 'FRONT SIDE'
): Promise<string | null> {
  if (typeof document === 'undefined' || !artworkDataUrl) return null;

  try {
    const inlined = await toInlineDataUrl(artworkDataUrl);
    if (!inlined) return null;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = inlined;
    });

    const width = 920;
    const height = 560;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Studio background
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, width, height);

    // Card frame (centered)
    const cardW = 736;
    const cardH = 416;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2 + 10;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.16)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.restore();

    // Clip card area & apply transform
    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX, cardY, cardW, cardH);
    ctx.clip();

    const s = settings || { x: 0, y: 0, scale: 1, rotation: 0 };
    const offsetX = (s.x / 100) * cardW;
    const offsetY = (s.y / 100) * cardH;

    ctx.translate(cardX + cardW / 2 + offsetX, cardY + cardH / 2 + offsetY);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.scale(s.scale, s.scale);

    const aspectImg = img.width / Math.max(1, img.height);
    const aspectCard = cardW / cardH;
    let drawW = cardW;
    let drawH = cardH;
    if (aspectImg > aspectCard) {
      drawH = cardH;
      drawW = cardH * aspectImg;
    } else {
      drawW = cardW;
      drawH = cardW / aspectImg;
    }
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Cut / Bleed border & header label
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`300 GSM VISITING CARD (92 × 52 MM) · ${sideLabel}`, width / 2, 42);

    const webp = canvas.toDataURL('image/webp', 0.86);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[mockupSnapshot] Visiting card snapshot failed:', err);
    return null;
  }
}

function formatOffsetLabel(x: number, y: number): string {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (Math.abs(rx) <= 1 && Math.abs(ry) <= 1) {
    return 'Centered (X: 0%, Y: 0%)';
  }
  const hDir = rx > 1 ? 'Right' : rx < -1 ? 'Left' : 'Center';
  const vDir = ry > 1 ? 'Down' : ry < -1 ? 'Up' : 'Center';
  return `X: ${rx >= 0 ? '+' : ''}${rx}% (${hDir}), Y: ${ry >= 0 ? '+' : ''}${ry}% (${vDir})`;
}

function summarizeStudioLayers(layers?: StudioLayer[]): string {
  if (!layers || layers.length === 0) return '';
  const visible = layers.filter((l) => l.visible !== false);
  if (visible.length === 0) return '';

  const parts = visible.map((l) => {
    const pos = `@ (${Math.round(l.x)}, ${Math.round(l.y)}) in 500×500 stage, ${Math.round(l.width)}×${Math.round(l.height)}px, rot ${Math.round(l.rotation || 0)}°`;
    if (l.kind === 'text' || l.kind === 'curved-text') {
      return `Text "${l.text || ''}" (${l.textColor || '#fff'}) ${pos}`;
    }
    if (l.kind === 'shape') {
      return `Shape(${l.shapeType || 'rect'}) ${pos}`;
    }
    return `${l.isMainLogo ? 'Primary Logo' : 'Extra Poster/Image'} ${pos}`;
  });
  return parts.join('; ');
}

function summarizeArtworkSide(
  sideLabel: 'Front' | 'Back',
  placement: string,
  art?: CustomArtwork | null,
  vcSettings?: { x: number; y: number; scale: number; rotation: number }
): string | null {
  if (!art && !vcSettings) return null;

  if (vcSettings) {
    return `${sideLabel} (${placement}): ${formatOffsetLabel(vcSettings.x, vcSettings.y)} | Scale: ${Math.round(vcSettings.scale * 100)}% (${vcSettings.scale.toFixed(2)}x) | Rotation: ${Math.round(vcSettings.rotation)}°`;
  }

  if (!art) return null;
  const hasLayers = art.studioLayers && art.studioLayers.length > 0;
  const isCustomUpload =
    art.type === 'image' ||
    Boolean(art.dataUrl) ||
    Boolean(art.rawDataUrl) ||
    Boolean(art.studioLayers?.some((l) => l.kind === 'image' || l.kind === 'logo'));

  if (!isCustomUpload && art.type === 'preset' && !hasLayers) {
    return `${sideLabel} (${placement}): Default placeholder ("${art.text || 'YOUR LOGO HERE'}") — ${formatOffsetLabel(art.x, art.y)} | Scale: ${Math.round(art.scale * 100)}%`;
  }

  const baseSpec = `${sideLabel} (${placement}): ${formatOffsetLabel(art.x, art.y)} | Scale: ${Math.round(art.scale * 100)}% (${art.scale.toFixed(2)}x) | Rotation: ${Math.round(art.rotation || 0)}°`;
  const layerText = summarizeStudioLayers(art.studioLayers);
  const customText = art.type === 'text' && art.text ? ` | Text: "${art.text}" (${art.fontFamily || 'Default'})` : '';

  return layerText ? `${baseSpec} | Studio Layers: [${layerText}]` : `${baseSpec}${customText}`;
}

/**
 * Generates an accurate, human-readable breakdown of where and how the customer placed
 * their logo/poster/text on Front and/or Back of the product.
 */
export function describeArtworkPlacement(item: CartItem): string {
  const parts: string[] = [];

  if (item.visitingCardDesign) {
    if (item.visitingCardDesign.frontDataUrl) {
      const f = summarizeArtworkSide('Front', item.frontPlacement || 'Front Side (92 × 52 MM)', null, item.visitingCardDesign.frontSettings);
      if (f) parts.push(f);
    }
    if (item.visitingCardDesign.backDataUrl) {
      const b = summarizeArtworkSide('Back', item.backPlacement || 'Back Side (92 × 52 MM)', null, item.visitingCardDesign.backSettings);
      if (b) parts.push(b);
    }
  } else {
    const frontArt = item.frontArtwork || item.artwork;
    if (frontArt) {
      const f = summarizeArtworkSide('Front', item.frontPlacement || item.printPlacement || 'Front Center', frontArt);
      if (f) parts.push(f);
    }
    if (item.backArtwork) {
      const b = summarizeArtworkSide('Back', item.backPlacement || 'Back Center', item.backArtwork);
      if (b) parts.push(b);
    }
  }

  if (item.sizeDistribution && Object.keys(item.sizeDistribution).length > 0) {
    const distStr = Object.entries(item.sizeDistribution)
      .filter(([, qty]) => qty > 0)
      .map(([sz, qty]) => `${sz}: ${qty}`)
      .join(', ');
    if (distStr) {
      parts.push(`Sizes: { ${distStr} }`);
    }
  }

  return parts.join(' || ') || `Placement: ${item.printPlacement || 'Standard'}`;
}

export interface ExtractedItemArtworks {
  frontRawLogo: string | null;
  backRawLogo: string | null;
  extraRawLogos: string[];
}

function getRawLogoFromArtwork(art?: CustomArtwork | null): string | null {
  if (!art) return null;
  if (art.rawDataUrl) return art.rawDataUrl;
  if (art.dataUrl) return art.dataUrl;
  const imgLayer = art.studioLayers?.find((l) => (l.kind === 'logo' || l.kind === 'image') && l.dataUrl && l.visible !== false);
  return imgLayer?.dataUrl || null;
}

/**
 * Extracts all raw customer-uploaded logos/posters from a CartItem (front, back, studio extra layers, visiting card).
 */
export function extractArtworkAssetsFromItem(item: CartItem): ExtractedItemArtworks {
  if (item.visitingCardDesign) {
    return {
      frontRawLogo: item.visitingCardDesign.frontDataUrl || null,
      backRawLogo: item.visitingCardDesign.backDataUrl || null,
      extraRawLogos: [],
    };
  }

  const frontArt = item.frontArtwork || item.artwork;
  const frontRawLogo = getRawLogoFromArtwork(frontArt);
  const backRawLogo = getRawLogoFromArtwork(item.backArtwork);

  const seen = new Set<string>();
  if (frontRawLogo) seen.add(frontRawLogo);
  if (backRawLogo) seen.add(backRawLogo);

  const extraRawLogos: string[] = [];
  const collectExtra = (art?: CustomArtwork | null) => {
    if (!art?.studioLayers) return;
    for (const layer of art.studioLayers) {
      if (layer.visible !== false && (layer.kind === 'logo' || layer.kind === 'image') && layer.dataUrl && !seen.has(layer.dataUrl)) {
        seen.add(layer.dataUrl);
        extraRawLogos.push(layer.dataUrl);
      }
    }
  };

  collectExtra(frontArt);
  collectExtra(item.backArtwork);

  return {
    frontRawLogo,
    backRawLogo,
    extraRawLogos,
  };
}

/**
 * Ensures front & back composite product mockup snapshots exist for a CartItem.
 */
export async function generateItemMockupSnapshots(item: CartItem): Promise<{
  frontMockupDataUrl: string | null;
  backMockupDataUrl: string | null;
}> {
  if (item.visitingCardDesign) {
    const frontMockupDataUrl =
      item.previewUrl && item.previewUrl.startsWith('data:')
        ? item.previewUrl
        : await renderVisitingCardSnapshot(
            item.visitingCardDesign.frontDataUrl,
            item.visitingCardDesign.frontSettings,
            'FRONT SIDE'
          );
    const backMockupDataUrl =
      item.backPreviewUrl && item.backPreviewUrl.startsWith('data:')
        ? item.backPreviewUrl
        : await renderVisitingCardSnapshot(
            item.visitingCardDesign.backDataUrl,
            item.visitingCardDesign.backSettings,
            'BACK SIDE'
          );
    return { frontMockupDataUrl, backMockupDataUrl };
  }

  const frontArt = item.frontArtwork || item.artwork;
  const frontMockupDataUrl =
    item.previewUrl && item.previewUrl.startsWith('data:')
      ? item.previewUrl
      : await renderProductMockupSnapshot({
          product: item.product,
          color: item.color,
          artwork: frontArt,
          printMethod: item.printMethod,
          printPlacement: item.frontPlacement || item.printPlacement || 'Front Center',
          view: 'front',
          selectedVariantLabel: item.size,
        });

  let backMockupDataUrl: string | null = null;
  if (item.backArtwork) {
    backMockupDataUrl =
      item.backPreviewUrl && item.backPreviewUrl.startsWith('data:')
        ? item.backPreviewUrl
        : await renderProductMockupSnapshot({
            product: item.product,
            color: item.color,
            artwork: item.backArtwork,
            printMethod: item.printMethod,
            printPlacement: item.backPlacement || item.printPlacement || 'Back Center',
            view: 'back',
            selectedVariantLabel: item.size,
          });
  }

  return { frontMockupDataUrl, backMockupDataUrl };
}
