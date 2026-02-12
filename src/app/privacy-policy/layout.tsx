// Force dynamic: page uses window.scrollTo() which requires client-side rendering.
export const dynamic = 'force-dynamic';

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
