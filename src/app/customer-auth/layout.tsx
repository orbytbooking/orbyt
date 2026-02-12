// Force dynamic rendering so this route is not prerendered at build time.
// The page uses useSearchParams, useWebsiteConfig, and useBusiness; prerender can fail without a request context.
export const dynamic = 'force-dynamic';

export default function CustomerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
