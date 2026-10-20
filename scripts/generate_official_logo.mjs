import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// SVG: Symmetrical Emerald-Gold Mosque inside a Rounded Emerald Container with Gold Border Accent
const officialLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <defs>
    <!-- Background Box Gradients (Deep Emerald with Gold Border) -->
    <linearGradient id="bgDeepEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065F46" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>

    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <!-- Mosque Emerald Gradients -->
    <linearGradient id="mosqueEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="40%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="mosqueDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064E3B" />
    </linearGradient>
    <linearGradient id="mosqueLight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>

    <!-- Gold Gradients -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="45%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="goldBright" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF9C3" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="goldDoorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <filter id="shadowBox" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#022c22" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- ROUNDED EMERALD CONTAINER -->
  <rect x="24" y="24" width="464" height="464" rx="104" 
        fill="url(#bgDeepEmerald)" 
        stroke="url(#goldBorder)" stroke-width="6" 
        filter="url(#shadowBox)" />

  <!-- Subtle Inner Container Ambient Rim -->
  <rect x="34" y="34" width="444" height="444" rx="94" 
        fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />

  <!-- MOSQUE ICON CENTERED (SCALE & POSITIONED HARMONIOUSLY) -->
  <g transform="translate(256, 260) scale(0.74) translate(-256, -260)">
    <!-- 1. BASE STEPS AND PLINTH -->
    <rect x="76" y="454" width="360" height="12" rx="4" fill="url(#mosqueDark)" />
    <rect x="92" y="440" width="328" height="14" rx="3" fill="url(#mosqueEmerald)" />
    <rect x="88" y="436" width="336" height="4" rx="2" fill="url(#goldGrad)" />

    <!-- 2. MAIN BUILDING BODY -->
    <rect x="136" y="270" width="240" height="166" rx="4" fill="url(#mosqueEmerald)" />
    <rect x="120" y="300" width="272" height="136" rx="3" fill="url(#mosqueDark)" opacity="0.95" />

    <!-- Upper Gold Trim Band -->
    <rect x="132" y="266" width="248" height="6" rx="2" fill="url(#goldGrad)" />
    <!-- Battlements -->
    <g fill="url(#goldBright)">
      <polygon points="144,266 148,258 152,266" />
      <polygon points="160,266 164,258 168,266" />
      <polygon points="176,266 180,258 184,266" />
      <polygon points="328,266 332,258 336,266" />
      <polygon points="344,266 348,258 352,266" />
      <polygon points="360,266 364,258 368,266" />
    </g>

    <!-- 3. SIDE DOMES -->
    <path d="M 142 266 C 142 224 162 208 174 196 C 186 208 206 224 206 266 Z" fill="url(#mosqueDark)" />
    <rect x="172" y="180" width="4" height="16" rx="2" fill="url(#goldGrad)" />
    <circle cx="174" cy="178" r="3" fill="url(#goldBright)" />

    <path d="M 306 266 C 306 224 326 208 338 196 C 350 208 370 224 370 266 Z" fill="url(#mosqueDark)" />
    <rect x="336" y="180" width="4" height="16" rx="2" fill="url(#goldGrad)" />
    <circle cx="338" cy="178" r="3" fill="url(#goldBright)" />

    <!-- 4. GRAND CENTRAL DOME -->
    <path d="M 184 266 L 194 242 L 318 242 L 328 266 Z" fill="url(#mosqueDark)" />
    <rect x="190" y="238" width="132" height="6" rx="2" fill="url(#goldGrad)" />

    <path d="M 184 242 C 160 216 172 168 214 136 C 238 116 252 88 256 74 C 260 88 274 116 298 136 C 340 168 352 216 328 242 Z" 
          fill="url(#mosqueEmerald)" />

    <path d="M 214 136 C 234 120 248 98 256 80 C 252 98 240 126 226 148 C 196 190 196 222 202 242 C 188 234 180 206 196 174 C 202 160 208 146 214 136 Z" 
          fill="url(#mosqueLight)" opacity="0.65" />

    <path d="M 256 80 C 256 120 238 180 220 238" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9" />
    <path d="M 256 80 C 256 120 274 180 292 238" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9" />

    <!-- Spire and Crescent -->
    <rect x="254" y="48" width="4" height="28" rx="2" fill="url(#goldGrad)" />
    <circle cx="256" cy="68" r="4.5" fill="url(#goldBright)" />
    <circle cx="256" cy="54" r="3.5" fill="url(#goldBright)" />
    <path d="M 256 22 C 267 22 276 30 276 41 C 276 52 267 60 256 60 C 251 60 246 58 243 55 C 248 53 252 48 252 41 C 252 34 248 29 243 27 C 246 24 251 22 256 22 Z" fill="url(#goldBright)" />
    <polygon points="266,32 268,36 272,36 269,38 270,42 266,40 262,42 263,38 260,36 264,36" fill="url(#goldBright)" />

    <!-- 5. GRAND CENTRAL PORTAL -->
    <path d="M 210 436 L 210 354 C 210 318 238 292 256 280 C 274 292 302 318 302 354 L 302 436 Z" fill="url(#goldGrad)" />
    <path d="M 218 436 L 218 358 C 218 326 242 302 256 292 C 270 302 294 326 294 358 L 294 436 Z" fill="url(#mosqueDark)" />
    <path d="M 226 436 L 226 366 C 226 338 246 318 256 310 C 266 318 286 338 286 366 L 286 436 Z" fill="url(#goldDoorGlow)" />
    <line x1="256" y1="316" x2="256" y2="436" stroke="#78350F" stroke-width="2" />
    <path d="M 240 376 C 248 370 264 370 272 376" stroke="#92400E" stroke-width="2" stroke-linecap="round" fill="none" />
    <path d="M 240 406 C 248 400 264 400 272 406" stroke="#92400E" stroke-width="2" stroke-linecap="round" fill="none" />

    <!-- Side Arched Windows -->
    <path d="M 152 384 L 152 334 C 152 320 162 310 170 304 C 178 310 188 320 188 334 L 188 384 Z" fill="url(#goldGrad)" opacity="0.95" />
    <path d="M 156 382 L 156 336 C 156 324 164 316 170 312 C 176 316 184 324 184 336 L 184 382 Z" fill="url(#goldBright)" />

    <path d="M 324 384 L 324 334 C 324 320 334 310 342 304 C 350 310 360 320 360 334 L 360 384 Z" fill="url(#goldGrad)" opacity="0.95" />
    <path d="M 328 382 L 328 336 C 328 324 336 316 342 312 C 348 316 356 324 356 336 L 356 382 Z" fill="url(#goldBright)" />

    <!-- 6. TWIN MINARETS -->
    <!-- Left Minaret -->
    <rect x="84" y="196" width="24" height="240" fill="url(#mosqueEmerald)" />
    <rect x="84" y="196" width="5" height="240" fill="url(#mosqueLight)" opacity="0.6" />
    <rect x="80" y="324" width="32" height="6" rx="2" fill="url(#goldGrad)" />
    <path d="M 91 306 L 91 278 C 91 273 94 270 96 268 C 98 270 101 273 101 278 L 101 306 Z" fill="url(#goldBright)" />
    <path d="M 91 386 L 91 358 C 91 353 94 350 96 348 C 98 350 101 353 101 358 L 101 386 Z" fill="url(#goldBright)" />
    <rect x="74" y="190" width="44" height="8" rx="2" fill="url(#goldGrad)" />
    <rect x="78" y="184" width="36" height="6" rx="1" fill="url(#mosqueDark)" />
    <path d="M 82 184 L 96 118 L 110 184 Z" fill="url(#mosqueEmerald)" />
    <path d="M 82 184 L 96 118 L 96 184 Z" fill="url(#mosqueLight)" opacity="0.5" />
    <rect x="94.5" y="96" width="3" height="22" rx="1" fill="url(#goldGrad)" />
    <circle cx="96" cy="108" r="3" fill="url(#goldBright)" />
    <path d="M 96 90 C 101 90 105 94 105 99 C 105 104 101 108 96 108 C 93.5 108 91.5 107 90 105.5 C 92.5 104.5 94.5 102 94.5 99 C 94.5 96 92.5 93.5 90 92.5 C 91.5 91 93.5 90 96 90 Z" fill="url(#goldBright)" />

    <!-- Right Minaret -->
    <rect x="404" y="196" width="24" height="240" fill="url(#mosqueEmerald)" />
    <rect x="404" y="196" width="5" height="240" fill="url(#mosqueLight)" opacity="0.6" />
    <rect x="400" y="324" width="32" height="6" rx="2" fill="url(#goldGrad)" />
    <path d="M 411 306 L 411 278 C 411 273 414 270 416 268 C 418 270 421 273 421 278 L 421 306 Z" fill="url(#goldBright)" />
    <path d="M 411 386 L 411 358 C 411 353 414 350 416 348 C 418 350 421 353 421 358 L 421 386 Z" fill="url(#goldBright)" />
    <rect x="394" y="190" width="44" height="8" rx="2" fill="url(#goldGrad)" />
    <rect x="398" y="184" width="36" height="6" rx="1" fill="url(#mosqueDark)" />
    <path d="M 402 184 L 416 118 L 430 184 Z" fill="url(#mosqueEmerald)" />
    <path d="M 402 184 L 416 118 L 416 184 Z" fill="url(#mosqueLight)" opacity="0.5" />
    <rect x="414.5" y="96" width="3" height="22" rx="1" fill="url(#goldGrad)" />
    <circle cx="416" cy="108" r="3" fill="url(#goldBright)" />
    <path d="M 416 90 C 421 90 425 94 425 99 C 425 104 421 108 416 108 C 413.5 108 411.5 107 410 105.5 C 412.5 104.5 414.5 102 414.5 99 C 414.5 96 412.5 93.5 410 92.5 C 411.5 91 413.5 90 416 90 Z" fill="url(#goldBright)" />

    <!-- 7. CENTER ROSETTE -->
    <g transform="translate(256, 260) scale(0.9)">
      <polygon points="0,-11 3,-3 11,0 3,3 0,11 -3,3 -11,0 -3,-3" fill="url(#goldBright)" />
      <circle cx="0" cy="0" r="3" fill="url(#mosqueDark)" />
    </g>
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve('public');
  const assetsDir = path.resolve('public/assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Write official SVGs
  fs.writeFileSync(path.join(publicDir, 'logo-simka.svg'), officialLogoSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-simka.svg'), officialLogoSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-simka-mosque.svg'), officialLogoSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-simka-mosque.svg'), officialLogoSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon-simka.svg'), officialLogoSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), officialLogoSvg);

  // 2. Render 512x512 High-Res PNG
  const resvg512 = new Resvg(officialLogoSvg, {
    fitTo: { mode: 'width', value: 512 }
  });
  const png512 = resvg512.render().asPng();

  fs.writeFileSync(path.join(publicDir, 'logo-simka.png'), png512);
  fs.writeFileSync(path.join(assetsDir, 'logo-simka.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'logo-simka-mosque.png'), png512);
  fs.writeFileSync(path.join(assetsDir, 'logo-simka-mosque.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'logo-nuris.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'LOGO NURIS KOTAK tanpa tulisan.png'), png512);

  // 3. Multi-resolution favicon PNGs
  const sizes = [16, 32, 48, 64, 180, 192, 512];
  const pngBuffers = {};

  for (const s of sizes) {
    const resvg = new Resvg(officialLogoSvg, {
      fitTo: { mode: 'width', value: s }
    });
    const buf = resvg.render().asPng();
    pngBuffers[s] = buf;

    if (s === 16) {
      fs.writeFileSync(path.join(publicDir, 'favicon-simka-16x16.png'), buf);
      fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), buf);
    } else if (s === 32) {
      fs.writeFileSync(path.join(publicDir, 'favicon-simka-32x32.png'), buf);
      fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buf);
      fs.writeFileSync(path.join(publicDir, 'favicon.png'), buf);
    } else if (s === 180) {
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf);
    }
  }

  // 4. Windows/Chrome multi-res favicon.ico
  const icoSizes = [16, 32, 48];
  const headerLen = 6;
  const dirEntryLen = 16;
  const count = icoSizes.length;
  let offset = headerLen + dirEntryLen * count;

  const header = Buffer.alloc(headerLen);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // count of images

  const dirEntries = [];
  const imageBuffers = [];

  for (const s of icoSizes) {
    const imgBuf = pngBuffers[s];
    imageBuffers.push(imgBuf);

    const entry = Buffer.alloc(dirEntryLen);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(imgBuf.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // image offset

    dirEntries.push(entry);
    offset += imgBuf.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // Clean up test file if exists
  const testPath = path.join(publicDir, 'test_deep.png');
  if (fs.existsSync(testPath)) {
    fs.unlinkSync(testPath);
  }

  console.log('✅ Generated official logo-simka.png, logo-simka.svg, and favicons successfully!');
}

run().catch(console.error);
