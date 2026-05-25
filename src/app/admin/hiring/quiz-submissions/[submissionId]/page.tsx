import { Suspense } from 'react';
import HiringQuizSummaryPageClient from '@/components/admin/hiring/HiringQuizSummaryPageClient';

export default async function HiringQuizSubmissionSummaryPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const id = submissionId?.trim() ?? '';

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-muted/40 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <HiringQuizSummaryPageClient submissionId={id} />
    </Suspense>
  );
}
