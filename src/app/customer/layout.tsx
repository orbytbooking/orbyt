// Force dynamic rendering so /customer routes are not prerendered at build time.
// Pages use useSearchParams, useCustomerBookings, useCustomerAccount; prerender can fail without request context.
export const dynamic = 'force-dynamic';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
