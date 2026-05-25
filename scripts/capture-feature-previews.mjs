/**
 * Capture real Orbyt UI + build marketing composites (cosmic bg + desktop + phone).
 * Usage: node scripts/capture-feature-previews.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const imagesDir = path.join(root, 'public', 'images');
const capturesDir = path.join(imagesDir, '_captures');
const baseUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const DESKTOP = { width: 1400, height: 900 };
/** iPhone 14 Pro logical viewport — triggers real mobile breakpoints */
const MOBILE = { width: 393, height: 852 };
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Full-width admin main on narrow viewports (sidebar hidden) */
const MOBILE_ADMIN_CSS = `
  aside.fixed.left-0.z-40 { display: none !important; }
  div.ml-64, div.ml-20 { margin-left: 0 !important; max-width: 100% !important; }
  header.sticky .px-6 { padding-left: 1rem !important; padding-right: 1rem !important; }
  .text-2xl { font-size: 1.25rem !important; }
  .grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .md\\:grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
`;

function loadEnvFiles() {
  for (const file of ['.env', '.env.local']) {
    try {
      const content = readFileSync(path.join(root, file), 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    } catch {
      /* ignore */
    }
  }
}

async function getAdminMagicLink(nextPath) {
  loadEnvFiles();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .not('owner_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!business?.owner_id) return null;

  const { data: userData } = await supabase.auth.admin.getUserById(business.owner_id);
  const email = userData?.user?.email;
  if (!email) return null;

  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  return linkData?.properties?.action_link ?? null;
}

async function loginAsAdmin(page) {
  loadEnvFiles();

  if (page.url().includes('/admin/')) {
    return true;
  }

  const email = process.env.SCREENSHOT_ADMIN_EMAIL;
  const password = process.env.SCREENSHOT_ADMIN_PASSWORD;

  if (email && password) {
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 60000 });
    return true;
  }

  const magicLink = await getAdminMagicLink('/admin/dashboard');
  if (!magicLink) return false;

  await page.goto(magicLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  if (page.url().includes('/auth/callback')) {
    await page.waitForURL(/\/admin\//, { timeout: 90000 }).catch(() => {});
  }

  if (!page.url().includes('/admin/')) {
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle', timeout: 60000 });
  }

  return page.url().includes('/admin/');
}

async function prepareMobileAdmin(page) {
  await page.addStyleTag({ content: MOBILE_ADMIN_CSS });
  await page.waitForTimeout(400);
}

async function prepareMobileBookNow(page) {
  const menuBtn = page.locator('button.md\\:hidden').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    const expanded = await page.getByRole('navigation').count();
    if (expanded > 0) {
      await menuBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function screenshotViewport(page, url, viewport, filePath, beforeShot, { isMobileAdmin = false } = {}) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  if (viewport.width < 500 && isMobileAdmin) {
    await prepareMobileAdmin(page);
  }

  if (beforeShot) await beforeShot(page);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log('Captured', filePath);
}

async function captureBusiness(page) {
  const loggedIn = await loginAsAdmin(page);
  if (!loggedIn) {
    console.log('Skip business captures: not authenticated');
    return;
  }

  await screenshotViewport(
    page,
    `${baseUrl}/admin/dashboard`,
    DESKTOP,
    path.join(capturesDir, 'business-desktop.png')
  );

  await screenshotViewport(
    page,
    `${baseUrl}/admin/dashboard`,
    MOBILE,
    path.join(capturesDir, 'business-mobile.png'),
    undefined,
    { isMobileAdmin: true }
  );
}

async function captureNotifications(page) {
  const loggedIn = await loginAsAdmin(page);
  if (!loggedIn) return;

  const url = `${baseUrl}/admin/settings/notifications`;

  await screenshotViewport(
    page,
    url,
    DESKTOP,
    path.join(capturesDir, 'notifications-desktop.png'),
    async (p) => {
      const tab = p.getByRole('tab', { name: /notification template/i });
      if (await tab.count()) {
        await tab.click({ force: true }).catch(() => {});
        await p.waitForTimeout(1200);
      }
    }
  );

  await screenshotViewport(
    page,
    url,
    MOBILE,
    path.join(capturesDir, 'notifications-mobile.png'),
    async (p) => {
      const tab = p.getByRole('tab', { name: /^general$/i });
      if (await tab.count()) {
        await tab.click({ force: true }).catch(() => {});
        await p.waitForTimeout(800);
      }
    },
    { isMobileAdmin: true }
  );
}

async function captureAiReceptionist(page) {
  const openChat = async (p) => {
    const chatToggle = p.getByRole('button', { name: /open chat|close chat/i });
    if (await chatToggle.count()) {
      await chatToggle.first().click();
      await p.waitForTimeout(900);
    }
  };

  await screenshotViewport(
    page,
    `${baseUrl}/book-now`,
    DESKTOP,
    path.join(capturesDir, 'ai-desktop.png'),
    openChat
  );

  await screenshotViewport(
    page,
    `${baseUrl}/book-now`,
    MOBILE,
    path.join(capturesDir, 'ai-mobile.png'),
    async (p) => {
      await prepareMobileBookNow(p);
      await openChat(p);
    }
  );
}

function runCompositeBuilder() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, 'build-feature-preview-composites.mjs')], {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`composite exit ${code}`))));
  });
}

async function main() {
  await mkdir(capturesDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: IPHONE_UA,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  try {
    await captureBusiness(page);
    await captureNotifications(page);
    await captureAiReceptionist(page);
  } finally {
    await browser.close();
  }

  await runCompositeBuilder();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
