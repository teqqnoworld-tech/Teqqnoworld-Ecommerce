/**
 * Client-Side Image Compression & Optimization Utility
 * 
 * Provides high-performance browser canvas compression for uploaded user logos,
 * mockup graphics, and dynamic imagery before sending to Supabase Storage or
 * storing in local state.
 * 
 * Target specification:
 * - Max dimension: 1200px (width or height, aspect ratio preserved)
 * - Format: Modern lightweight WebP (with JPEG fallback)
 * - Compression quality: 0.8 (80%)
 * - Vector preservation: Keeps SVG files intact without rasterization
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // e.g. 0.25 means 75% savings
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'image/webp',
};

/**
 * Calculates responsive target dimensions while preserving aspect ratio.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Loads an image from a Blob, File, or Data URL safely.
 */
function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image for compression: ${err}`));
    img.src = source;
  });
}

/**
 * Compresses an image File or Blob client-side using HTML5 Canvas.
 * Reduces raw camera files (5-15MB) down to ultra-fast web payloads (50-250KB).
 */
export async function compressImageFile(
  file: File | Blob,
  options?: ImageCompressionOptions
): Promise<CompressedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;
  const fileName = (file instanceof File && file.name) ? file.name : 'image.webp';
  const fileType = file.type || '';

  // 1. Vector SVG Preservation
  if (fileType.includes('svg') || fileName.toLowerCase().endsWith('.svg')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const fileObj = file instanceof File ? file : new File([file], fileName, { type: 'image/svg+xml' });
    return {
      file: fileObj,
      dataUrl,
      width: 0,
      height: 0,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }

  // 2. Read into temporary Object URL
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      opts.maxWidth,
      opts.maxHeight
    );

    // 3. Render onto Canvas with high smoothing
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 4. Export to target format
    let targetMime = opts.format;
    let compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), targetMime, opts.quality);
    });

    // Fallback to JPEG if WebP blob creation fails in older environments
    if (!compressedBlob) {
      targetMime = 'image/jpeg';
      compressedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), targetMime, opts.quality);
      });
    }

    if (!compressedBlob) {
      throw new Error('Failed to generate compressed image blob');
    }

    const dataUrl = canvas.toDataURL(targetMime, opts.quality);
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const extension = targetMime === 'image/webp' ? 'webp' : (targetMime === 'image/png' ? 'png' : 'jpg');
    const compressedFileName = `${baseName}.${extension}`;

    const compressedFile = new File([compressedBlob], compressedFileName, {
      type: targetMime,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      dataUrl,
      width: targetWidth,
      height: targetHeight,
      originalSize,
      compressedSize: compressedBlob.size,
      compressionRatio: Number((compressedBlob.size / Math.max(1, originalSize)).toFixed(3)),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses an existing Base64 Data URL to max 1200px width/height and 80% WebP.
 * Highly useful for uploaded logos embedded in state before sending to Supabase.
 */
export async function compressDataUrl(
  dataUrl: string,
  options?: ImageCompressionOptions
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  // Preserve SVGs
  if (dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const img = await loadImage(dataUrl);
    const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      opts.maxWidth,
      opts.maxHeight
    );

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!ctx) return dataUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL(opts.format, opts.quality);
  } catch (err) {
    console.warn('[ImageCompressor] compressDataUrl fallback to original:', err);
    return dataUrl;
  }
}
