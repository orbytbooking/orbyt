// Force dynamic: auth pages use useSearchParams (e.g. confirm).
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
