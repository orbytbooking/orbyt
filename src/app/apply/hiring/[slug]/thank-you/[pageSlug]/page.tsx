import HiringPublicThankYouClient from './HiringPublicThankYouClient';

export default async function HiringPublicThankYouStandalonePage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const formSlug = slug?.trim() ?? '';
  const tySlug = pageSlug?.trim() ?? '';
  if (!formSlug || !tySlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Invalid link.
      </div>
    );
  }

  return <HiringPublicThankYouClient formSlug={formSlug} pageSlug={tySlug} />;
}
