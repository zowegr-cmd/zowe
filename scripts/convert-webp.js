// scripts/convert-webp.js
// Convertit tous les JPEG de public/images/galerie/ en WebP (qualité 85%).
// Les JPG originaux sont conservés comme fallback.
// Usage : node scripts/convert-webp.js

import sharp from 'sharp';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_DIR  = path.join(__dirname, '..', 'public', 'images', 'galerie');
const QUALITY    = 85;

async function convert() {
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => /\.(jpg|jpeg)$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
    });

  if (!files.length) {
    console.log('Aucun fichier JPEG trouvé dans', INPUT_DIR);
    return;
  }

  console.log(`Conversion de ${files.length} images en WebP (qualité ${QUALITY}%)…\n`);

  let ok = 0, skip = 0;

  for (const file of files) {
    const src  = path.join(INPUT_DIR, file);
    const dest = path.join(INPUT_DIR, file.replace(/\.(jpg|jpeg)$/i, '.webp'));

    if (fs.existsSync(dest)) {
      console.log(`  ⏭  ${file} → déjà converti`);
      skip++;
      continue;
    }

    try {
      const info = await sharp(src)
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(dest);

      const srcKb  = Math.round(fs.statSync(src).size  / 1024);
      const destKb = Math.round(info.size / 1024);
      const gain   = Math.round((1 - info.size / fs.statSync(src).size) * 100);

      console.log(`  ✓  ${file.padEnd(12)} → ${path.basename(dest).padEnd(16)} ${String(srcKb).padStart(5)}KB → ${String(destKb).padStart(5)}KB  (−${gain}%)`);
      ok++;
    } catch (e) {
      console.error(`  ✗  ${file}: ${e.message}`);
    }
  }

  console.log(`\nTerminé : ${ok} converti(s), ${skip} ignoré(s).`);
}

convert().catch(err => { console.error(err); process.exit(1); });
