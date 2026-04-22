'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HiringFormPreviewView,
  type HiringFormPreviewPayload,
} from '@/app/admin/hiring/forms/builder/page';

export default function HiringPublicFormClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const linkedProspectId = searchParams.get('prospectId')?.trim() || undefined;
  const [payload, setPayload] = useState<HiringFormPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/hiring-forms/${encodeURIComponent(slug)}`);
        const json = (await res.json()) as {
          error?: string;
          businessId?: string;
          name?: string;
          definition?: HiringFormPreviewPayload;
        };
        if (!res.ok) {
          throw new Error(json.error || 'Form not available');
        }
        const def = json.definition;
        if (!def || typeof def !== 'object') {
          throw new Error('Invalid form data');
        }
        const merged: HiringFormPreviewPayload = {
          ...def,
          v: 1,
          businessId: typeof json.businessId === 'string' ? json.businessId : def.businessId,
          formName: typeof json.name === 'string' ? json.name : def.formName,
        };
        if (!cancelled) {
          setPayload(merged);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : 'Could not load form');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">This link may be wrong or the form is not published.</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading form…
      </div>
    );
  }

  return (
    <HiringFormPreviewView
      payload={payload}
      publicSubmitSlug={slug}
      appearance="live"
      linkedProspectId={linkedProspectId}
    />
  );
}
