import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

function renderHtmlToPng(html, outputPath, width, height) {
  const tmpHtml = `/tmp/render_${Date.now()}_${Math.random().toString(36).substring(7)}.html`;
  fs.writeFileSync(tmpHtml, html, 'utf8');
  const cmd = `${CHROME_PATH} --headless --no-sandbox --disable-gpu --window-size=${width},${height} --screenshot=${outputPath} "file://${tmpHtml}"`;
  execSync(cmd, { stdio: 'pipe' });
  try { fs.unlinkSync(tmpHtml); } catch {}
}

console.log('Rendering Standee Images...');

// 1. Perfect For Features Banner (1600 x 400)
const perfectForHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { width: 1600px; height: 400px; display: flex; align-items: center; justify-content: center; background: transparent; padding: 20px; }
  .card {
    width: 100%;
    height: 100%;
    background: #ffffff;
    border-radius: 9999px;
    border: 3px solid #e2e8f0;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    padding: 24px 40px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0; width: 16px;
    background: linear-gradient(to bottom, #2563eb, #3b82f6);
    border-top-left-radius: 9999px;
    border-bottom-left-radius: 9999px;
  }
  .card::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0; width: 16px;
    background: linear-gradient(to bottom, #ea580c, #f97316);
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
  }
  .pill-title {
    background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
    color: #0b0b0d;
    font-size: 42px;
    font-style: italic;
    font-weight: 900;
    padding: 24px 38px;
    border-radius: 9999px;
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.35);
    display: flex;
    align-items: center;
    white-space: nowrap;
    letter-spacing: -0.5px;
  }
  .features-grid {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100%;
    margin-left: 20px;
  }
  .feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    padding: 0 16px;
  }
  .feature-item:not(:first-child)::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 70px;
    background: #cbd5e1;
  }
  .icon-wrap {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  .feature-text {
    font-size: 21px;
    font-weight: 900;
    color: #0b0b0d;
    line-height: 1.15;
    letter-spacing: -0.3px;
  }
</style>
</head>
<body>
<div class="card">
  <div class="pill-title">Perfect For:</div>
  <div class="features-grid">
    <!-- 1. Retail Stores -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
          <circle cx="12" cy="12" r="1.5" fill="#2563eb"/>
        </svg>
      </div>
      <div class="feature-text">Retail<br>Stores</div>
    </div>
    <!-- 2. Exhibitions & Trade Shows -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18"/>
          <path d="M4 21V9l8-5 8 5v12"/>
          <path d="M9 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
          <path d="M15 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
          <path d="M7 21v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/>
        </svg>
      </div>
      <div class="feature-text">Exhibitions<br>& Trade Shows</div>
    </div>
    <!-- 3. Events & Promotions -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <polygon points="12 12.5 13.2 15 16 15.3 14 17.2 14.5 20 12 18.6 9.5 20 10 17.2 8 15.3 10.8 15" fill="#dc2626"/>
        </svg>
      </div>
      <div class="feature-text">Events<br>& Promotions</div>
    </div>
    <!-- 4. Corporate Branding -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
          <path d="M9 22v-4h6v4"/>
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
        </svg>
      </div>
      <div class="feature-text">Corporate<br>Branding</div>
    </div>
    <!-- 5. Product Launches -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
          <path d="M3 6h18"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      </div>
      <div class="feature-text">Product<br>Launches</div>
    </div>
    <!-- 6. Marketing Campaigns -->
    <div class="feature-item">
      <div class="icon-wrap">
        <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 11 18-5v12L3 13v-2z"/>
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
          <path d="M6 8v8"/>
        </svg>
      </div>
      <div class="feature-text">Marketing<br>Campaigns</div>
    </div>
  </div>
</div>
</body>
</html>
`;

renderHtmlToPng(perfectForHtml, '/app/applet/public/assets/standee/perfect-for.png', 1600, 400);

// 2. Premium Rollup Standee Features Banner (1600 x 480)
const featuresBannerHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { width: 1600px; height: 480px; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 24px; }
  .wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 24px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    padding: 24px 32px;
  }
  .brand-logo-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-right: 32px;
    border-right: 2px solid #cbd5e1;
    min-width: 320px;
  }
  .brand-badge-blue {
    background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
    color: #ffffff;
    font-size: 54px;
    font-weight: 900;
    padding: 10px 32px;
    border-radius: 20px;
    box-shadow: 0 6px 16px rgba(29, 78, 216, 0.4);
    letter-spacing: -1px;
    text-transform: capitalize;
  }
  .brand-badge-red {
    background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
    color: #ffffff;
    font-size: 54px;
    font-weight: 900;
    padding: 8px 36px;
    border-radius: 20px;
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    letter-spacing: -1px;
    margin-top: -8px;
    border: 3px solid #ffffff;
  }
  .ribbon-yellow {
    background: linear-gradient(180deg, #facc15 0%, #eab308 100%);
    color: #0b0b0d;
    font-size: 20px;
    font-weight: 900;
    padding: 6px 28px;
    border-radius: 6px;
    box-shadow: 0 4px 10px rgba(234, 179, 8, 0.35);
    margin-top: -6px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .features-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    margin-left: 24px;
    height: 100%;
    align-items: center;
  }
  .feature-pill {
    background: #ffffff;
    border-radius: 22px;
    border: 2px solid #e2e8f0;
    padding: 20px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 90%;
    justify-content: flex-start;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }
  .icon-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
  .feature-title {
    font-size: 16px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .feature-desc {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    line-height: 1.25;
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="brand-logo-area">
    <div class="brand-badge-blue">Rollup</div>
    <div class="brand-badge-red">Standee</div>
    <div class="ribbon-yellow">Premium Quality</div>
  </div>
  <div class="features-grid">
    <!-- 1. Premium Metal Stand -->
    <div class="feature-pill" style="border-color: #d8b4fe;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #9333ea, #7e22ce);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>
      </div>
      <div class="feature-title">Premium Metal Stand</div>
      <div class="feature-desc">Strong & Durable</div>
    </div>
    <!-- 2. High-Quality Flex Printing -->
    <div class="feature-pill" style="border-color: #f472b6;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #ec4899, #db2777);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>
      <div class="feature-title">High-Quality Flex Printing</div>
      <div class="feature-desc">Vibrant & Clear</div>
    </div>
    <!-- 3. Easy to Install -->
    <div class="feature-pill" style="border-color: #93c5fd;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
      <div class="feature-title">Easy to Install</div>
      <div class="feature-desc">Quick Setup in Minutes</div>
    </div>
    <!-- 4. Lightweight & Portable -->
    <div class="feature-pill" style="border-color: #86efac;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #16a34a, #15803d);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
      </div>
      <div class="feature-title">Lightweight & Portable</div>
      <div class="feature-desc">Carry Anywhere</div>
    </div>
    <!-- 5. Carry Bag Included -->
    <div class="feature-pill" style="border-color: #fdba74;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #ea580c, #c2410c);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <div class="feature-title">Carry Bag Included</div>
      <div class="feature-desc">Easy to Transport</div>
    </div>
    <!-- 6. Ideal for Events -->
    <div class="feature-pill" style="border-color: #fca5a5;">
      <div class="icon-circle" style="background: linear-gradient(135deg, #dc2626, #b91c1c);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
      </div>
      <div class="feature-title">Ideal for</div>
      <div class="feature-desc">Events, Exhibitions, Shops & Promos</div>
    </div>
  </div>
</div>
</body>
</html>
`;

renderHtmlToPng(featuresBannerHtml, '/app/applet/public/assets/standee/features.png', 1600, 480);

// 3. Front View Infographic (1200 x 1400)
const frontInfographicHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { width: 1200px; height: 1400px; display: flex; background: #ffffff; padding: 40px; position: relative; }
  
  /* Left Dimensions Indicator */
  .left-dim-area {
    width: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .height-badge {
    border: 3px solid #ef4444;
    border-radius: 16px;
    padding: 12px 14px;
    background: #ffffff;
    text-align: center;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    z-index: 10;
  }
  .height-label { font-size: 22px; font-weight: 900; color: #0b0b0d; }
  .height-value { font-size: 32px; font-weight: 900; color: #ef4444; margin: 4px 0; }
  .height-sub { font-size: 20px; font-weight: 800; color: #0b0b0d; }
  
  .height-line {
    position: absolute;
    left: 70px;
    top: 100px;
    bottom: 120px;
    width: 3px;
    background: #ef4444;
  }
  .height-arrow-top {
    position: absolute;
    left: 65px;
    top: 90px;
    width: 0; height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 12px solid #ef4444;
  }
  .height-arrow-bottom {
    position: absolute;
    left: 65px;
    bottom: 110px;
    width: 0; height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 12px solid #ef4444;
  }
  
  /* Center Standee Area */
  .center-standee-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 0 20px;
  }
  
  /* Width Indicator */
  .width-dim-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  .width-badge {
    border: 3px solid #ef4444;
    border-radius: 14px;
    padding: 8px 24px;
    background: #ffffff;
    text-align: center;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    margin-bottom: 10px;
  }
  .width-title { font-size: 24px; font-weight: 900; color: #0b0b0d; }
  .width-highlight { color: #ef4444; font-size: 28px; }
  .width-line-row {
    display: flex;
    align-items: center;
    width: 420px;
    position: relative;
  }
  .width-arrow-left { width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 12px solid #ef4444; }
  .width-arrow-right { width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 12px solid #ef4444; }
  .width-line { flex: 1; height: 3px; background: #ef4444; }
  
  /* Standee Visual Representation */
  .standee-container {
    width: 440px;
    height: 980px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .top-rail {
    width: 440px;
    height: 30px;
    background: linear-gradient(180deg, #475569 0%, #1e293b 50%, #0f172a 100%);
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    z-index: 5;
    position: relative;
  }
  .top-rail::after {
    content: '';
    position: absolute;
    right: 8px; top: 7px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #0f172a;
    border: 2px solid #334155;
  }
  .banner-face {
    width: 420px;
    height: 870px;
    background: #111215;
    box-shadow: inset 0 10px 20px rgba(0,0,0,0.8), 0 15px 30px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 60px 30px 40px;
    position: relative;
    overflow: hidden;
  }
  
  /* Dynamic Orange/Yellow waves on banner */
  .banner-wave-1 {
    position: absolute;
    bottom: -60px;
    left: -80px;
    width: 580px;
    height: 240px;
    background: linear-gradient(135deg, #ff7a00, #ea580c);
    border-radius: 50%;
    transform: rotate(-15deg);
    opacity: 0.95;
    z-index: 1;
  }
  .banner-wave-2 {
    position: absolute;
    bottom: -40px;
    left: -40px;
    width: 500px;
    height: 180px;
    background: linear-gradient(135deg, #facc15, #f59e0b);
    border-radius: 50%;
    transform: rotate(-10deg);
    opacity: 0.9;
    z-index: 2;
  }
  
  /* Logo Artwork Box */
  .artwork-box {
    border: 4px solid #ffffff;
    border-radius: 24px;
    padding: 30px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(4px);
    z-index: 10;
    margin-top: 80px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .your-design-text {
    font-size: 54px;
    font-weight: 900;
    color: #facc15;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .brand-message-text {
    font-size: 38px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    text-align: center;
    margin-top: 30px;
    z-index: 10;
    line-height: 1.25;
  }
  
  /* Base Cassette & Feet */
  .base-cassette {
    width: 450px;
    height: 48px;
    background: linear-gradient(180deg, #334155 0%, #1e293b 40%, #0f172a 100%);
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    z-index: 5;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
  }
  .base-screw {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #0f172a;
    border: 2px solid #475569;
  }
  .base-feet-row {
    width: 430px;
    display: flex;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 4;
  }
  .foot {
    width: 70px;
    height: 14px;
    background: #0f172a;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
  }
  
  .front-view-pill {
    background: #dc2626;
    color: #ffffff;
    font-size: 24px;
    font-weight: 900;
    padding: 8px 36px;
    border-radius: 9999px;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    margin-top: 24px;
    letter-spacing: 0.5px;
  }
  
  /* Right Callout Badges */
  .right-callouts-area {
    width: 320px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding-left: 20px;
    height: 980px;
    margin-top: 90px;
  }
  .callout-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .callout-circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 5px solid #ff7a00;
    background: #ffffff;
    box-shadow: 0 8px 20px rgba(255, 122, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .callout-label {
    font-size: 24px;
    font-weight: 900;
    color: #0b0b0d;
    line-height: 1.2;
    flex: 1;
  }
</style>
</head>
<body>
  <!-- Left Dimension Area -->
  <div class="left-dim-area">
    <div class="height-arrow-top"></div>
    <div class="height-line"></div>
    <div class="height-badge">
      <div class="height-label">Height:</div>
      <div class="height-value">6 ft</div>
      <div class="height-sub">(72 inch)</div>
    </div>
    <div class="height-arrow-bottom"></div>
  </div>

  <!-- Center Standee Area -->
  <div class="center-standee-area">
    <!-- Width Dimension Box -->
    <div class="width-dim-box">
      <div class="width-badge">
        <span class="width-title">Width: </span>
        <span class="width-highlight">3 ft</span>
        <span class="width-title"> (36 inch)</span>
      </div>
      <div class="width-line-row">
        <div class="width-arrow-left"></div>
        <div class="width-line"></div>
        <div class="width-arrow-right"></div>
      </div>
    </div>

    <!-- Standee Visual -->
    <div class="standee-container">
      <div class="top-rail"></div>
      <div class="banner-face">
        <div class="artwork-box">
          <div class="your-design-text">YOUR DESIGN</div>
        </div>
        <div class="brand-message-text">YOUR BRAND<br>MESSAGE<br>HERE</div>
        <div class="banner-wave-1"></div>
        <div class="banner-wave-2"></div>
      </div>
      <div class="base-cassette">
        <div class="base-screw"></div>
        <div class="base-screw"></div>
      </div>
      <div class="base-feet-row">
        <div class="foot"></div>
        <div class="foot"></div>
      </div>
    </div>

    <div class="front-view-pill">Front View</div>
  </div>

  <!-- Right Callout Area -->
  <div class="right-callouts-area">
    <!-- 1. Top Rail -->
    <div class="callout-row">
      <div class="callout-circle">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <rect x="10" y="35" width="80" height="25" rx="5" fill="#1e293b" stroke="#334155" stroke-width="2"/>
          <circle cx="80" cy="47" r="7" fill="#0f172a" stroke="#475569" stroke-width="2"/>
          <line x1="15" y1="60" x2="85" y2="60" stroke="#111827" stroke-width="6"/>
        </svg>
      </div>
      <div class="callout-label">Top Rail</div>
    </div>

    <!-- 2. Support Pole -->
    <div class="callout-row">
      <div class="callout-circle">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <rect x="42" y="10" width="16" height="80" rx="3" fill="#1e293b"/>
          <rect x="36" y="40" width="28" height="22" rx="4" fill="#0f172a" stroke="#475569" stroke-width="2"/>
          <line x1="36" y1="51" x2="64" y2="51" stroke="#334155" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="callout-label">Support Pole</div>
    </div>

    <!-- 3. Base Stand -->
    <div class="callout-row">
      <div class="callout-circle">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <rect x="15" y="30" width="70" height="40" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"/>
          <circle cx="28" cy="42" r="4" fill="#0f172a"/>
          <circle cx="72" cy="42" r="4" fill="#0f172a"/>
          <circle cx="28" cy="58" r="4" fill="#0f172a"/>
          <circle cx="72" cy="58" r="4" fill="#0f172a"/>
        </svg>
      </div>
      <div class="callout-label">Base Stand</div>
    </div>

    <!-- 4. Stable Feet -->
    <div class="callout-row">
      <div class="callout-circle">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <path d="M20 70 L80 70 L70 82 L15 82 Z" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <rect x="35" y="45" width="45" height="25" rx="3" fill="#1e293b"/>
          <circle cx="28" cy="76" r="3" fill="#475569"/>
        </svg>
      </div>
      <div class="callout-label">Stable Feet</div>
    </div>
  </div>
</body>
</html>
`;

renderHtmlToPng(frontInfographicHtml, '/app/applet/public/assets/standee/front.png', 1200, 1400);

// 4. Back View of Black Retractable Banner Stand (1000 x 1500)
const backViewHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body {
    width: 1000px;
    height: 1500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    padding: 40px;
  }
  .standee-back-wrap {
    width: 580px;
    height: 1300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .back-top-rail {
    width: 560px;
    height: 36px;
    background: linear-gradient(180deg, #475569 0%, #1e293b 50%, #0f172a 100%);
    border-radius: 8px;
    box-shadow: 0 6px 14px rgba(0,0,0,0.35);
    z-index: 5;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .top-clamp-hook {
    width: 24px;
    height: 14px;
    background: #0f172a;
    border: 2px solid #64748b;
    border-radius: 4px;
  }
  .back-banner-surface {
    width: 530px;
    height: 1140px;
    background: linear-gradient(90deg, #18191d 0%, #111215 45%, #15161a 55%, #0d0e11 100%);
    box-shadow: 0 15px 35px rgba(0,0,0,0.25);
    position: relative;
    display: flex;
    justify-content: center;
  }
  /* Vertical telescoping support pole running down the back */
  .center-pole {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 24px;
    background: linear-gradient(90deg, #64748b 0%, #1e293b 35%, #0f172a 75%, #334155 100%);
    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    z-index: 10;
  }
  .pole-collar-1 {
    position: absolute;
    top: 360px;
    width: 36px;
    height: 48px;
    border-radius: 6px;
    background: linear-gradient(180deg, #334155, #0f172a);
    border: 2px solid #64748b;
    z-index: 15;
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  }
  .pole-collar-2 {
    position: absolute;
    top: 720px;
    width: 36px;
    height: 48px;
    border-radius: 6px;
    background: linear-gradient(180deg, #334155, #0f172a);
    border: 2px solid #64748b;
    z-index: 15;
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  }
  
  /* Base Cassette */
  .back-base-cassette {
    width: 580px;
    height: 60px;
    background: linear-gradient(180deg, #334155 0%, #1e293b 45%, #0f172a 100%);
    border-radius: 14px;
    box-shadow: 0 12px 25px rgba(0,0,0,0.45);
    z-index: 5;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pole-socket {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #0f172a;
    border: 3px solid #64748b;
  }
  .back-feet-row {
    width: 540px;
    display: flex;
    justify-content: space-between;
    padding: 0 50px;
    z-index: 4;
  }
  .back-foot {
    width: 90px;
    height: 18px;
    background: #0f172a;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    box-shadow: 0 6px 12px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <div class="standee-back-wrap">
    <div class="back-top-rail">
      <div class="top-clamp-hook"></div>
    </div>
    <div class="back-banner-surface">
      <div class="center-pole"></div>
      <div class="pole-collar-1"></div>
      <div class="pole-collar-2"></div>
    </div>
    <div class="back-base-cassette">
      <div class="pole-socket"></div>
    </div>
    <div class="back-feet-row">
      <div class="back-foot"></div>
      <div class="back-foot"></div>
    </div>
  </div>
</body>
</html>
`;

renderHtmlToPng(backViewHtml, '/app/applet/public/assets/standee/back.png', 1000, 1500);

// Also copy with exact uploaded filenames
fs.copyFileSync('/app/applet/public/assets/standee/front.png', '/app/applet/public/assets/standee/Retractable Banner Stand Infographic.png');
fs.copyFileSync('/app/applet/public/assets/standee/back.png', '/app/applet/public/assets/standee/Back View of Black Retractable Banner Stand.png');
fs.copyFileSync('/app/applet/public/assets/standee/features.png', '/app/applet/public/assets/standee/Premium Rollup Standee Features.png');
fs.copyFileSync('/app/applet/public/assets/standee/perfect-for.png', '/app/applet/public/assets/standee/Perfect For Features Banner.png');

// Also copy to public/assets/aistudio/ for compatibility
fs.copyFileSync('/app/applet/public/assets/standee/front.png', '/app/applet/public/assets/aistudio/Retractable_Banner_Stand_Infographic.png');
fs.copyFileSync('/app/applet/public/assets/standee/back.png', '/app/applet/public/assets/aistudio/Back_View_of_Black_Retractable_Banner_Stand.png');
fs.copyFileSync('/app/applet/public/assets/standee/features.png', '/app/applet/public/assets/aistudio/Premium_Rollup_Standee_Features.png');
fs.copyFileSync('/app/applet/public/assets/standee/perfect-for.png', '/app/applet/public/assets/aistudio/Perfect_For_Features_Banner.png');

console.log('All standee assets successfully rendered and saved!');
