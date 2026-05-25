// Force dynamic: provider pages use auth, useSearchParams (e.g. invite).
export const dynamic = 'force-dynamic';

import ProviderLayoutClient from './ProviderLayoutClient';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProviderLayoutClient>{children}</ProviderLayoutClient>;
}
