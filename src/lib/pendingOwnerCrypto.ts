import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGO = "aes-256-gcm";

/**
 * Key for encrypting the chosen password between "onboarding done" and "Stripe paid".
 * Default: derived from SUPABASE_SERVICE_ROLE_KEY (no extra env — you already have this for server APIs).
 * Optional override: set PENDING_OWNER_SECRET if you want a key that survives service-role rotation.
 */
function getKey(): Buffer {
  const override = process.env.PENDING_OWNER_SECRET?.trim();
  if (override && override.length >= 16) {
    return scryptSync(override, "pending-owner-salt-v1", 32);
  }

  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (sr && sr.length >= 20) {
    return createHash("sha256").update(`orbyt-pending-owner-v1:${sr}`).digest();
  }

  throw new Error(
    "Set SUPABASE_SERVICE_ROLE_KEY in .env (required for deferred signup). " +
      "Optionally set PENDING_OWNER_SECRET (16+ chars) to override the encryption key."
  );
}

/** Encrypt password for storage in pending_owner_onboarding (server-only; decrypted in webhook). */
export function encryptPendingOwnerPassword(plain: string): string {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptPendingOwnerPassword(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  const [ivB, tagB, dataB] = parts;
  const iv = Buffer.from(ivB, "base64url");
  const tag = Buffer.from(tagB, "base64url");
  const data = Buffer.from(dataB, "base64url");
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
