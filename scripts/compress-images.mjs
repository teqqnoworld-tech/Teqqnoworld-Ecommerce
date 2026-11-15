import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TARGET_DIRS = ['public'];
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

function getAllImageFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      results = results.concat(getAllImageFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTS.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function compressImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const originalSize = fs.statSync(filePath).size;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let compressedBuffer;

    if (ext === '.png') {
      // First attempt: quantized palette PNG (high quality)
      try {
        compressedBuffer = await sharp(filePath)
          .png({ quality: 80, compressionLevel: 9, palette: true, effort: 7 })
          .toBuffer();
      } catch {
        compressedBuffer = await sharp(filePath)
          .png({ quality: 85, compressionLevel: 9, effort: 7 })
          .toBuffer();
      }

      // If palette mode somehow produced a larger file, try non-palette high compression
      if (compressedBuffer.length >= originalSize) {
        const altBuffer = await sharp(filePath)
          .png({ quality: 85, compressionLevel: 9, effort: 7 })
          .toBuffer();
        if (altBuffer.length < compressedBuffer.length) {
          compressedBuffer = altBuffer;
        }
      }
    } else if (ext === '.webp') {
      compressedBuffer = await sharp(filePath)
        .webp({ quality: 82, effort: 5 })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      compressedBuffer = await sharp(filePath)
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    }

    if (compressedBuffer && compressedBuffer.length < originalSize) {
      // Overwrite file safely
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, compressedBuffer);
      fs.renameSync(tmpPath, filePath);

      const savedBytes = originalSize - compressedBuffer.length;
      const savingsPercent = ((savedBytes / originalSize) * 100).toFixed(1);
      return {
        filePath,
        originalSize,
        newSize: compressedBuffer.length,
        savedBytes,
        savingsPercent,
        compressed: true,
      };
    } else {
      return {
        filePath,
        originalSize,
        newSize: originalSize,
        savedBytes: 0,
        savingsPercent: '0.0',
        compressed: false,
      };
    }
  } catch (err) {
    console.error(`Error compressing ${filePath}:`, err.message);
    return {
      filePath,
      originalSize,
      newSize: originalSize,
      savedBytes: 0,
      savingsPercent: '0.0',
      compressed: false,
      error: err.message,
    };
  }
}

async function main() {
  console.log('🚀 Starting image compression process for website assets...\n');
  const allFiles = TARGET_DIRS.flatMap((dir) => getAllImageFiles(dir));
  console.log(`Found ${allFiles.length} images to inspect.\n`);

  let totalOriginal = 0;
  let totalNew = 0;
  let compressedCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const result = await compressImage(file);
    totalOriginal += result.originalSize;
    totalNew += result.newSize;

    if (result.compressed) {
      compressedCount++;
      const origKb = (result.originalSize / 1024).toFixed(1);
      const newKb = (result.newSize / 1024).toFixed(1);
      console.log(`[${i + 1}/${allFiles.length}] ✅ ${file}: ${origKb}KB -> ${newKb}KB (-${result.savingsPercent}%)`);
    } else {
      const origKb = (result.originalSize / 1024).toFixed(1);
      console.log(`[${i + 1}/${allFiles.length}] ⏭️  ${file}: ${origKb}KB (already optimized)`);
    }
  }

  const origMb = (totalOriginal / 1024 / 1024).toFixed(2);
  const newMb = (totalNew / 1024 / 1024).toFixed(2);
  const savedMb = ((totalOriginal - totalNew) / 1024 / 1024).toFixed(2);
  const totalPercent = (((totalOriginal - totalNew) / totalOriginal) * 100).toFixed(1);

  console.log('\n======================================================');
  console.log('🎉 Image Compression Complete!');
  console.log(`Total images scanned: ${allFiles.length}`);
  console.log(`Images compressed:    ${compressedCount}`);
  console.log(`Original total size:  ${origMb} MB`);
  console.log(`New total size:       ${newMb} MB`);
  console.log(`Total data saved:     ${savedMb} MB (-${totalPercent}%)`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Fatal error running compression:', err);
  process.exit(1);
});
