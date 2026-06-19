/**
 * Phase 2.5 — daily-discounts legacy route redirect smoke test.
 * Run: node scripts/test-daily-discounts-redirect.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function deriveProjectRef(url) {
  try {
    return new URL(url).hostname.split(".")[0]?.trim() || null;
  } catch {
    return null;
  }
}

const projectRef = deriveProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
const TENANT_AUTH_STORAGE_KEY = projectRef
  ? `sb-${projectRef}-auth-token-owner`
  : "sb-orbyt-tenant-auth";

const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
};

async function getAdminSessionCookies() {
  const businessId = process.env.TEST_BUSINESS_ID?.trim();
  let ownerId = null;
  if (businessId) {
    const { data } = await supabaseAdmin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
    ownerId = data?.owner_id ?? null;
  } else {
    const { data } = await supabaseAdmin.from("businesses").select("owner_id").ilike("name", "%DEMO%").limit(1).maybeSingle();
    ownerId = data?.owner_id ?? null;
  }
  if (!ownerId) fail("Could not resolve business owner for admin auth");

  const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(ownerId);
  const email = ownerUser?.user?.email;
  if (!email) fail("Owner email not found");

  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const password = process.env.TEST_ADMIN_PASSWORD?.trim();

  const cookieJar = new Map();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) cookieJar.set(name, value);
        },
      },
      cookieOptions: {
        name: TENANT_AUTH_STORAGE_KEY,
        path: "/",
        sameSite: "lax",
      },
    },
  );

  if (password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail(`Admin sign-in failed: ${error.message}`);
  } else {
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      fail(`Magic link failed: ${linkErr?.message || "no otp"}`);
    }
    const { error: otpErr } = await supabase.auth.verifyOtp({
      type: "email",
      email,
      token: linkData.properties.email_otp,
    });
    if (otpErr) fail(`OTP verify failed: ${otpErr.message}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) fail("Admin session not established");

  const cookieHeader = [...cookieJar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
  return { cookieHeader, email };
}

async function fetchNoRedirect(path, cookieHeader) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
  return {
    status: res.status,
    location: res.headers.get("location"),
    body: res.status === 200 ? await res.text() : "",
  };
}

async function main() {
  console.log("\nPhase 2.5 — daily-discounts redirect test\n");

  const unauth = await fetchNoRedirect("/admin/marketing/daily-discounts");
  if (unauth.status !== 307 || !unauth.location?.includes("/auth/login")) {
    fail(`Unauthenticated admin route should redirect to login (got ${unauth.status} ${unauth.location})`);
  }
  pass("Unauthenticated /admin/marketing/daily-discounts → /auth/login");

  const { cookieHeader, email } = await getAdminSessionCookies();
  console.log(`Admin session: ${email}\n`);

  const legacy = await fetchNoRedirect("/admin/marketing/daily-discounts", cookieHeader);
  const httpRedirect =
    (legacy.status === 307 || legacy.status === 308 || legacy.status === 302) &&
    legacy.location?.includes("/admin/marketing") &&
    legacy.location?.includes("tab=daily-discounts");
  const rscRedirect =
    legacy.status === 200 &&
    legacy.body.includes("NEXT_REDIRECT") &&
    legacy.body.includes("/admin/marketing?tab=daily-discounts") &&
    !legacy.body.includes("Save Daily Discount") &&
    !legacy.body.includes("Daily discount saved");

  if (!httpRedirect && !rscRedirect) {
    fail(`Legacy route should redirect to marketing tab (got ${legacy.status} ${legacy.location})`);
  }
  pass(
    httpRedirect
      ? `Authenticated legacy route → ${legacy.location}`
      : "Authenticated legacy route issues NEXT_REDIRECT to marketing daily-discounts tab",
  );

  const target = await fetchNoRedirect("/admin/marketing?tab=daily-discounts", cookieHeader);
  if (target.status !== 200) {
    fail(`Target marketing tab should return 200 (got ${target.status})`);
  }
  if (target.body.includes("Save Daily Discount") || target.body.includes("Daily discount saved")) {
    fail("Target page still shows fake stub markup");
  }
  pass("Target /admin/marketing?tab=daily-discounts loads without fake stub page");

  console.log("\nAll Phase 2.5 checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
