'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  HiringFormPreviewView,
  hiringFormPreviewStorageKey,
  type HiringFormPreviewPayload,
} from '../page';

function FormPreviewPageInner() {
  const searchParams = useSearchParams();
  const { currentBusiness, loading: businessLoading } = useBusiness();
  const [payload, setPayload] = useState<HiringFormPreviewPayload | null | undefined>(undefined);
  const [errorKind, setErrorKind] = useState<
    'none' | 'missing-params' | 'no-data' | 'invalid' | 'business-mismatch'
  >('none');

  const sid = searchParams.get('sid')?.trim() ?? '';
  const bid = searchParams.get('bid')?.trim() ?? '';

  useEffect(() => {
    if (!sid || !bid) {
      setErrorKind('missing-params');
      setPayload(null);
      return;
    }

    if (businessLoading) {
      setPayload(undefined);
      return;
    }

    if (currentBusiness?.id && currentBusiness.id !== bid) {
      setErrorKind('business-mismatch');
      setPayload(null);
      return;
    }

    const storageKey = hiringFormPreviewStorageKey(bid, sid);
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch {
      setErrorKind('no-data');
      setPayload(null);
      return;
    }

    if (!raw) {
      setErrorKind('no-data');
      setPayload(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as HiringFormPreviewPayload;
      if (parsed?.v !== 1 || !Array.isArray(parsed.formFields)) {
        setErrorKind('invalid');
        setPayload(null);
        return;
      }
      if (parsed.businessId !== bid) {
        setErrorKind('invalid');
        setPayload(null);
        return;
      }
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // still show preview
      }
      setErrorKind('none');
      setPayload(parsed);
    } catch {
      setErrorKind('invalid');
      setPayload(null);
    }
  }, [sid, bid, businessLoading, currentBusiness?.id]);

  if (payload === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {businessLoading ? 'Loading preview…' : 'Loading preview…'}
      </div>
    );
  }

  if (!payload) {
    const messages: Record<typeof errorKind, { title: string; detail?: string }> = {
      none: { title: 'Unable to load preview.' },
      'missing-params': {
        title: 'This preview link is incomplete.',
        detail:
          'Use Preview in the form builder (it opens a new tab with a one-time link). Bookmarking this URL will not work.',
      },
      'no-data': {
        title: 'Preview data was not found or was already opened.',
        detail:
          'Open the builder, click Preview again, and use the new tab. Refreshing the preview tab clears the one-time payload.',
      },
      invalid: {
        title: 'Preview data was invalid.',
        detail: 'Return to the form builder and click Preview again.',
      },
      'business-mismatch': {
        title: 'This preview is for a different workspace.',
        detail:
          'Switch to the matching business in the admin bar, or open Preview again while that workspace is active.',
      },
    };
    const m = messages[errorKind];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="max-w-md text-sm font-medium text-foreground">{m.title}</p>
        {m.detail ? <p className="max-w-md text-xs text-muted-foreground">{m.detail}</p> : null}
        <Link href="/admin/hiring/forms/builder" className="text-sm text-primary underline">
          Go to form builder
        </Link>
      </div>
    );
  }

  return <HiringFormPreviewView payload={payload} />;
}

export default function HiringFormPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <FormPreviewPageInner />
    </Suspense>
  );
}
