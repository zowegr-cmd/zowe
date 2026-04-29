import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const GET: APIRoute = async () => {
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#0F0F0F"/>
      <stop offset="55%"  stop-color="#2A0A10"/>
      <stop offset="100%" stop-color="#1A0508"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Filets latéraux bordeaux -->
  <rect x="0"    y="0" width="3" height="630" fill="#6B1F2A" opacity="0.55"/>
  <rect x="1197" y="0" width="3" height="630" fill="#6B1F2A" opacity="0.55"/>

  <!-- Label haut -->
  <text
    x="80" y="78"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12" letter-spacing="5"
    fill="#C9A96E" opacity="0.5"
  >KINÉSITHÉRAPEUTE · RHODE-SAINT-GENÈSE</text>

  <!-- ZOWE -->
  <text
    x="600" y="318"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-style="italic" font-size="200"
    fill="#C9A96E"
  >ZOWE</text>

  <!-- Séparateur or -->
  <rect x="550" y="355" width="100" height="1" fill="#C9A96E" opacity="0.4"/>

  <!-- Tagline -->
  <text
    x="600" y="405"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="19" letter-spacing="3"
    fill="#F5F0E8" opacity="0.45"
  >KINÉSITHÉRAPIE DE HAUTE PRÉCISION · MÉTHODE BELTRA</text>

  <!-- URL bas droite -->
  <text
    x="1120" y="600"
    text-anchor="end"
    font-family="Arial, sans-serif"
    font-size="12" letter-spacing="1"
    fill="#C9A96E" opacity="0.25"
  >zowe.netlify.app</text>
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
