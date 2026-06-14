import { createClient } from '@supabase/supabase-js';

export type ParsedGiftCardImage = {
  mime: string;
  buffer: Buffer;
  extension: string;
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const MAX_BYTES = 2 * 1024 * 1024;
const BUCKET = 'website-assets';

export function parseGiftCardDataUrl(dataUrl: string): ParsedGiftCardImage | null {
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;

  const extension = MIME_TO_EXT[mime] ?? 'jpg';
  return { mime, buffer, extension };
}

/** Upload gift card art to public storage so email clients can render it inline (not as attachment). */
export async function uploadGiftCardEmailImage(
  businessId: string,
  dataUrl: string,
): Promise<string | null> {
  const parsed = parseGiftCardDataUrl(dataUrl);
  if (!parsed) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error('Gift card image upload: missing Supabase env');
    return null;
  }

  const path = `gift-cards/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${parsed.extension}`;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase.storage.from(BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.mime,
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    console.error('Gift card image upload failed:', error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
}

export function isPublicGiftCardImageUrl(url: string | null | undefined): boolean {
  const value = (url ?? '').trim();
  return /^https?:\/\//i.test(value);
}
