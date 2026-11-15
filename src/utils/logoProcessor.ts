export type PrintColorMode = 'full' | 'white' | 'black' | 'auto';
export type LogoLayoutMode = 'as-uploaded' | 'top-to-bottom' | 'icon-left' | 'icon-right';

export type EraserAction =
  | {
      type: 'brush';
      points: Array<{ x: number; y: number }>; // normalized 0..1 relative to canvas
      radius: number; // normalized 0..0.2 relative to max(width, height)
    }
  | {
      type: 'flood';
      x: number; // normalized 0..1
      y: number; // normalized 0..1
      tolerance: number;
    };

export interface LogoCleanupOptions {
  removeBg: boolean;
  bgStrength: number; // 0..100
  printColorMode: PrintColorMode;
  trimEdges: boolean;
  trimPadding: number; // 0..40 px on 500px scale
  layoutMode: LogoLayoutMode;
  partSpacing: number; // 0..200 (100 = Normal)
  hiddenPartIndices: number[];
  eraserActions: EraserAction[];
}

export const DEFAULT_LOGO_CLEANUP: LogoCleanupOptions = {
  removeBg: true,
  bgStrength: 45,
  printColorMode: 'auto',
  trimEdges: true,
  trimPadding: 4,
  layoutMode: 'as-uploaded',
  partSpacing: 100,
  hiddenPartIndices: [],
  eraserActions: [],
};

export interface LogoPartItem {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface ProcessedLogoResult {
  processedDataUrl: string;
  eraserBaseDataUrl: string; // bg-removed pre-layout image for Magic Eraser UI
  width: number;
  height: number;
  parts: LogoPartItem[];
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Generates a crisp transparent PNG dataUrl for built-in corporate preset logos
 * so Background Removal, Logo Parts, Layout, Print Colour & Magic Eraser work immediately.
 */
export function rasterizePresetToDataUrl(presetId: string, label?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;

  if (presetId === 'hyperscale') {
    // Blue triangle icon + wordmark
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(cx, 55);
    ctx.lineTo(cx + 80, 195);
    ctx.lineTo(cx - 80, 195);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, 108);
    ctx.lineTo(cx + 30, 165);
    ctx.lineTo(cx - 30, 165);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 54px "Space Grotesk", "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || 'HYPERSCALE', cx, 275);
  } else if (presetId === 'zepto') {
    // Emerald rounded square + diamond + wordmark
    ctx.fillStyle = '#10B981';
    roundRect(ctx, cx - 72, 55, 144, 144, 26);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, 88);
    ctx.lineTo(cx + 38, 127);
    ctx.lineTo(cx, 166);
    ctx.lineTo(cx - 38, 127);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 52px "Space Grotesk", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || 'ZEPTO LOGIX', cx, 275);
  } else if (presetId === 'finedge') {
    // Amber ring + inner dot + wordmark
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(cx, 128, 66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx, 128, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#18181B';
    ctx.font = 'bold 56px "Space Grotesk", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || 'FINEDGE', cx, 275);
  } else if (presetId === 'acme') {
    // Pink star + wordmark
    ctx.fillStyle = '#EC4899';
    ctx.font = 'bold 145px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', cx, 125);

    ctx.fillStyle = '#831843';
    ctx.font = 'bold 64px "Space Grotesk", Arial, sans-serif';
    ctx.fillText(label || 'ACME', cx, 270);
  } else {
    // Default 'your-logo' placeholder badge ("YOUR LOGO HERE")
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    roundRect(ctx, 42, 74, canvas.width - 84, canvas.height - 148, 36);
    ctx.fill();

    ctx.strokeStyle = '#FF7A00';
    ctx.lineWidth = 12;
    ctx.setLineDash([24, 14]);
    roundRect(ctx, 42, 74, canvas.width - 84, canvas.height - 148, 36);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 58px "Space Grotesk", "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR LOGO', cx, 172);

    ctx.fillStyle = '#FF7A00';
    ctx.font = '800 64px "Space Grotesk", "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('HERE', cx, 258);
  }

  return canvas.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#1A1A1E').replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 26,
      parseInt(clean[1] + clean[1], 16) || 26,
      parseInt(clean[2] + clean[2], 16) || 30,
    ];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [Number.isNaN(r) ? 26 : r, Number.isNaN(g) ? 26 : g, Number.isNaN(b) ? 30 : b];
}

