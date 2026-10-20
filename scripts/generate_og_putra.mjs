import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// Read the exact mosque rounded box logo SVG content
const logoSvgPath = path.resolve('public/logo-simka.svg');
const logoSvgContent = fs.readFileSync(logoSvgPath, 'utf8');

// Extract defs and body from logo-simka.svg to embed cleanly without conflicts
const defsMatch = logoSvgContent.match(/<defs>([\s\S]*?)<\/defs>/);
const logoDefs = defsMatch ? defsMatch[1] : '';

// Extract the content inside svg excluding <defs>
const logoBody = logoSvgContent
  .replace(/<\?xml[\s\S]*?\?>/, '')
  .replace(/<svg[\s\S]*?>/, '')
  .replace(/<\/svg>/, '')
  .replace(/<defs>[\s\S]*?<\/defs>/, '');

const ogWidth = 1200;
const ogHeight = 630;

// Generate Islamic geometric background star patterns
function generateIslamicStars() {
  let stars = '';
  const stepX = 150;
  const stepY = 150;
  for (let x = 75; x < ogWidth; x += stepX) {
    for (let y = 75; y < ogHeight; y += stepY) {
      stars += `
        <g transform="translate(${x}, ${y}) scale(0.7)" stroke="#10B981" stroke-width="1.2" fill="none" opacity="0.08">
          <polygon points="0,-40 28,-28 40,0 28,28 0,40 -28,28 -40,0 -28,-28" />
          <polygon points="0,-40 28,28 -40,0 40,0 -28,28 0,-40" />
          <polygon points="0,40 28,-28 -40,0 40,0 -28,-28 0,40" />
          <circle cx="0" cy="0" r="16" />
          <circle cx="0" cy="0" r="4" fill="#F59E0B" opacity="0.15" />
        </g>
      `;
    }
  }
  return stars;
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ogWidth} ${ogHeight}" width="${ogWidth}" height="${ogHeight}">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022C22" />
      <stop offset="35%" stop-color="#064E3B" />
      <stop offset="70%" stop-color="#022C22" />
      <stop offset="100%" stop-color="#011813" />
    </linearGradient>

    <radialGradient id="ogGlow" cx="25%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#059669" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#047857" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#022C22" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="ogGoldGlow" cx="75%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.15" />
      <stop offset="60%" stop-color="#D97706" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#022C22" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="ogGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="30%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#78350F" />
    </linearGradient>

    <linearGradient id="ogGoldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#FBBF24" />
    </linearGradient>

    <linearGradient id="ogGoldBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="40%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <filter id="ogShadowLogo" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#011813" flood-opacity="0.65" />
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#047857" flood-opacity="0.4" />
    </filter>

    <!-- Original Logo Definitions -->
    ${logoDefs}
  </defs>

  <!-- Base Canvas Background -->
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogBg)" />
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogGlow)" />
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogGoldGlow)" />

  <!-- Islamic Arabesque Star Pattern Layer -->
  <g>${generateIslamicStars()}</g>

  <!-- Luxury Outer Frame -->
  <rect x="20" y="20" width="1160" height="590" rx="28" fill="none" stroke="url(#ogGoldBorder)" stroke-width="2.5" opacity="0.65" />
  <rect x="28" y="28" width="1144" height="574" rx="22" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" />

  <!-- Corner Ornamental Flourishes -->
  <g stroke="url(#ogGoldBorder)" stroke-width="2" fill="none" opacity="0.8">
    <!-- Top-Left -->
    <path d="M 44 64 L 64 44 M 44 76 L 76 44" />
    <circle cx="56" cy="56" r="3" fill="#F59E0B" />
    <!-- Top-Right -->
    <path d="M 1156 64 L 1136 44 M 1156 76 L 1124 44" />
    <circle cx="1144" cy="56" r="3" fill="#F59E0B" />
    <!-- Bottom-Left -->
    <path d="M 44 566 L 64 586 M 44 554 L 76 586" />
    <circle cx="56" cy="574" r="3" fill="#F59E0B" />
    <!-- Bottom-Right -->
    <path d="M 1156 566 L 1136 586 M 1156 554 L 1124 586" />
    <circle cx="1144" cy="574" r="3" fill="#F59E0B" />
  </g>

  <!-- ================= LEFT: OFFICIAL SIMKA.ID MOSQUE LOGO ================= -->
  <g transform="translate(70, 115) scale(0.78)" filter="url(#ogShadowLogo)">
    ${logoBody}
  </g>

  <!-- ================= RIGHT: BRANDING & TITLE CONTENT ================= -->
  <!-- Top Badges / Chips Row -->
  <g transform="translate(500, 95)">
    <!-- Badge 1: KAMPUS PUTRA RESMI -->
    <rect x="0" y="0" width="230" height="38" rx="19" fill="#042F2E" stroke="#F59E0B" stroke-width="1.5" />
    <circle cx="20" cy="19" r="5" fill="#10B981" />
    <text x="34" y="25" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="13" fill="#FEF08A" letter-spacing="2px">KAMPUS PUTRA • RESMI</text>

    <!-- Badge 2: SISTEM AKHLAK & KARAKTER -->
    <rect x="245" y="0" width="220" height="38" rx="19" fill="#064E3B" stroke="#34D399" stroke-width="1.5" opacity="0.9" />
    <text x="355" y="24" text-anchor="middle" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="12.5" fill="#A7F3D0" letter-spacing="1px">PRO V1 • PEMBINAAN</text>
  </g>

  <!-- Main Headline: SIMKA.ID + PUTRA Badge -->
  <g transform="translate(500, 195)">
    <text x="0" y="0" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="68" fill="#FFFFFF" letter-spacing="1px">
      SIMKA<tspan fill="#34D399">.ID</tspan>
    </text>

    <!-- PUTRA Badge -->
    <g transform="translate(330, -56)">
      <rect x="0" y="0" width="160" height="58" rx="16" fill="url(#ogGoldBadge)" stroke="#FFFFFF" stroke-width="2" />
      <text x="80" y="38" text-anchor="middle" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="28" fill="#022C22" letter-spacing="3px">PUTRA</text>
    </g>
  </g>

  <!-- Subtitle -->
  <text x="500" y="245" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="21" fill="#6EE7B7" letter-spacing="1.5px">
    SISTEM MONITORING KARAKTER &amp; AKHLAK SANTRI PUTRA
  </text>

  <!-- Pesantren Name -->
  <text x="500" y="285" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="20" fill="url(#ogGoldText)" letter-spacing="3.5px">
    PESANTREN NURUL ISLAM TENGARAN
  </text>

  <!-- Golden Accent Divider Line -->
  <g transform="translate(500, 310)">
    <rect x="0" y="0" width="630" height="2" rx="1" fill="url(#ogGoldBorder)" opacity="0.85" />
    <circle cx="0" cy="1" r="3.5" fill="#F59E0B" />
    <circle cx="630" cy="1" r="3.5" fill="#F59E0B" />
  </g>

  <!-- Description paragraph (2 lines) -->
  <text x="500" y="348" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="500" font-size="17" fill="#E2E8F0">
    Dashboard administrasi monitoring pelanggaran, pembinaan akhlak,
  </text>
  <text x="500" y="376" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="500" font-size="17" fill="#CBD5E1">
    dan disiplin karakter santri putra Pesantren Nurul Islam Tengaran.
  </text>

  <!-- Feature Pill Tags Row -->
  <g transform="translate(500, 420)">
    <!-- Tag 1: Catat & Rekap Kasus -->
    <rect x="0" y="0" width="195" height="38" rx="10" fill="#042F2E" stroke="#059669" stroke-width="1.2" />
    <g transform="translate(14, 11)">
      <circle cx="8" cy="8" r="8" fill="#065F46" />
      <path d="M 4 8 L 7 11 L 12 5" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
    <text x="38" y="24" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="#A7F3D0">Catat &amp; Rekap Kasus</text>

    <!-- Tag 2: Mutaba'ah Santri Putra -->
    <rect x="210" y="0" width="220" height="38" rx="10" fill="#042F2E" stroke="#059669" stroke-width="1.2" />
    <g transform="translate(224, 11)">
      <circle cx="8" cy="8" r="8" fill="#065F46" />
      <path d="M 4 8 L 7 11 L 12 5" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
    <text x="248" y="24" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="#A7F3D0">Mutaba'ah Santri Putra</text>

    <!-- Tag 3: Database Terpadu -->
    <rect x="445" y="0" width="185" height="38" rx="10" fill="#042F2E" stroke="#059669" stroke-width="1.2" />
    <g transform="translate(459, 11)">
      <circle cx="8" cy="8" r="8" fill="#065F46" />
      <path d="M 4 8 L 7 11 L 12 5" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
    <text x="483" y="24" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="#A7F3D0">Database Terpadu</text>
  </g>

  <!-- Bottom Website / Domain Bar -->
  <g transform="translate(500, 520)">
    <rect x="0" y="0" width="630" height="48" rx="14" fill="#021C16" stroke="#064E3B" stroke-width="1.5" />
    
    <g transform="translate(20, 30)">
      <circle cx="10" cy="-6" r="6" fill="#10B981" />
      <text x="26" y="0" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="17" fill="#34D399" letter-spacing="1px">
        simka-putra.vercel.app
      </text>
    </g>

    <text x="610" y="30" text-anchor="end" font-family="Liberation Sans, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="#F59E0B" letter-spacing="1.5px">
      PORTAL RESMI PUTRA
    </text>
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  const targetPng = path.join(publicDir, 'og-simka-putra.png');
  const targetSvg = path.join(publicDir, 'og-simka-putra.svg');

  // Save SVG
  fs.writeFileSync(targetSvg, ogSvg, 'utf8');

  // Render to 1200x630 PNG via Resvg
  const resvg = new Resvg(ogSvg, {
    fitTo: { mode: 'width', value: 1200 }
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(targetPng, pngBuffer);

  console.log(`✅ Successfully generated og-simka-putra.png (${pngBuffer.length} bytes) at ${targetPng}`);
}

main().catch(console.error);
