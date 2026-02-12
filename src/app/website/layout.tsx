// Force dynamic: website/[businessSlug] uses useSearchParams, useWebsiteConfig.
export const dynamic = 'force-dynamic';

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
