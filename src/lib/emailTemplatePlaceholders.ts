/**
 * Pure placeholder substitution for email HTML/text — safe to import from Client Components.
 * (Do not import server-only modules here.)
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replace `{{var_name}}` in template with values. Values are HTML-escaped by default.
 * Use `htmlUnescapedKeys` for placeholders that inject HTML fragments (e.g. `email_body`).
 */
export function substituteEmailPlaceholders(
  template: string,
  vars: Record<string, string | number | undefined | null>,
  options?: { escapeValues?: boolean; htmlUnescapedKeys?: string[] },
): string {
  const escape = options?.escapeValues !== false;
  const rawHtmlKeys = new Set(options?.htmlUnescapedKeys ?? []);
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const val = v == null ? "" : String(v);
    const shouldEscape = escape && !rawHtmlKeys.has(k);
    const safe = shouldEscape ? escapeHtml(val) : val;
    const re = new RegExp(`\\{\\{\\s*${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    out = out.replace(re, safe);
  }
  return out;
}

/** Plain text with newlines → minimal HTML for Resend. */
export function plainTextToEmailHtml(plain: string): string {
  const escaped = escapeHtml(plain);
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">${escaped.replace(/\r?\n/g, "<br/>")}</body></html>`;
}

/**
 * Email clients need absolute image URLs. Converts `src="/images/..."` to `src="https://host/images/..."`.
 */
export function resolvePublicAssetUrls(html: string, baseUrl: string): string {
  const b = baseUrl.replace(/\/$/, "");
  if (!b) return html;
  return html
    .replace(/src="\/(images\/[^"]+)"/g, `src="${b}/$1"`)
    .replace(/src='\/(images\/[^']+)'/g, `src='${b}/$1'`);
}
