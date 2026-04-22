import HiringPublicFormClient from './HiringPublicFormClient';

export default async function HiringPublicApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trimmed = slug?.trim();
  if (!trimmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Invalid link.
      </div>
    );
  }

  return <HiringPublicFormClient slug={trimmed} />;
}
