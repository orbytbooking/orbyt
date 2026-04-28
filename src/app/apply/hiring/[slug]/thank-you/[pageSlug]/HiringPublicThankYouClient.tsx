'use client';

import { useEffect, useState } from 'react';
import {
  type HiringFormPreviewPayload,
} from '@/app/admin/hiring/forms/builder/page';
import {
  findDedicatedThankYouPageByUrlSlug,
  normalizeHiringFormSubmissionSettings,
} from '@/app/admin/hiring/forms/builder/hiring-form-submission-settings';
import { cn } from '@/lib/utils';

export default function HiringPublicThankYouClient({
  formSlug,
  pageSlug,
}: {
  formSlug: string;
  pageSlug: string;
}) {
  const [title, setTitle] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/hiring-forms/${encodeURIComponent(formSlug)}`);
        const json = (await res.json()) as {
          error?: string;
          name?: string;
          definition?: HiringFormPreviewPayload;
        };
        if (!res.ok) throw new Error(json.error || 'Page not available');
        const def = json.definition;
        if (!def || typeof def !== 'object') throw new Error('Invalid form data');
        const settings = normalizeHiringFormSubmissionSettings(def.submissionSettings);
        const page = findDedicatedThankYouPageByUrlSlug(
          settings.dedicatedThankYouPages,
          decodeURIComponent(pageSlug)
        );
        if (!page) {
          throw new Error('Thank you page not found for this link.');
        }
        const body = (page.bodyHtml ?? '').trim();
        if (!cancelled) {
          setTitle(page.name.trim() || (typeof json.name === 'string' ? json.name : 'Thank you'));
          setHtml(body.length > 0 && body !== '<p></p>' ? body : '<p>Thank you.</p>');
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setHtml(null);
          setTitle(null);
          setError(e instanceof Error ? e.message : 'Could not load this page');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formSlug, pageSlug]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Check the form is published and the thank you page slug matches your link.
        </p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F4F5F9] px-4 py-12">
      <div
        className={cn(
          'mx-auto max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm',
          'sm:p-10'
        )}
      >
        {title ? <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1> : null}
        <div
          className={cn('prose prose-slate mt-4 max-w-none', title ? '' : 'mt-0')}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-8 flex flex-col items-center border-t border-slate-200/60 pt-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public brand asset */}
            <img
              src="/images/orbit.png"
              alt=""
              className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
              width={44}
              height={44}
            />
            <div className="min-w-0 text-left leading-none">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">
                Powered by
              </p>
              <p className="mt-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                Orbyt
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