function stripBackgroundPixels(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample border pixels to find dominant opaque background color
  const samples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(w / 24));
  const stepY = Math.max(1, Math.floor(h / 24));

  for (let x = 0; x < w; x += stepX) {
    for (const y of [0, 1, h - 2, h - 1]) {
      const idx = (Math.max(0, Math.min(h - 1, y)) * w + x) * 4;
      if (data[idx + 3] > 200) samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = 0; y < h; y += stepY) {
    for (const x of [0, 1, w - 2, w - 1]) {
      const idx = (y * w + Math.max(0, Math.min(w - 1, x))) * 4;
      if (data[idx + 3] > 200) samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  // If image already has transparent borders, don't wipe internal colors unless user explicitly increases strength very high (>75)
  if (samples.length < 10) {
    if (strength <= 75) return;
    // Strip pure white boxes inside transparent PNGs at high strength
    const whiteMax = (strength - 70) * 2.2;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const dist = Math.hypot(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
      if (dist < whiteMax) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return;
  }

  // Compute median-like average of border samples clustered around first corner
  const ref = samples[0];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (const s of samples) {
    if (Math.hypot(s[0] - ref[0], s[1] - ref[1], s[2] - ref[2]) < 55) {
      sumR += s[0];
      sumG += s[1];
      sumB += s[2];
      count++;
    }
  }

  if (count === 0) return;
  const bgR = sumR / count;
  const bgG = sumG / count;
  const bgB = sumB / count;

  const maxDist = 14 + strength * 1.55;
  const featherStart = maxDist * 0.65;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const dist = Math.hypot(data[i] - bgR, data[i + 1] - bgG, data[i + 2] - bgB);
    if (dist <= featherStart) {
      data[i + 3] = 0;
    } else if (dist < maxDist) {
      const ratio = (dist - featherStart) / (maxDist - featherStart);
      data[i + 3] = Math.round(a * ratio);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function applyEraserActionsToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  actions: EraserAction[]
) {
  for (const act of actions) {
    if (act.type === 'brush' && act.points.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      const rPx = Math.max(2, act.radius * Math.max(w, h));
      ctx.lineWidth = rPx * 2;
      if (act.points.length === 1) {
        ctx.beginPath();
        ctx.arc(act.points[0].x * w, act.points[0].y * h, rPx, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(act.points[0].x * w, act.points[0].y * h);
        for (let i = 1; i < act.points.length; i++) {
          ctx.lineTo(act.points[i].x * w, act.points[i].y * h);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (act.type === 'flood') {
      const sx = Math.max(0, Math.min(w - 1, Math.round(act.x * w)));
      const sy = Math.max(0, Math.min(h - 1, Math.round(act.y * h)));
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const startIdx = (sy * w + sx) * 4;
      if (data[startIdx + 3] < 10) continue;

      const sr = data[startIdx];
      const sg = data[startIdx + 1];
      const sb = data[startIdx + 2];
      const tol = act.tolerance || 45;

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0;
      let tail = 0;
      const startPos = sy * w + sx;
      queue[tail++] = startPos;
      visited[startPos] = 1;

      while (head < tail) {
        const pos = queue[head++];
        const pIdx = pos * 4;
        data[pIdx + 3] = 0;

        const px = pos % w;
        const py = (pos - px) / w;

        const neighbors = [
          px > 0 ? pos - 1 : -1,
          px < w - 1 ? pos + 1 : -1,
          py > 0 ? pos - w : -1,
          py < h - 1 ? pos + w : -1,
        ];

        for (let k = 0; k < 4; k++) {
          const nPos = neighbors[k];
          if (nPos < 0 || visited[nPos]) continue;
          const nIdx = nPos * 4;
          if (data[nIdx + 3] < 10) continue;
          const dist = Math.hypot(data[nIdx] - sr, data[nIdx + 1] - sg, data[nIdx + 2] - sb);
          if (dist <= tol) {
            visited[nPos] = 1;
            queue[tail++] = nPos;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }
}

function segmentPartsFromCanvas(
  sourceCanvas: HTMLCanvasElement
): { parts: LogoPartItem[]; fullW: number; fullH: number } {
  const fullW = sourceCanvas.width;
  const fullH = sourceCanvas.height;

  // Downsample to max 220px for fast segmentation with word-level horizontal dilation
  const maxDim = 200;
  const scale = Math.min(1, maxDim / Math.max(fullW, fullH));
  const aw = Math.max(8, Math.round(fullW * scale));
  const ah = Math.max(8, Math.round(fullH * scale));

  const aCanvas = document.createElement('canvas');
  aCanvas.width = aw;
  aCanvas.height = ah;
  const aCtx = aCanvas.getContext('2d');
  if (!aCtx) return { parts: [], fullW, fullH };
  aCtx.drawImage(sourceCanvas, 0, 0, aw, ah);

  const aData = aCtx.getImageData(0, 0, aw, ah).data;
  const binary = new Uint8Array(aw * ah);
  for (let i = 0; i < aw * ah; i++) {
    binary[i] = aData[i * 4 + 3] > 20 ? 1 : 0;
  }

  // Horizontal dilation (+5px left/right, +1px up/down) so letters in a word/line group cleanly into one part
  const dilated = new Uint8Array(aw * ah);
  const dilX = Math.max(3, Math.round(aw * 0.032));
  const dilY = 1;
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      if (!binary[y * aw + x]) continue;
      const x0 = Math.max(0, x - dilX);
      const x1 = Math.min(aw - 1, x + dilX);
      const y0 = Math.max(0, y - dilY);
      const y1 = Math.min(ah - 1, y + dilY);
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          dilated[yy * aw + xx] = 1;
        }
      }
    }
  }

  // BFS connected components
  const labels = new Int32Array(aw * ah);
  let currentLabel = 0;
  interface RawComp {
    label: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    pixelCount: number;
  }
  const comps: RawComp[] = [];
  const queue = new Int32Array(aw * ah);

  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const start = y * aw + x;
      if (!dilated[start] || labels[start] !== 0) continue;
      currentLabel++;
      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      labels[start] = currentLabel;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let origPixels = 0;

      while (head < tail) {
        const pos = queue[head++];
        if (binary[pos]) origPixels++;
        const px = pos % aw;
        const py = (pos - px) / aw;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const nbs = [
          px > 0 ? pos - 1 : -1,
          px < aw - 1 ? pos + 1 : -1,
          py > 0 ? pos - aw : -1,
          py < ah - 1 ? pos + aw : -1,
        ];
        for (let k = 0; k < 4; k++) {
          const np = nbs[k];
          if (np >= 0 && dilated[np] && labels[np] === 0) {
            labels[np] = currentLabel;
            queue[tail++] = np;
          }
        }
      }

      if (origPixels >= 10) {
        comps.push({ label: currentLabel, minX, minY, maxX, maxY, pixelCount: origPixels });
      }
    }
  }

  // Fallback if everything was super tiny or empty
  if (comps.length === 0) {
    return { parts: [], fullW, fullH };
  }

  // Sort components top-to-bottom, then left-to-right (grouping same visual row within 12% height tolerance)
  comps.sort((a, b) => {
    const cyA = (a.minY + a.maxY) / 2;
    const cyB = (b.minY + b.maxY) / 2;
    if (Math.abs(cyA - cyB) > ah * 0.12) return cyA - cyB;
    return a.minX - b.minX;
  });

  // Cap at max 6 meaningful parts by merging tiny secondary specs if needed, otherwise return sorted components
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return { parts: [], fullW, fullH };
  const srcImg = srcCtx.getImageData(0, 0, fullW, fullH);

  const parts: LogoPartItem[] = [];
  comps.slice(0, 8).forEach((comp, idx) => {
    const fx0 = Math.max(0, Math.floor((comp.minX / aw) * fullW));
    const fy0 = Math.max(0, Math.floor((comp.minY / ah) * fullH));
    const fx1 = Math.min(fullW - 1, Math.ceil(((comp.maxX + 1) / aw) * fullW));
    const fy1 = Math.min(fullH - 1, Math.ceil(((comp.maxY + 1) / ah) * fullH));

    // Refine tight bounding box on actual undilated non-zero pixels belonging to comp.label
    let tMinX = fx1;
    let tMinY = fy1;
    let tMaxX = fx0;
    let tMaxY = fy0;
    let hasPixels = false;

    for (let y = fy0; y <= fy1; y++) {
      const ay = Math.min(ah - 1, Math.floor((y / fullH) * ah));
      for (let x = fx0; x <= fx1; x++) {
        const ax = Math.min(aw - 1, Math.floor((x / fullW) * aw));
        if (labels[ay * aw + ax] !== comp.label) continue;
        const alpha = srcImg.data[(y * fullW + x) * 4 + 3];
        if (alpha > 8) {
          hasPixels = true;
          if (x < tMinX) tMinX = x;
          if (x > tMaxX) tMaxX = x;
          if (y < tMinY) tMinY = y;
          if (y > tMaxY) tMaxY = y;
        }
      }
    }

    if (!hasPixels) return;
    const pw = Math.max(1, tMaxX - tMinX + 1);
    const ph = Math.max(1, tMaxY - tMinY + 1);

    const pCanvas = document.createElement('canvas');
    pCanvas.width = pw;
    pCanvas.height = ph;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;

    const pImg = pCtx.createImageData(pw, ph);
    for (let y = tMinY; y <= tMaxY; y++) {
      const ay = Math.min(ah - 1, Math.floor((y / fullH) * ah));
      for (let x = tMinX; x <= tMaxX; x++) {
        const ax = Math.min(aw - 1, Math.floor((x / fullW) * aw));
        if (labels[ay * aw + ax] !== comp.label) continue;
        const sIdx = (y * fullW + x) * 4;
        const dIdx = ((y - tMinY) * pw + (x - tMinX)) * 4;
        pImg.data[dIdx] = srcImg.data[sIdx];
        pImg.data[dIdx + 1] = srcImg.data[sIdx + 1];
        pImg.data[dIdx + 2] = srcImg.data[sIdx + 2];
        pImg.data[dIdx + 3] = srcImg.data[sIdx + 3];
      }
    }
    pCtx.putImageData(pImg, 0, 0);

    parts.push({
      index: idx,
      dataUrl: pCanvas.toDataURL('image/png'),
      width: pw,
      height: ph,
      bbox: { x: tMinX, y: tMinY, w: pw, h: ph },
    });
  });

  return { parts, fullW, fullH };
}

function applyPrintColorModeToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: PrintColorMode,
  garmentHex: string
) {
  if (mode === 'full') return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let targetMode: 'full' | 'white' | 'black' = mode === 'auto' ? 'full' : mode;

  if (mode === 'auto') {
    const [gR, gG, gB] = parseHexToRgb(garmentHex);
    const garmentLum = 0.299 * gR + 0.587 * gG + 0.114 * gB;

    // Inspect average logo pixel luminance to see if logo clashes with garment
    let sumLum = 0;
    let cnt = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] > 60) {
        sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        cnt++;
      }
    }
    const logoLum = cnt > 0 ? sumLum / cnt : 128;

    // If dark logo on dark shirt -> flip crisp white; if bright white logo on white shirt -> flip charcoal
    if (garmentLum < 68 && logoLum < 55) {
      targetMode = 'white';
    } else if (garmentLum > 220 && logoLum > 210) {
      targetMode = 'black';
    } else {
      targetMode = 'full';
    }
  }

  if (targetMode === 'full') return;

  const [tR, tG, tB] = targetMode === 'white' ? [255, 255, 255] : [20, 20, 24];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = tR;
    data[i + 1] = tG;
    data[i + 2] = tB;
  }
  ctx.putImageData(imgData, 0, 0);
}

function trimCanvasEdges(source: HTMLCanvasElement, padding: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const ctx = source.getContext('2d');
  if (!ctx) return source;

  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return source;

  const pad = Math.max(0, Math.round(padding));
  const cw = maxX - minX + 1 + pad * 2;
  const ch = maxY - minY + 1 + pad * 2;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const outCtx = out.getContext('2d');
  if (!outCtx) return source;

  outCtx.drawImage(
    source,
    minX,
    minY,
    maxX - minX + 1,
    maxY - minY + 1,
    pad,
    pad,
    maxX - minX + 1,
    maxY - minY + 1
  );
  return out;
}

/**
 * Full client-side logo processing pipeline:
 * 1) Background removal
 * 2) Magic eraser strokes & flood-fill taps
 * 3) Part segmentation (icon + text lines)
 * 4) Part hiding & layout rearrangement (As uploaded / Top to bottom / Icon left / Icon right + spacing)
 * 5) Print colour recoloring (Full Colour / White / Black / Auto)
 * 6) Edge trimming
 */
export async function processLogoPipeline(
  rawDataUrl: string,
  options: LogoCleanupOptions,
  garmentHex: string
): Promise<ProcessedLogoResult> {
  const img = await loadImage(rawDataUrl);
  const maxDim = 640;
  const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth || 400, img.naturalHeight || 400));
  const w = Math.max(32, Math.round((img.naturalWidth || 400) * ratio));
  const h = Math.max(32, Math.round((img.naturalHeight || 400) * ratio));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) {
    return { processedDataUrl: rawDataUrl, eraserBaseDataUrl: rawDataUrl, width: w, height: h, parts: [] };
  }
  workCtx.drawImage(img, 0, 0, w, h);

  // 1) Background removal
  if (options.removeBg && options.bgStrength > 0) {
    stripBackgroundPixels(workCtx, w, h, options.bgStrength);
  }

  // Save pre-eraser/pre-layout snapshot if needed for Magic Eraser canvas base, OR save post-eraser pre-layout
  const eraserBaseDataUrl = workCanvas.toDataURL('image/png');

  // 2) Apply Magic Eraser actions
  if (options.eraserActions.length > 0) {
    applyEraserActionsToCanvas(workCtx, w, h, options.eraserActions);
  }

  // 3) Segment parts from cleaned image
  const { parts } = segmentPartsFromCanvas(workCanvas);

  // 4) Rearrange / hide parts into composed canvas
  let composedCanvas = workCanvas;
  const visibleParts = parts.filter((p) => !options.hiddenPartIndices.includes(p.index));

  if (parts.length > 0) {
    if (visibleParts.length === 0) {
      composedCanvas = document.createElement('canvas');
      composedCanvas.width = 64;
      composedCanvas.height = 64;
    } else if (
      options.layoutMode === 'as-uploaded' &&
      options.hiddenPartIndices.length === 0 &&
      options.partSpacing === 100
    ) {
      composedCanvas = workCanvas;
    } else {
      const partImages = await Promise.all(visibleParts.map((p) => loadImage(p.dataUrl)));
      const gapFactor = options.partSpacing / 100;

      if (options.layoutMode === 'as-uploaded') {
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const oCtx = out.getContext('2d')!;
        // Find overall centroid of visible parts
        const midX =
          visibleParts.reduce((s, p) => s + p.bbox.x + p.bbox.w / 2, 0) / visibleParts.length;
        const midY =
          visibleParts.reduce((s, p) => s + p.bbox.y + p.bbox.h / 2, 0) / visibleParts.length;

        visibleParts.forEach((p, i) => {
          const cx = p.bbox.x + p.bbox.w / 2;
          const cy = p.bbox.y + p.bbox.h / 2;
          const nx = midX + (cx - midX) * gapFactor - p.bbox.w / 2;
          const ny = midY + (cy - midY) * gapFactor - p.bbox.h / 2;
          oCtx.drawImage(partImages[i], nx, ny, p.bbox.w, p.bbox.h);
        });
        composedCanvas = out;
      } else if (options.layoutMode === 'top-to-bottom' || visibleParts.length === 1) {
        const baseGap = Math.max(12, Math.round(Math.min(w, h) * 0.06));
        const gap = Math.round(baseGap * gapFactor);
        const totalW = Math.max(...visibleParts.map((p) => p.bbox.w)) + 24;
        const totalH =
          visibleParts.reduce((s, p) => s + p.bbox.h, 0) +
          gap * Math.max(0, visibleParts.length - 1) +
          24;

        const out = document.createElement('canvas');
        out.width = Math.max(64, totalW);
        out.height = Math.max(64, totalH);
        const oCtx = out.getContext('2d')!;
        let curY = 12;
        visibleParts.forEach((p, i) => {
          const dx = Math.round((out.width - p.bbox.w) / 2);
          oCtx.drawImage(partImages[i], dx, curY, p.bbox.w, p.bbox.h);
          curY += p.bbox.h + gap;
        });
        composedCanvas = out;
      } else {
        // Icon left or Icon right
        const iconPart = visibleParts[0];
        const iconImg = partImages[0];
        const textParts = visibleParts.slice(1);
        const textImgs = partImages.slice(1);

        const baseGap = Math.max(14, Math.round(iconPart.bbox.w * 0.22));
        const hGap = Math.round(baseGap * gapFactor);
        const vGap = Math.max(6, Math.round(iconPart.bbox.h * 0.08 * gapFactor));

        const textBlockW = Math.max(...textParts.map((p) => p.bbox.w));
        const textBlockH =
          textParts.reduce((s, p) => s + p.bbox.h, 0) + vGap * Math.max(0, textParts.length - 1);

        const totalW = iconPart.bbox.w + hGap + textBlockW + 24;
        const totalH = Math.max(iconPart.bbox.h, textBlockH) + 24;

        const out = document.createElement('canvas');
        out.width = Math.max(64, totalW);
        out.height = Math.max(64, totalH);
        const oCtx = out.getContext('2d')!;

        const iconY = Math.round((out.height - iconPart.bbox.h) / 2);
        const textStartY = Math.round((out.height - textBlockH) / 2);

        if (options.layoutMode === 'icon-left') {
          const iconX = 12;
          const textX = iconX + iconPart.bbox.w + hGap;
          oCtx.drawImage(iconImg, iconX, iconY, iconPart.bbox.w, iconPart.bbox.h);
          let curY = textStartY;
          textParts.forEach((tp, idx) => {
            oCtx.drawImage(textImgs[idx], textX, curY, tp.bbox.w, tp.bbox.h);
            curY += tp.bbox.h + vGap;
          });
        } else {
          // icon-right
          const textX = 12;
          const iconX = textX + textBlockW + hGap;
          let curY = textStartY;
          textParts.forEach((tp, idx) => {
            const alignedX = textX + (textBlockW - tp.bbox.w);
            oCtx.drawImage(textImgs[idx], alignedX, curY, tp.bbox.w, tp.bbox.h);
            curY += tp.bbox.h + vGap;
          });
          oCtx.drawImage(iconImg, iconX, iconY, iconPart.bbox.w, iconPart.bbox.h);
        }

        composedCanvas = out;
      }
    }
  }

  // 5) Print colour mode
  const compCtx = composedCanvas.getContext('2d');
  if (compCtx) {
    applyPrintColorModeToCanvas(
      compCtx,
      composedCanvas.width,
      composedCanvas.height,
      options.printColorMode,
      garmentHex
    );
  }

  // 6) Trim edges
  const finalCanvas = options.trimEdges
    ? trimCanvasEdges(composedCanvas, options.trimPadding)
    : composedCanvas;

  return {
    processedDataUrl: finalCanvas.toDataURL('image/png'),
    eraserBaseDataUrl,
    width: finalCanvas.width,
    height: finalCanvas.height,
    parts,
  };
}
