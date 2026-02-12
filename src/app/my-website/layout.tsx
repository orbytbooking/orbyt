// Force dynamic: page uses useSearchParams, useWebsiteConfig.
export const dynamic = 'force-dynamic';

export default function MyWebsiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
