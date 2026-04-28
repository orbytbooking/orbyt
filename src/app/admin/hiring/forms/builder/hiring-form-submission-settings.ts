export type HiringThankYouMode = 'custom' | 'external' | 'thank_you_page';

/** One row in Settings → Thank you page (list + editor). */
export type HiringDedicatedThankYouPage = {
  id: string;
  name: string;
  slug: string;
  bodyHtml: string;
  trackingCode: string;
};

/** @deprecated Use `dedicatedThankYouPages`; kept for migration only. */
export type HiringDedicatedThankYouPageLegacy = Omit<HiringDedicatedThankYouPage, 'id'> & { id?: string };

/** Stored inside `hiring_forms.definition` (alongside `HiringFormPreviewPayload`). */
export type HiringFormSubmissionSettings = {
  /** Identifier for “which funnel” (CRM / pipeline grouping). */
  funnelKey?: string;
  /** Snippet or markup injected on the public form page (admin-controlled). */
  formPageTrackingCode?: string;
  thankYouMode?: HiringThankYouMode;
  thankYouCustomHtml?: string;
  thankYouExternalUrl?: string;
  /** Fired after successful submit (e.g. conversion pixel). */
  submitTrackingCode?: string;
  /** Which thank-you page HTML to use when `thankYouMode` is `thank_you_page`. */
  defaultThankYouPageId?: string;
  /** Saved thank-you pages (shown as a table in the builder). */
  dedicatedThankYouPages?: HiringDedicatedThankYouPage[];
  /** @deprecated Migrated into `dedicatedThankYouPages[0]`. */
  dedicatedThankYouPage?: HiringDedicatedThankYouPageLegacy;
};

export const DEFAULT_HIRING_FORM_SUBMISSION_SETTINGS: HiringFormSubmissionSettings = {
  funnelKey: 'hiring_default',
  formPageTrackingCode: '',
  thankYouMode: 'custom',
  thankYouCustomHtml: '<p>Thank you! Your form has been submitted.</p>',
  thankYouExternalUrl: '',
  submitTrackingCode: '',
};

export function newHiringThankYouPageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ty-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyHiringThankYouPage(): HiringDedicatedThankYouPage {
  return {
    id: newHiringThankYouPageId(),
    name: '',
    slug: 'page-url',
    bodyHtml: '',
    trackingCode: '',
  };
}

function normalizeOneDedicatedThankYouPage(raw: unknown): HiringDedicatedThankYouPage | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id =
    typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newHiringThankYouPageId();
  return {
    id,
    name: typeof o.name === 'string' ? o.name : '',
    slug: typeof o.slug === 'string' && o.slug.trim() ? o.slug.trim() : 'page-url',
    bodyHtml: typeof o.bodyHtml === 'string' ? o.bodyHtml : '',
    trackingCode: typeof o.trackingCode === 'string' ? o.trackingCode : '',
  };
}

function normalizeDedicatedThankYouPagesList(
  raw: HiringFormSubmissionSettings | null | undefined
): { pages: HiringDedicatedThankYouPage[]; defaultThankYouPageId?: string } {
  const pages: HiringDedicatedThankYouPage[] = [];
  if (Array.isArray(raw?.dedicatedThankYouPages)) {
    for (const item of raw!.dedicatedThankYouPages!) {
      const p = normalizeOneDedicatedThankYouPage(item);
      if (p) pages.push(p);
    }
  }
  if (pages.length === 0 && raw?.dedicatedThankYouPage != null && typeof raw.dedicatedThankYouPage === 'object') {
    const legacy = normalizeOneDedicatedThankYouPage({
      ...raw.dedicatedThankYouPage,
      id:
        typeof (raw.dedicatedThankYouPage as { id?: string }).id === 'string'
          ? (raw.dedicatedThankYouPage as { id?: string }).id
          : newHiringThankYouPageId(),
    });
    if (legacy) pages.push(legacy);
  }
  let defaultThankYouPageId =
    typeof raw?.defaultThankYouPageId === 'string' && raw.defaultThankYouPageId.trim()
      ? raw.defaultThankYouPageId.trim()
      : undefined;
  if (pages.length > 0) {
    if (!defaultThankYouPageId || !pages.some((p) => p.id === defaultThankYouPageId)) {
      defaultThankYouPageId = pages[0].id;
    }
  } else {
    defaultThankYouPageId = undefined;
  }
  return { pages, defaultThankYouPageId };
}

export function normalizeHiringFormSubmissionSettings(
  raw: HiringFormSubmissionSettings | null | undefined
): HiringFormSubmissionSettings {
  const { pages, defaultThankYouPageId } = normalizeDedicatedThankYouPagesList(raw ?? undefined);
  return {
    ...DEFAULT_HIRING_FORM_SUBMISSION_SETTINGS,
    ...raw,
    thankYouMode: raw?.thankYouMode ?? DEFAULT_HIRING_FORM_SUBMISSION_SETTINGS.thankYouMode,
    dedicatedThankYouPages: pages,
    defaultThankYouPageId,
    dedicatedThankYouPage: undefined,
  };
}

/** Resolved page for public “thank you page” mode. */
export function resolveDefaultThankYouPage(
  settings: HiringFormSubmissionSettings | null | undefined
): HiringDedicatedThankYouPage | undefined {
  if (!settings?.dedicatedThankYouPages?.length) return undefined;
  const id = settings.defaultThankYouPageId;
  if (id) {
    const hit = settings.dedicatedThankYouPages.find((p) => p.id === id);
    if (hit) return hit;
  }
  return settings.dedicatedThankYouPages[0];
}

/** Match `/apply/hiring/{form}/thank-you/{pageSlug}` to a saved page (by its URL slug field). */
export function findDedicatedThankYouPageByUrlSlug(
  pages: HiringDedicatedThankYouPage[] | null | undefined,
  urlSlug: string
): HiringDedicatedThankYouPage | undefined {
  if (!pages?.length) return undefined;
  const t = urlSlug.trim().toLowerCase();
  return pages.find((p) => p.slug.trim().toLowerCase() === t);
}
