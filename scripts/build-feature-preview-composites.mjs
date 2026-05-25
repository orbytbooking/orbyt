/**
 * Build marketing-style feature previews (cosmic background + desktop + iPhone mockup)
 * from raw system screenshots in public/images/_captures/.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { access } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const imagesDir = path.join(root, 'public', 'images');
const capturesDir = path.join(imagesDir, '_captures');

const OUTPUT_WIDTH = 1250;
const OUTPUT_HEIGHT = 571;

/** Thin uniform bezels — iPhone 17 Pro Max–style */
const BEZEL = 4;

/** iPhone 17 Pro Max proportions: edge-to-edge display, floating Dynamic Island */
const IPHONE = {
  width: 262,
  height: 536,
  screenX: BEZEL,
  screenY: BEZEL,
  screenW: 262 - BEZEL * 2,
  screenH: 536 - BEZEL * 2,
  radius: 38,
  screenRadius: 30,
  frameFill: '#141416',
  frameStroke: '#3d3d42',
};

/** Dynamic Island — sits on the display, not in a thick top chin */
const DYNAMIC_ISLAND = {
  width: 84,
  height: 22,
  offsetY: 10,
};

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function framePanel(inputPath, width, height) {
  const resized = await sharp(inputPath)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const radius = 14;
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );

  return sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

/** iPhone chassis: thin equal bezels, screen cutout (Dynamic Island floats on display) */
async function createIPhoneFramePng() {
  const { width, height, screenX, screenY, screenW, screenH, radius, screenRadius, frameFill, frameStroke } =
    IPHONE;
  const sr = screenRadius;

  const chassis = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="titanium" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1e22"/>
          <stop offset="50%" stop-color="#141416"/>
          <stop offset="100%" stop-color="#252528"/>
        </linearGradient>
        <filter id="shadow" x="-12%" y="-6%" width="124%" height="118%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.38"/>
        </filter>
      </defs>
      <path fill="url(#titanium)" fill-rule="evenodd" filter="url(#shadow)" stroke="${frameStroke}" stroke-width="1" d="
        M${radius},0.5 H${width - radius - 0.5} Q${width - 0.5},0.5 ${width - 0.5},${radius}
        V${height - radius - 0.5} Q${width - 0.5},${height - 0.5} ${width - radius - 0.5},${height - 0.5}
        H${radius + 0.5} Q0.5,${height - 0.5} 0.5,${height - radius - 0.5}
        V${radius + 0.5} Q0.5,0.5 ${radius + 0.5},0.5 Z
        M${screenX + sr},${screenY}
        H${screenX + screenW - sr}
        Q${screenX + screenW},${screenY} ${screenX + screenW},${screenY + sr}
        V${screenY + screenH - sr}
        Q${screenX + screenW},${screenY + screenH} ${screenX + screenW - sr},${screenY + screenH}
        H${screenX + sr}
        Q${screenX},${screenY + screenH} ${screenX},${screenY + screenH - sr}
        V${screenY + sr}
        Q${screenX},${screenY} ${screenX + sr},${screenY} Z"/>
    </svg>`
  );

  return sharp(chassis).png().toBuffer();
}

/** Dynamic Island pill — floats on display glass (iPhone 17 Pro style) */
async function createDynamicIslandPng() {
  const { width, height } = DYNAMIC_ISLAND;
  const rx = height / 2;
  const cameraCx = width - 16;
  const cameraCy = height / 2;

  const island = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${rx}" fill="#000000"/>
      <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx - 0.5}" fill="#050505"/>
      <circle cx="${cameraCx}" cy="${cameraCy}" r="4.5" fill="#1a1a20"/>
      <circle cx="${cameraCx}" cy="${cameraCy}" r="2" fill="#3a3a48"/>
    </svg>`
  );

  return sharp(island).png().toBuffer();
}

let iphoneFrameCache = null;
let dynamicIslandCache = null;

/** Place mobile screenshot inside iPhone frame (screen stays visible) */
async function frameIPhone(inputPath) {
  const { width, height, screenX, screenY, screenW, screenH } = IPHONE;

  if (!iphoneFrameCache) {
    iphoneFrameCache = await createIPhoneFramePng();
  }
  if (!dynamicIslandCache) {
    dynamicIslandCache = await createDynamicIslandPng();
  }

  const screen = await sharp(inputPath)
    .resize(screenW, screenH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const screenMask = Buffer.from(
    `<svg width="${screenW}" height="${screenH}">
      <rect width="${screenW}" height="${screenH}" rx="${IPHONE.screenRadius}" ry="${IPHONE.screenRadius}" fill="white"/>
    </svg>`
  );

  const clippedScreen = await sharp(screen)
    .composite([{ input: screenMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const islandLeft = Math.round(screenX + (screenW - DYNAMIC_ISLAND.width) / 2);
  const islandTop = screenY + DYNAMIC_ISLAND.offsetY;

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: clippedScreen, left: screenX, top: screenY },
      { input: iphoneFrameCache, left: 0, top: 0 },
      { input: dynamicIslandCache, left: islandLeft, top: islandTop },
    ])
    .png()
    .toBuffer();
}

async function buildComposite({
  desktopCapture,
  mobileCapture,
  outputName,
  desktopBox = { left: 48, top: 42, width: 820, height: 488 },
  phoneBox = { left: 888, top: 52, width: IPHONE.width, height: IPHONE.height },
}) {
  const bgPath = path.join(imagesDir, 'light-bg.png');
  const outPath = path.join(imagesDir, outputName);

  if (!(await fileExists(desktopCapture))) {
    console.log(`Skip ${outputName}: missing ${desktopCapture}`);
    return false;
  }

  const bg = await sharp(bgPath)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const desktop = await framePanel(desktopCapture, desktopBox.width, desktopBox.height);

  const layers = [{ input: desktop, left: desktopBox.left, top: desktopBox.top }];

  if (await fileExists(mobileCapture)) {
    const phone = await frameIPhone(mobileCapture);
    layers.push({ input: phone, left: phoneBox.left, top: phoneBox.top });
  }

  await sharp(bg).composite(layers).png().toFile(outPath);
  console.log('Built', outPath);
  return true;
}

async function main() {
  await buildComposite({
    desktopCapture: path.join(capturesDir, 'business-desktop.png'),
    mobileCapture: path.join(capturesDir, 'business-mobile.png'),
    outputName: 'business-account-preview.png',
  });

  await buildComposite({
    desktopCapture: path.join(capturesDir, 'notifications-desktop.png'),
    mobileCapture: path.join(capturesDir, 'notifications-mobile.png'),
    outputName: 'smart-notifications-preview.png',
    desktopBox: { left: 40, top: 38, width: 840, height: 495 },
    phoneBox: { left: 882, top: 48, width: IPHONE.width, height: IPHONE.height },
  });

  await buildComposite({
    desktopCapture: path.join(capturesDir, 'ai-desktop.png'),
    mobileCapture: path.join(capturesDir, 'ai-mobile.png'),
    outputName: 'ai-receptionist-preview.png',
    desktopBox: { left: 44, top: 40, width: 830, height: 490 },
    phoneBox: { left: 884, top: 50, width: IPHONE.width, height: IPHONE.height },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
