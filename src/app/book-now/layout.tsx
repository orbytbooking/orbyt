// Force dynamic: page uses useSearchParams, useWebsiteConfig, useCustomerAccount.
export const dynamic = 'force-dynamic';

export default function BookNowLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
