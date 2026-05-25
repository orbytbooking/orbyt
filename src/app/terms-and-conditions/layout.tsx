// Force dynamic: page uses window.scrollTo() which requires client-side rendering.
export const dynamic = 'force-dynamic';

export default function TermsAndConditionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
