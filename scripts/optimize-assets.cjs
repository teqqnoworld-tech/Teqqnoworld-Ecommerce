const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else results.push(file);
  });
  return results;
}

async function run() {
  console.log('=== Step 1: Scanning Source Code for Asset References ===');
  const codeFiles = walk('./src').concat(['./index.html', './metadata.json']);
  
  // Read all code contents
  const codeContents = {};
  let combinedCode = '';
  codeFiles.forEach(cf => {
    if (cf.endsWith('.ts') || cf.endsWith('.tsx') || cf.endsWith('.js') || cf.endsWith('.json') || cf.endsWith('.html')) {
      const content = fs.readFileSync(cf, 'utf8');
      codeContents[cf] = content;
      combinedCode += ' ' + content;
    }
  });

  const publicFiles = walk('./public');
  let totalPublicInitialBytes = 0;
  const referenced = [];
  const unreferenced = [];

  publicFiles.forEach(f => {
    const rel = path.relative('./public', f).replace(/\\/g, '/');
    const baseName = path.basename(f);
    const stat = fs.statSync(f);
    if (!stat.isFile()) return;
    totalPublicInitialBytes += stat.size;

    // Check if relative path or basename is present in any code file
    if (combinedCode.includes(rel) || combinedCode.includes(baseName)) {
      referenced.push({ fullPath: f, rel, baseName, size: stat.size });
    } else {
      unreferenced.push({ fullPath: f, rel, baseName, size: stat.size });
    }
  });

  console.log(`Initial public directory: ${(totalPublicInitialBytes / 1024 / 1024).toFixed(2)} MB in ${publicFiles.length} files`);
  console.log(`Referenced assets: ${referenced.length} files (${(referenced.reduce((s, x) => s + x.size, 0) / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Unreferenced assets: ${unreferenced.length} files (${(unreferenced.reduce((s, x) => s + x.size, 0) / 1024 / 1024).toFixed(2)} MB)`);

  console.log('\n=== Step 2: Removing Confirmed Unreferenced Assets ===');
  let deletedBytes = 0;
  unreferenced.forEach(u => {
    try {
      fs.unlinkSync(u.fullPath);
      deletedBytes += u.size;
    } catch (e) {
      console.error(`Failed to delete ${u.fullPath}:`, e.message);
    }
  });
  console.log(`Safely deleted ${unreferenced.length} unreferenced files, freeing ${(deletedBytes / 1024 / 1024).toFixed(2)} MB.`);

  console.log('\n=== Step 3: Optimizing and Converting Referenced Images to WebP ===');
  const pathReplacements = new Map(); // old web path -> new web path
  let optimizedCount = 0;
  let preOptBytes = 0;
  let postOptBytes = 0;

  for (const item of referenced) {
    const ext = path.extname(item.fullPath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      continue;
    }

    preOptBytes += item.size;
    const dir = path.dirname(item.fullPath);
    const baseWithoutExt = path.basename(item.fullPath, ext);
    const targetPath = path.join(dir, `${baseWithoutExt}.webp`);
    
    // Web paths (as used in src)
    const oldWebPath = '/' + item.rel;
    const newWebPath = '/' + path.relative('./public', targetPath).replace(/\\/g, '/');

    try {
      // Determine format and dimensions
      const metadata = await sharp(item.fullPath).metadata();
      const maxDim = 1400; // ample for crisp desktop/retina display
      let resizeOptions = {};
      if (metadata.width > maxDim || metadata.height > maxDim) {
        resizeOptions = { width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true };
      }

      let pipeline = sharp(item.fullPath);
      if (Object.keys(resizeOptions).length > 0) {
        pipeline = pipeline.resize(resizeOptions);
      }

      await pipeline
        .webp({ quality: 82, effort: 5 })
        .toFile(targetPath);

      const newStat = fs.statSync(targetPath);
      postOptBytes += newStat.size;

      pathReplacements.set(oldWebPath, newWebPath);
      // Also register basename replacements if code used basename
      pathReplacements.set(item.baseName, `${baseWithoutExt}.webp`);

      // Safely remove the original heavy file
      if (item.fullPath !== targetPath) {
        fs.unlinkSync(item.fullPath);
      }
      optimizedCount++;
    } catch (err) {
      console.warn(`Could not optimize ${item.rel}: ${err.message}. Keeping original.`);
      postOptBytes += item.size;
    }
  }

  console.log(`Converted & optimized ${optimizedCount} images to WebP.`);
  console.log(`Referenced images before: ${(preOptBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Referenced images after WebP: ${(postOptBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Saved: ${((preOptBytes - postOptBytes) / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - postOptBytes / preOptBytes) * 100)}% reduction)!`);

  console.log('\n=== Step 4: Updating Asset References in Code ===');
  let updatedFilesCount = 0;
  for (const [cf, content] of Object.entries(codeContents)) {
    let newContent = content;
    for (const [oldRef, newRef] of pathReplacements.entries()) {
      if (newContent.includes(oldRef)) {
        newContent = newContent.split(oldRef).join(newRef);
      }
    }
    if (newContent !== content) {
      fs.writeFileSync(cf, newContent, 'utf8');
      updatedFilesCount++;
      console.log(`Updated references in: ${cf}`);
    }
  }
  console.log(`Updated references in ${updatedFilesCount} source files.`);

  // Clean empty directories in public/assets if any
  function cleanEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        cleanEmptyDirs(fullPath);
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`Removed empty directory: ${fullPath}`);
        }
      }
    }
  }
  cleanEmptyDirs('./public');

  console.log('\n=== Summary of Optimization ===');
  const remainingFiles = walk('./public');
  let finalPublicBytes = 0;
  remainingFiles.forEach(f => {
    if (fs.statSync(f).isFile()) finalPublicBytes += fs.statSync(f).size;
  });
  console.log(`Final public directory size: ${(finalPublicBytes / 1024 / 1024).toFixed(2)} MB (${remainingFiles.length} files)`);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
